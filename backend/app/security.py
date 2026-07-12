from datetime import datetime, timedelta, timezone
from cryptography.fernet import Fernet
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .config import settings
from .database import get_db
from .models import User

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(value: str): return pwd.hash(value)
def verify_password(value: str, hashed: str): return pwd.verify(value, hashed)
def create_token(user_id: str):
    return jwt.encode({"sub": user_id, "exp": datetime.now(timezone.utc)+timedelta(days=7)}, settings.jwt_secret, algorithm="HS256")

def current_user(token: str = Depends(oauth), db: Session = Depends(get_db)):
    try: user_id = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])["sub"]
    except (JWTError, KeyError): raise HTTPException(401, "登录已失效")
    user = db.get(User, user_id)
    if not user: raise HTTPException(401, "用户不存在")
    return user

def encrypt_secret(value: str) -> str:
    if not value: return ""
    key = settings.token_encryption_key.encode() if settings.token_encryption_key else Fernet.generate_key()
    return Fernet(key).encrypt(value.encode()).decode()

