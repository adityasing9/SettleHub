from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import Person, Transaction, Expense, ExpenseSplit, ExchangeRate, User, UserPreference
from sqlalchemy import or_, and_

def get_exchange_rate(db: Session, base: str, target: str) -> float:
    if base == target:
        return 1.0
    rate_entry = db.query(ExchangeRate).filter(
        ExchangeRate.base_currency == base,
        ExchangeRate.target_currency == target
    ).first()
    if rate_entry:
        return rate_entry.rate
    rate_entry_inv = db.query(ExchangeRate).filter(
        ExchangeRate.base_currency == target,
        ExchangeRate.target_currency == base
    ).first()
    if rate_entry_inv and rate_entry_inv.rate != 0:
        return 1.0 / rate_entry_inv.rate
    return 1.0

def calculate_net_balances(db: Session, user_id: int, group_id: Optional[int] = None) -> Dict[int, float]:
    """
    Calculate the net balance of each active person for a given user.
    If group_id is provided, filters balances only to activities inside that group.
    
    Positive balance: The person is owed money (creditor)
    Negative balance: The person owes money (debtor)
    """
    people = db.query(Person).filter(
        Person.user_id == user_id,
        Person.is_deleted == False
    ).all()
    
    balances = {p.id: 0.0 for p in people}
    
    pref_currency = "INR"
    prefs = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
    if prefs:
        pref_currency = prefs.default_currency
        
    if not group_id:
        txs = db.query(Transaction).filter(
            Transaction.created_by_user_id == user_id,
            Transaction.is_deleted == False,
            Transaction.status == "completed"
        ).all()
        
        for tx in txs:
            converted = tx.amount * tx.exchange_rate
            if tx.from_person_id in balances:
                balances[tx.from_person_id] += converted
            if tx.to_person_id in balances:
                balances[tx.to_person_id] -= converted
                
    # Add balances from Expense Splits
    exp_query = db.query(Expense).filter(
        Expense.user_id == user_id,
        Expense.is_deleted == False
    )
    if group_id:
        exp_query = exp_query.filter(Expense.group_id == group_id)
        
    expenses = exp_query.all()
    for exp in expenses:
        splits = db.query(ExpenseSplit).filter(
            ExpenseSplit.expense_id == exp.id,
            ExpenseSplit.is_deleted == False
        ).all()
        
        rate = get_exchange_rate(db, exp.currency, pref_currency)
        for split in splits:
            if split.person_id in balances:
                balances[split.person_id] -= split.owe_amount * rate
                
    return balances

def minimize_payments(balances: Dict[int, float], people_map: Dict[int, str], currency: str = "INR") -> List[Dict[str, Any]]:
    """
    Minimizes the number of transactions needed to settle all debts.
    Greedy approach: match largest debtor with largest creditor.
    """
    debtors = []   # (amount, person_id) where amount is positive (debt)
    creditors = []  # (amount, person_id) where amount is positive (credit)
    
    for pid, bal in balances.items():
        if round(bal, 2) < 0:
            debtors.append((abs(bal), pid))
        elif round(bal, 2) > 0:
            creditors.append((bal, pid))
            
    suggested_payments = []
    
    debtors.sort(key=lambda x: x[0], reverse=True)
    creditors.sort(key=lambda x: x[0], reverse=True)
    
    d_idx = 0
    c_idx = 0
    
    # Copy lists to prevent mutating originals
    d_working = [list(d) for d in debtors]
    c_working = [list(c) for c in creditors]
    
    while d_idx < len(d_working) and c_idx < len(c_working):
        d_amt, d_id = d_working[d_idx]
        c_amt, c_id = c_working[c_idx]
        
        settle_amt = min(d_amt, c_amt)
        
        if settle_amt > 0.01:
            suggested_payments.append({
                "from_person_id": d_id,
                "from_person_name": people_map.get(d_id, "Unknown"),
                "to_person_id": c_id,
                "to_person_name": people_map.get(c_id, "Unknown"),
                "amount": round(settle_amt, 2),
                "currency": currency
            })
            
        d_working[d_idx][0] = d_amt - settle_amt
        c_working[c_idx][0] = c_amt - settle_amt
        
        if round(d_working[d_idx][0], 2) <= 0:
            d_idx += 1
        if round(c_working[c_idx][0], 2) <= 0:
            c_idx += 1
            
    return suggested_payments

