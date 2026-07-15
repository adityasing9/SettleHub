import json
import math
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.models import Transaction, TransactionVersion, FraudLog, Person
from app.services.settlement_engine import calculate_net_balances, get_exchange_rate

def run_fraud_checks(db: Session, tx: Transaction) -> dict:
    """
    Evaluates a transaction for potential fraud or error indicators.
    Returns a dict with 'score', 'reasons', and saves a FraudLog if score > 0.
    """
    reasons = []
    score = 0.0

    # 1. Check for Duplicate Transactions (same from/to, amount, within 1 hour)
    one_hour_ago = tx.date - timedelta(hours=1)
    one_hour_later = tx.date + timedelta(hours=1)
    dup = db.query(Transaction).filter(
        Transaction.id != tx.id,
        Transaction.from_person_id == tx.from_person_id,
        Transaction.to_person_id == tx.to_person_id,
        Transaction.amount == tx.amount,
        Transaction.currency == tx.currency,
        Transaction.is_deleted == False,
        Transaction.date >= one_hour_ago,
        Transaction.date <= one_hour_later
    ).first()
    if dup:
        reasons.append("Potential duplicate transaction detected within a 1-hour window.")
        score += 25.0

    # 2. Check for Rapid Repeated Transfers (same people, >= 3 transactions in 5 minutes)
    five_mins_ago = tx.date - timedelta(minutes=5)
    recent_txs_count = db.query(Transaction).filter(
        Transaction.id != tx.id,
        Transaction.from_person_id == tx.from_person_id,
        Transaction.to_person_id == tx.to_person_id,
        Transaction.is_deleted == False,
        Transaction.date >= five_mins_ago
    ).count()
    if recent_txs_count >= 2:
        reasons.append(f"Rapid repeated transfers: {recent_txs_count + 1} transactions recorded in under 5 minutes.")
        score += 20.0

    # 3. Check for Abnormal Payment Amounts (> 3x standard deviation of user's past transactions)
    past_txs = db.query(Transaction).filter(
        Transaction.created_by_user_id == tx.created_by_user_id,
        Transaction.id != tx.id,
        Transaction.is_deleted == False
    ).order_by(Transaction.date.desc()).limit(30).all()
    
    if len(past_txs) >= 5:
        amounts = [t.amount for t in past_txs]
        mean = sum(amounts) / len(amounts)
        variance = sum((x - mean) ** 2 for x in amounts) / len(amounts)
        std_dev = math.sqrt(variance)
        
        if std_dev > 0 and abs(tx.amount - mean) > 3 * std_dev:
            reasons.append(f"Abnormal amount: ₹{tx.amount:.2f} is significantly higher than historical mean (₹{mean:.2f}).")
            score += 25.0

    # 4. Check for Fake Settlements
    if tx.transaction_type == "settlement":
        # Calculate net balance prior to this transaction
        balances = calculate_net_balances(db, tx.created_by_user_id)
        # Net balance is in user preference base currency
        # from_person owes to_person. Let's see if from_person balance < 0 (owes money overall)
        # or if they are paying in a direction opposite to their debt
        from_bal = balances.get(tx.from_person_id, 0.0)
        to_bal = balances.get(tx.to_person_id, 0.0)
        
        # If the payer is actually owed money (from_bal > 0) and the receiver owes money (to_bal < 0),
        # then paying them more is a suspicious settlement flow.
        if from_bal > 10.0 and to_bal < -10.0:
            reasons.append("Suspicious settlement: Payer is already a creditor and should be receiving money instead.")
            score += 30.0

    # 5. Check for Suspicious Edits (versions count > 3)
    version_count = db.query(TransactionVersion).filter(
        TransactionVersion.transaction_id == tx.id
    ).count()
    if version_count >= 3:
        reasons.append(f"Suspicious edits: This transaction has been modified {version_count} times.")
        score += 15.0

    # Cap score at 100
    score = min(score, 100.0)

    # Save to database if score > 0
    if score > 0:
        log = FraudLog(
            user_id=tx.created_by_user_id,
            entity_type="transaction",
            entity_id=tx.id,
            fraud_score=score,
            reasons_json=json.dumps(reasons),
            is_dismissed=False
        )
        db.add(log)
        db.commit()

    return {
        "score": score,
        "reasons": reasons
    }
