from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.models import User, Group, GroupMember, Person
from app.schemas.schemas import GroupCreate, GroupUpdate, GroupResponse, GroupDetailResponse, PersonResponse
from app.repositories.repos import group_repo, people_repo

router = APIRouter(prefix="/groups", tags=["Groups"])

def format_group_detail(db: Session, g: Group) -> GroupDetailResponse:
    members = db.query(Person).join(GroupMember, Person.id == GroupMember.person_id).filter(
        GroupMember.group_id == g.id,
        GroupMember.is_deleted == False
    ).all()
    
    return GroupDetailResponse(
        id=g.id,
        name=g.name,
        description=g.description,
        group_type=g.group_type,
        created_by_user_id=g.created_by_user_id,
        created_at=g.created_at,
        members=[PersonResponse.from_orm(m) for m in members]
    )

@router.get("/", response_model=List[GroupDetailResponse])
def read_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    groups = group_repo.get_by_user(db, current_user.id)
    return [format_group_detail(db, g) for g in groups]

@router.post("/", response_model=GroupDetailResponse)
def create_group(
    group_in: GroupCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Create the group
    obj_data = group_in.dict(exclude={"member_ids"})
    obj_data["created_by_user_id"] = current_user.id
    
    db_group = group_repo.create(
        db,
        obj_in=obj_data,
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    
    # Add members
    for pid in group_in.member_ids:
        # Verify person belongs to user
        p = people_repo.get(db, pid)
        if p and p.user_id == current_user.id:
            member = GroupMember(group_id=db_group.id, person_id=pid)
            db.add(member)
            
    db.commit()
    db.refresh(db_group)
    return format_group_detail(db, db_group)

@router.get("/{group_id}", response_model=GroupDetailResponse)
def read_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    g = group_repo.get(db, group_id)
    if not g or g.created_by_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Group not found")
    return format_group_detail(db, g)

@router.put("/{group_id}", response_model=GroupDetailResponse)
def update_group(
    group_id: int,
    group_in: GroupUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    g = group_repo.get(db, group_id)
    if not g or g.created_by_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Update group columns
    update_data = group_in.dict(exclude={"member_ids"}, exclude_unset=True)
    updated_g = group_repo.update(
        db,
        db_obj=g,
        obj_in=update_data,
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    
    # Update members list if provided
    if group_in.member_ids is not None:
        # Mark all existing members as deleted (soft delete)
        db.query(GroupMember).filter(
            GroupMember.group_id == group_id
        ).update({"is_deleted": True})
        
        # Re-add or create new
        for pid in group_in.member_ids:
            p = people_repo.get(db, pid)
            if p and p.user_id == current_user.id:
                # Check if soft deleted exists
                existing = db.query(GroupMember).filter(
                    GroupMember.group_id == group_id,
                    GroupMember.person_id == pid
                ).first()
                if existing:
                    existing.is_deleted = False
                else:
                    db.add(GroupMember(group_id=group_id, person_id=pid))
                    
        db.commit()
        db.refresh(updated_g)
        
    return format_group_detail(db, updated_g)

@router.delete("/{group_id}", response_model=GroupResponse)
def delete_group(
    group_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    g = group_repo.get(db, group_id)
    if not g or g.created_by_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Group not found")
        
    removed_g = group_repo.remove(
        db,
        id=group_id,
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return removed_g