def find_cycles(graph: Dict[int, Dict[int, float]], people_map: Dict[int, str]) -> List[List[str]]:
    """
    Find simple circular debt cycles in a directed graph.
    Uses DFS path tracking to detect cycles.
    """
    cycles = []
    visited = set()
    path = []
    path_set = set()

    def dfs(node):
        visited.add(node)
        path.append(node)
        path_set.add(node)
        
        for neighbor in graph.get(node, {}):
            if graph[node][neighbor] > 0.01:
                if neighbor in path_set:
                    # Cycle detected
                    idx = path.index(neighbor)
                    cycle_nodes = path[idx:] + [neighbor]
                    cycle_names = [people_map.get(n, "Unknown") for n in cycle_nodes]
                    cycles.append(cycle_names)
                elif neighbor not in visited:
                    dfs(neighbor)
                    
        path_set.remove(node)
        path.pop()

    for start_node in graph:
        if start_node not in visited:
            dfs(start_node)
            
    return cycles

def get_detailed_optimization_flow(db: Session, user_id: int, group_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Builds the original transactions, 2D debt matrix, circular cycle detection,
    and step-by-step explanations of the greedy optimization solver.
    """
    # 1. Fetch people
    people = db.query(Person).filter(
        Person.user_id == user_id,
        Person.is_deleted == False
    ).all()
    
    people_map = {p.id: p.name for p in people}
    
    # 2. Get preferred currency
    pref_currency = "INR"
    prefs = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
    if prefs:
        pref_currency = prefs.default_currency

    # 3. Build direct debts graph: matrix[from_id][to_id] = direct owed amount
    direct_matrix = {p.id: {p2.id: 0.0 for p2 in people} for p in people}

    # Gather from direct transactions
    if not group_id:
        txs = db.query(Transaction).filter(
            Transaction.created_by_user_id == user_id,
            Transaction.is_deleted == False,
            Transaction.status == "completed"
        ).all()
        for tx in txs:
            rate = tx.exchange_rate
            val = tx.amount * rate
            if tx.transaction_type == "borrow":
                # from_person is lender, to_person is borrower -> to_person owes from_person
                direct_matrix[tx.to_person_id][tx.from_person_id] += val
            elif tx.transaction_type == "return":
                # from_person returns to to_person -> reduces what from_person owes to_person
                direct_matrix[tx.from_person_id][tx.to_person_id] -= val

    # Gather from expense splits
    exp_query = db.query(Expense).filter(
        Expense.user_id == user_id,
        Expense.is_deleted == False
    )
    if group_id:
        exp_query = exp_query.filter(Expense.group_id == group_id)
    expenses = exp_query.all()
    
    for exp in expenses:
        splits = db.query(ExpenseSplit).filter(
            ExpenseSplit.expense_id == exp.id,
            ExpenseSplit.is_deleted == False
        ).all()
        
        # Payer is the one where owe_amount is negative
        # Payer id can be deduced or queried. In splits list, payer has owe_amount < 0
        payer_split = next((s for s in splits if s.owe_amount < 0), None)
        if not payer_split:
            continue
        
        payer_id = payer_split.person_id
        rate = get_exchange_rate(db, exp.currency, pref_currency)
        
        for split in splits:
            if split.person_id != payer_id and split.owe_amount > 0:
                direct_matrix[split.person_id][payer_id] += split.owe_amount * rate

    # Clean negative values and simplify pairwise debts (A owes B 10 and B owes A 6 -> A owes B 4)
    for p1 in list(direct_matrix.keys()):
        for p2 in list(direct_matrix[p1].keys()):
            if p1 == p2:
                direct_matrix[p1][p2] = 0.0
                continue
            amt12 = direct_matrix[p1][p2]
            amt21 = direct_matrix[p2][p1]
            if amt12 > amt21:
                direct_matrix[p1][p2] = round(amt12 - amt21, 2)
                direct_matrix[p2][p1] = 0.0
            else:
                direct_matrix[p2][p1] = round(amt21 - amt12, 2)
                direct_matrix[p1][p2] = 0.0

    # 4. Form nodes and edges for original graph
    original_edges = []
    for f_id, targets in direct_matrix.items():
        for t_id, amt in targets.items():
            if amt > 0.01:
                original_edges.append({
                    "from_person_id": f_id,
                    "from_person_name": people_map.get(f_id, "Unknown"),
                    "to_person_id": t_id,
                    "to_person_name": people_map.get(t_id, "Unknown"),
                    "amount": amt,
                    "currency": pref_currency
                })

    # 5. Detect cycles
    cycles = find_cycles(direct_matrix, people_map)

    # 6. Calculate net balances
    net_balances = calculate_net_balances(db, user_id, group_id)
    
    creditors = []
    debtors = []
    for pid, bal in net_balances.items():
        rounded = round(bal, 2)
        if rounded > 0.01:
            creditors.append({
                "person_id": pid,
                "name": people_map.get(pid, "Unknown"),
                "balance": rounded
            })
        elif rounded < -0.01:
            debtors.append({
                "person_id": pid,
                "name": people_map.get(pid, "Unknown"),
                "balance": abs(rounded)
            })

    # 7. Run optimization & capture step-by-step
    steps = []
    optimized_payments = []
    
    # Sort descending
    debtors_sorted = sorted(debtors, key=lambda x: x["balance"], reverse=True)
    creditors_sorted = sorted(creditors, key=lambda x: x["balance"], reverse=True)
    
    d_idx = 0
    c_idx = 0
    
    # Create working copies
    d_list = [dict(d) for d in debtors_sorted]
    c_list = [dict(c) for c in creditors_sorted]
    
    step_num = 1
    while d_idx < len(d_list) and c_idx < len(c_list):
        d = d_list[d_idx]
        c = c_list[c_idx]
        
        settle_amt = min(d["balance"], c["balance"])
        
        if settle_amt > 0.01:
            step_desc = (
                f"Step {step_num}: Settle debtor {d['name']} (owes {d['balance']:.2f}) with "
                f"creditor {c['name']} (owed {c['balance']:.2f}). Transaction amount is min({d['balance']:.2f}, {c['balance']:.2f}) = {settle_amt:.2f}."
            )
            explanation = (
                f"{d['name']} pays {c['name']} {pref_currency} {settle_amt:.2f}. "
                f"This clears {d['name']}'s debt by {settle_amt:.2f} and reduces the outstanding credit for {c['name']}."
            )
            steps.append({
                "step": step_num,
                "description": step_desc,
                "explanation": explanation
            })
            
            optimized_payments.append({
                "from_person_id": d["person_id"],
                "from_person_name": d["name"],
                "to_person_id": c["person_id"],
                "to_person_name": c["name"],
                "amount": round(settle_amt, 2),
                "currency": pref_currency,
                "explanation": explanation
            })
            
            d["balance"] -= settle_amt
            c["balance"] -= settle_amt
            step_num += 1
            
        if round(d["balance"], 2) <= 0:
            d_idx += 1
        if round(c["balance"], 2) <= 0:
            c_idx += 1

    # Form debt matrix grid (table) for representation
    grid_matrix = []
    for p1 in people:
        row = {"person_name": p1.name}
        for p2 in people:
            row[p2.name] = direct_matrix[p1.id][p2.id]
        grid_matrix.append(row)

    return {
        "currency": pref_currency,
        "nodes": [{"id": p.id, "name": p.name} for p in people],
        "original_edges": original_edges,
        "debt_matrix": grid_matrix,
        "cycles": cycles,
        "creditors": creditors_sorted,
        "debtors": debtors_sorted,
        "optimized_payments": optimized_payments,
        "steps": steps
    }
