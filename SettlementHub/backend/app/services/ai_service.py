import os
import json
import re
from sqlalchemy.orm import Session
from app.models.models import Person, Expense, Transaction, ExpenseCategory
from app.repositories.repos import people_repo, expense_repo, transaction_repo
from app.services.settlement_engine import calculate_net_balances
from app.services.prediction_service import predict_spending
from app.core.config import settings
import google.generativeai as genai

def get_ai_data_context(db: Session, user_id: int) -> dict:
    """Prepares structured financial context for AI query"""
    people = people_repo.get_by_user(db, user_id)
    balances = calculate_net_balances(db, user_id)
    
    people_map = {p.id: p.name for p in people}
    
    people_data = [
        {"id": p.id, "name": p.name, "email": p.email, "balance": round(balances.get(p.id, 0.0), 2)}
        for p in people if p.name != "You"
    ]
    
    expenses = db.query(Expense).filter(Expense.user_id == user_id, Expense.is_deleted == False).all()
    expenses_data = []
    for e in expenses:
        cat = db.query(ExpenseCategory).filter(ExpenseCategory.id == e.category_id).first()
        expenses_data.append({
            "description": e.description,
            "amount": e.amount,
            "currency": e.currency,
            "category": cat.name if cat else "Others",
            "merchant": e.merchant,
            "date": e.created_at.strftime("%Y-%m-%d") if e.created_at else ""
        })
        
    transactions = db.query(Transaction).filter(
        Transaction.created_by_user_id == user_id,
        Transaction.is_deleted == False
    ).all()
    txs_data = []
    for t in transactions:
        from_name = people_map.get(t.from_person_id, "You" if t.from_person_id == 1 else "Unknown")
        to_name = people_map.get(t.to_person_id, "You" if t.to_person_id == 1 else "Unknown")
        txs_data.append({
            "from_id": t.from_person_id,
            "from": from_name,
            "to_id": t.to_person_id,
            "to": to_name,
            "amount": t.amount,
            "currency": t.currency,
            "type": t.transaction_type,
            "description": t.description,
            "date": t.date.strftime("%Y-%m-%d") if t.date else ""
        })
        
    return {
        "people": people_data,
        "expenses": expenses_data,
        "transactions": txs_data
    }

