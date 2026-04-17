from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import JWTError
from bson import ObjectId
from datetime import datetime
import secrets

from database import get_db
from auth_utils import hash_password, verify_password, create_access_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])
_bearer = HTTPBearer()


# ── Request schemas ───────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: str
    username: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/signup")
async def signup(req: SignupRequest, db=Depends(get_db)):
    if await db.users.find_one({"email": req.email}):
        raise HTTPException(400, "Email already registered")
    if await db.users.find_one({"username": req.username}):
        raise HTTPException(400, "Username already taken")

    api_key = "mrk_" + secrets.token_hex(16)   # e.g. mrk_a3f9...
    result = await db.users.insert_one({
        "email": req.email,
        "username": req.username,
        "hashed_password": hash_password(req.password),
        "api_key": api_key,
        "created_at": datetime.utcnow(),
    })
    user_id = str(result.inserted_id)
    token = create_access_token({"sub": user_id, "email": req.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_id, "email": req.email, "username": req.username, "api_key": api_key},
    }


@router.post("/login")
async def login(req: LoginRequest, db=Depends(get_db)):
    doc = await db.users.find_one({"email": req.email})
    if not doc or not verify_password(req.password, doc["hashed_password"]):
        raise HTTPException(401, "Invalid email or password")
    user_id = str(doc["_id"])
    # Backfill api_key for users created before this feature
    if "api_key" not in doc:
        api_key = "mrk_" + secrets.token_hex(16)
        await db.users.update_one({"_id": doc["_id"]}, {"$set": {"api_key": api_key}})
    else:
        api_key = doc["api_key"]
    token = create_access_token({"sub": user_id, "email": doc["email"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_id, "email": doc["email"], "username": doc["username"], "api_key": api_key},
    }


# ── Dependency: current authenticated user ────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db=Depends(get_db),
):
    try:
        payload = decode_token(credentials.credentials)
        user_id = payload["sub"]
        doc = await db.users.find_one({"_id": ObjectId(user_id)})
    except (JWTError, KeyError, Exception):
        raise HTTPException(401, "Invalid or expired token")
    if not doc:
        raise HTTPException(401, "User not found")
    doc["id"] = str(doc.pop("_id"))
    return doc


# ── Profile (returns api_key for dashboard display) ───────────────────────────

@router.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "username": user["username"],
        "api_key": user.get("api_key", ""),
    }
