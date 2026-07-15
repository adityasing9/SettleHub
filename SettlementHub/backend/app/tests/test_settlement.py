from app.services.settlement_engine import minimize_payments

def test_minimize_payments_simple():
    balances = {
        1: 500.0,   # Person 1 is owed 500
        2: -300.0,  # Person 2 owes 300
        3: -200.0   # Person 3 owes 200
    }
    people_map = {
        1: "Rahul",
        2: "Aditya",
        3: "Suresh"
    }
    
    payments = minimize_payments(balances, people_map)
    
    assert len(payments) == 2
    
    p1 = next(p for p in payments if p["from_person_name"] == "Aditya")
    assert p1["to_person_name"] == "Rahul"
    assert p1["amount"] == 300.0
    
    p2 = next(p for p in payments if p["from_person_name"] == "Suresh")
    assert p2["to_person_name"] == "Rahul"
    assert p2["amount"] == 200.0

def test_minimize_payments_complex():
    balances = {
        1: 100.0,
        2: -250.0,
        3: 150.0,
        4: 0.0
    }
    people_map = {
        1: "A",
        2: "B",
        3: "C",
        4: "D"
    }
    
    payments = minimize_payments(balances, people_map)
    
    # B owes 250, A is owed 100, C is owed 150.
    # B should pay C 150, B should pay A 100.
    assert len(payments) == 2
    
    p1 = next(p for p in payments if p["to_person_name"] == "A")
    assert p1["from_person_name"] == "B"
    assert p1["amount"] == 100.0
    
    p2 = next(p for p in payments if p["to_person_name"] == "C")
    assert p2["from_person_name"] == "B"
    assert p2["amount"] == 150.0
