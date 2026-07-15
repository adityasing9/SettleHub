import json
from typing import Generic, TypeVar, Type, List, Optional, Any
from sqlalchemy.orm import Session
from app.db.session import Base
from app.models.models import AuditLog
from datetime import datetime

ModelType = TypeVar("ModelType", bound=Base)

class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    def get(self, db: Session, id: Any) -> Optional[ModelType]:
        return db.query(self.model).filter(
            self.model.id == id,
            self.model.is_deleted == False
        ).first()

    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        return db.query(self.model).filter(
            self.model.is_deleted == False
        ).offset(skip).limit(limit).all()

    def create(
        self, db: Session, *, obj_in: Any, user_id: Optional[int] = None, ip_address: Optional[str] = None
    ) -> ModelType:
        if hasattr(obj_in, "dict"):
            obj_data = obj_in.dict(exclude_unset=True)
        elif isinstance(obj_in, dict):
            obj_data = obj_in
        else:
            obj_data = {c.name: getattr(obj_in, c.name) for c in obj_in.__table__.columns if hasattr(obj_in, c.name)}

        db_obj = self.model(**obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        self._log_audit(
            db,
            action="CREATE",
            record_id=db_obj.id,
            old_values=None,
            new_values=obj_data,
            user_id=user_id,
            ip_address=ip_address
        )
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: ModelType,
        obj_in: Any,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None
    ) -> ModelType:
        old_data = {c.name: getattr(db_obj, c.name) for c in db_obj.__table__.columns if not c.primary_key}
        
        if hasattr(obj_in, "dict"):
            update_data = obj_in.dict(exclude_unset=True)
        elif isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in

        for field in update_data:
            if hasattr(db_obj, field):
                setattr(db_obj, field, update_data[field])

        db_obj.updated_at = datetime.utcnow()
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        new_data = {k: v for k, v in update_data.items() if k in old_data}

        self._log_audit(
            db,
            action="UPDATE",
            record_id=db_obj.id,
            old_values=old_data,
            new_values=new_data,
            user_id=user_id,
            ip_address=ip_address
        )
        return db_obj

    def remove(
        self, db: Session, *, id: Any, user_id: Optional[int] = None, ip_address: Optional[str] = None
    ) -> Optional[ModelType]:
        db_obj = db.query(self.model).filter(self.model.id == id).first()
        if db_obj:
            old_data = {c.name: getattr(db_obj, c.name) for c in db_obj.__table__.columns if not c.primary_key}
            
            db_obj.is_deleted = True
            db_obj.deleted_at = datetime.utcnow()
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)

            self._log_audit(
                db,
                action="DELETE",
                record_id=db_obj.id,
                old_values=old_data,
                new_values={"is_deleted": True, "deleted_at": db_obj.deleted_at.isoformat()},
                user_id=user_id,
                ip_address=ip_address
            )
        return db_obj

    def _log_audit(
        self,
        db: Session,
        action: str,
        record_id: int,
        old_values: Optional[dict],
        new_values: Optional[dict],
        user_id: Optional[int],
        ip_address: Optional[str]
    ):
        try:
            if self.model.__tablename__ == "audit_logs":
                return
            
            def serialize(val):
                if isinstance(val, datetime):
                    return val.isoformat()
                return val

            old_str = json.dumps({k: serialize(v) for k, v in old_values.items()}, default=str) if old_values else None
            new_str = json.dumps({k: serialize(v) for k, v in new_values.items()}, default=str) if new_values else None

            audit = AuditLog(
                user_id=user_id,
                action=action,
                table_name=self.model.__tablename__,
                record_id=record_id,
                old_values=old_str,
                new_values=new_str,
                ip_address=ip_address
            )
            db.add(audit)
            db.commit()
        except Exception as e:
            db.rollback()
            import logging
            logging.getLogger(__name__).error(f"Error creating audit log: {e}")