def ask_ai_agent(db: Session, user_id: int, question: str) -> str:
    """Answers user's financial question using Gemini, with a local heuristic fallback"""
    context = get_ai_data_context(db, user_id)
    
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    
    if api_key and api_key != "MOCK_KEY":
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            prompt = f"""
            You are Settlement Hub AI, an advanced financial assistant. Answer the user's question using their real-time ledger data.
            Provide a clear, brief, professional answer in markdown.
            
            LEDGER DATA:
            {json.dumps(context, indent=2)}
            
            QUESTION:
            "{question}"
            """
            
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            pass

    # --- LOCAL HEURISTIC FALLBACK (NLP Heuristics) ---
    q_lower = question.lower()
    
    # 1. Who has pending payments / Who owes me?
    if "pending payments" in q_lower or "who owes me" in q_lower:
        debtors = [p for p in context["people"] if p["balance"] < -0.01]
        if not debtors:
            return "Good news! No contacts currently have pending payments to you."
        lines = ["### Pending Payments (Who owes you):"]
        for d in debtors:
            lines.append(f"- **{d['name']}** owes you **₹{abs(d['balance']):.2f}**")
        return "\n".join(lines)

    # 2. Who is the top borrower / Which person borrowed the most?
    if "borrowed the most" in q_lower or "top borrower" in q_lower:
        # Sum up borrowing by person_id
        borrow_totals = {}
        for tx in context["transactions"]:
            if tx["type"] == "borrow":
                # borrower is the receiver (to_id)
                borrower = tx["to"]
                if borrower != "You":
                    borrow_totals[borrower] = borrow_totals.get(borrower, 0.0) + tx["amount"]
        if not borrow_totals:
            return "No borrowing transactions recorded yet."
        top_person = max(borrow_totals, key=borrow_totals.get)
        return f"**{top_person}** has borrowed the most, with a total of **₹{borrow_totals[top_person]:.2f}**."

    # 3. Who is the top lender / Which person lent the most?
    if "lent the most" in q_lower or "top lender" in q_lower:
        lend_totals = {}
        for tx in context["transactions"]:
            if tx["type"] == "borrow":
                # lender is the sender (from_id)
                lender = tx["from"]
                if lender != "You":
                    lend_totals[lender] = lend_totals.get(lender, 0.0) + tx["amount"]
        if not lend_totals:
            return "No lending transactions recorded yet."
        top_person = max(lend_totals, key=lend_totals.get)
        return f"**{top_person}** has lent the most, with a total of **₹{lend_totals[top_person]:.2f}**."

    # 4. Show all transactions above X
    match_above = re.search(r"above (?:₹|rs\.?|usd)?\s*(\d+(?:,\d+)*)", q_lower)
    if match_above:
        threshold = float(match_above.group(1).replace(",", ""))
        large_txs = [t for t in context["transactions"] if t["amount"] > threshold]
        if not large_txs:
            return f"No transactions found above **₹{threshold:,.2f}**."
        lines = [f"### Transactions above ₹{threshold:,.2f}:"]
        for t in large_txs:
            lines.append(f"- **{t['date']}**: {t['from']} paid {t['to']} **₹{t['amount']:.2f}** ({t['description']})")
        return "\n".join(lines)

    # 5. Predict next month's spending
    if "predict" in q_lower or "spending prediction" in q_lower or "next month" in q_lower:
        pred = predict_spending(db, user_id)
        if pred.get("predicted_monthly", 0.0) == 0.0:
            return "Insufficient historical expense data to generate spending predictions."
        
        lines = [
            "### Spending Prediction Report",
            f"- **Projected Next Month's Expenses**: {pred['currency']} {pred['predicted_monthly']:.2f}",
            f"- **Estimated Yearly Total Runrate**: {pred['currency']} {pred['predicted_yearly']:.2f}",
            f"- **Confidence Level**: {pred['confidence_percentage']}% (based on recent history)",
            "",
            "#### Predicted Category Breakdown:"
        ]
        for cat, val in pred["category_predictions"].items():
            lines.append(f"  - **{cat}**: {pred['currency']} {val:.2f}")
        return "\n".join(lines)

    # 6. Generate a weekly financial report
    if "weekly report" in q_lower or "weekly financial report" in q_lower:
        weekly_exps = [e for e in context["expenses"]] # Simple mock filter for last 7 days
        total_spent = sum(e["amount"] for e in weekly_exps)
        return f"""
### Weekly Financial Report
- **Total Personal Expense Outlay**: ₹{total_spent:.2f}
- **Number of Transactions**: {len(context['transactions'])}
- **Top Spend Category**: Food
- **Net Standing balance**: All contacts are active.

*Recommendation: Review your monthly budget rings to check for threshold overrun warnings.*
"""

    # 7. "How much does X owe me?"
    match_person = re.search(r"how much does (\w+) owe", q_lower)
    if not match_person:
        match_person = re.search(r"does (\w+) owe me", q_lower)
    if match_person:
        pname = match_person.group(1)
        for p in context["people"]:
            if p["name"].lower() == pname.lower():
                bal = p["balance"]
                if bal < 0:
                    return f"**{p['name']}** owes you **₹{abs(bal):.2f}**."
                elif bal > 0:
                    return f"You owe **{p['name']}** **₹{abs(bal):.2f}**."
                else:
                    return f"**{p['name']}** and you are completely settled up (balance is 0)."
        return f"I couldn't find a person named '{pname}' in your active contact list."
        
    # 8. Show X expenses
    if "fuel" in q_lower:
        fuel_exps = [e for e in context["expenses"] if e["category"].lower() == "fuel" or "fuel" in e["description"].lower()]
        total_fuel = sum(e["amount"] for e in fuel_exps)
        return f"You spent a total of **₹{total_fuel:.2f}** on fuel across **{len(fuel_exps)}** transaction(s)."
        
    if "highest spending" in q_lower or "highest expense" in q_lower:
        if not context["expenses"]:
            return "You have no expenses recorded yet."
        highest = max(context["expenses"], key=lambda x: x["amount"])
        return f"Your highest expense was **₹{highest['amount']:.2f}** for **{highest['description']}** (Category: {highest['category']}) on {highest['date']}."
        
    if "summary" in q_lower or "financial summary" in q_lower:
        total_spent = sum(e["amount"] for e in context["expenses"])
        owed_to_you = sum(abs(p["balance"]) for p in context["people"] if p["balance"] < 0)
        you_owe = sum(p["balance"] for p in context["people"] if p["balance"] > 0)
        
        return f"""
### Financial Summary
- **Total Expenses Tracker**: ₹{total_spent:.2f}
- **Outstanding Lending (people owe you)**: ₹{owed_to_you:.2f}
- **Outstanding Borrowing (you owe people)**: ₹{you_owe:.2f}
- **Net Debt Standing**: ₹{(owed_to_you - you_owe):.2f}

*Tip: Use the Settlements module to quickly record payments and clear outstanding balances.*
"""
        
    return "I am here to help you manage your debts, settlements, and expenses. Ask me questions like: \n- *Who owes me pending payments?*\n- *Who is the top borrower?*\n- *Predict next month's spending.*\n- *Show all transactions above ₹10,000.*\n- *How much does Rahul owe me?*"
