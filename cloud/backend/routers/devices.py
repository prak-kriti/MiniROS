from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime

from database import get_db
from routers.auth import get_current_user

router = APIRouter(prefix="/devices", tags=["devices"])


# ── Request schemas ───────────────────────────────────────────────────────────

class DeviceCreate(BaseModel):
    device_name: str


class DeviceDataCreate(BaseModel):
    data: dict


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fmt_device(d):
    return {
        "id": str(d["_id"]),
        "device_name": d["device_name"],
        "user_id": d["user_id"],
        "created_at": d["created_at"],
    }


# ── Device CRUD ───────────────────────────────────────────────────────────────

@router.get("")
async def list_devices(db=Depends(get_db), user=Depends(get_current_user)):
    cursor = db.devices.find({"user_id": user["id"]}).sort("created_at", -1)
    return [_fmt_device(d) async for d in cursor]


@router.post("", status_code=201)
async def add_device(req: DeviceCreate, db=Depends(get_db), user=Depends(get_current_user)):
    doc = {
        "device_name": req.device_name,
        "user_id": user["id"],
        "created_at": datetime.utcnow(),
    }
    result = await db.devices.insert_one(doc)
    return {
        "id": str(result.inserted_id),
        "device_name": req.device_name,
        "user_id": user["id"],
        "created_at": doc["created_at"],
    }


@router.delete("/{device_id}")
async def delete_device(device_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    result = await db.devices.delete_one({"_id": ObjectId(device_id), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(404, "Device not found")
    await db.device_data.delete_many({"device_id": device_id})
    return {"message": "Device deleted"}


# ── Device data ───────────────────────────────────────────────────────────────

@router.post("/{device_id}/data", status_code=201)
async def push_device_data(device_id: str, req: DeviceDataCreate, db=Depends(get_db)):
    """Robots POST telemetry here. No auth required so robots can push without tokens."""
    if not await db.devices.find_one({"_id": ObjectId(device_id)}):
        raise HTTPException(404, "Device not found")
    result = await db.device_data.insert_one({
        "device_id": device_id,
        "payload": req.data,
        "timestamp": datetime.utcnow(),
    })
    return {"message": "Data stored", "id": str(result.inserted_id)}


@router.get("/{device_id}/data")
async def get_device_data(
    device_id: str,
    limit: int = 100,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    if not await db.devices.find_one({"_id": ObjectId(device_id), "user_id": user["id"]}):
        raise HTTPException(404, "Device not found")
    cursor = db.device_data.find({"device_id": device_id}).sort("timestamp", -1).limit(limit)
    return [
        {
            "id": str(r["_id"]),
            "device_id": r["device_id"],
            "data": r["payload"],
            "timestamp": r["timestamp"],
        }
        async for r in cursor
    ]
