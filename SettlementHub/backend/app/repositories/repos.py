from sqlalchemy.orm import Session
from typing import List, Optional
from app.repositories.base import BaseRepository
from app.models.models import Person, Group, GroupMember, Expense, ExpenseSplit, Transaction, Settlement, ExpenseCategory, ExpenseTag
from sqlalchemy import or_, and_

class PeopleRepository(BaseRepository[Person]):
    def __init__(self):
        super().__init__(Person)

    def get_by_user(self, db: Session, user_id: int) -> List[Person]:
        return db.query(Person).filter(
            Person.user_id == user_id,
            Person.is_deleted == False
        ).all()

class GroupRepository(BaseRepository[Group]):
    def __init__(self):
        super().__init__(Group)

    def get_by_user(self, db: Session, user_id: int) -> List[Group]:
        return db.query(Group).filter(
            Group.created_by_user_id == user_id,
            Group.is_deleted == False
        ).all()

class ExpenseRepository(BaseRepository[Expense]):
    def __init__(self):
        super().__init__(Expense)

    def get_by_user(self, db: Session, user_id: int) -> List[Expense]:
        return db.query(Expense).filter(
            Expense.user_id == user_id,
            Expense.is_deleted == False
        ).all()

    def get_by_group(self, db: Session, group_id: int) -> List[Expense]:
        return db.query(Expense).filter(
            Expense.group_id == group_id,
            Expense.is_deleted == False
        ).all()

class TransactionRepository(BaseRepository[Transaction]):
    def __init__(self):
        super().__init__(Transaction)

    def get_by_user(self, db: Session, user_id: int) -> List[Transaction]:
        return db.query(Transaction).filter(
            Transaction.created_by_user_id == user_id,
            Transaction.is_deleted == False
        ).all()

    def get_pair_transactions(self, db: Session, user_id: int, person_a_id: int, person_b_id: int) -> List[Transaction]:
        return db.query(Transaction).filter(
            Transaction.created_by_user_id == user_id,
            Transaction.is_deleted == False,
            or_(
                and_(Transaction.from_person_id == person_a_id, Transaction.to_person_id == person_b_id),
                and_(Transaction.from_person_id == person_b_id, Transaction.to_person_id == person_a_id)
            )
        ).order_by(Transaction.date.asc()).all()

class SettlementRepository(BaseRepository[Settlement]):
    def __init__(self):
        super().__init__(Settlement)

    def get_by_user(self, db: Session, user_id: int) -> List[Settlement]:
        return db.query(Settlement).join(Transaction, Settlement.transaction_id == Transaction.id).filter(
            Transaction.created_by_user_id == user_id,
            Settlement.is_deleted == False
        ).all()

people_repo = PeopleRepository()
group_repo = GroupRepository()
expense_repo = ExpenseRepository()
transaction_repo = TransactionRepository()
settlement_repo = SettlementRepository()
