from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel

from app.database import get_db
from app.models import User
from app.auth import get_password_hash, verify_password, create_access_token

router = APIRouter(tags=["auth"])

class UserAuthRequest(BaseModel):
    username: str
    password: str

@router.post("/signup")
async def signup(user_data: UserAuthRequest, db: DBSession = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Username already exists"
        )

    hashed_password = get_password_hash(user_data.password)
    new_user = User(username=user_data.username, password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": new_user.username})
    
    return {
        "token": access_token,
        "user": {"id": str(new_user.id), "username": new_user.username}
    }

@router.post("/login")
async def login(user_data: UserAuthRequest, db: DBSession = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    
    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    access_token = create_access_token(data={"sub": user.username})
    
    return {
        "token": access_token,
        "user": {"id": str(user.id), "username": user.username}
    }