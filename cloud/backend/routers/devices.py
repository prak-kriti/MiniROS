import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from db_models import Device, DeviceData
from routers.auth import get_current_user

router = APIRouter(prefix="/devices", tags=["devices"])


# ── Request schemas ───────────────────────────────────────────────────────────

class DeviceCreate(BaseModel):
    device_name: str


class DeviceDataCreate(BaseModel):
    data: dict


# ── Device CRUD ───────────────────────────────────────────────────────────────

@router.get("")
def list_devices(db: Session = Depends(get_db), user=Depends(get_current_user)):
    devices = db.query(Device).filter(Device.user_id == user.id).order_by(Device.created_at.desc()).all()
    return [
        {"id": d.id, "device_name": d.device_name, "user_id": d.user_id, "created_at": d.created_at}
        for d in devices
    ]


@router.post("", status_code=201)
def add_device(req: DeviceCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    device = Device(device_name=req.device_name, user_id=user.id)
    db.add(device)
    db.commit()
    db.refresh(device)
    return {"id": device.id, "device_name": device.device_name, "user_id": device.user_id, "created_at": device.created_at}


@router.delete("/{device_id}")
def delete_device(device_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    device = db.query(Device).filter(Device.id == device_id, Device.user_id == user.id).first()
    if not device:
        raise HTTPException(404, "Device not found")
    db.delete(device)
    db.commit()
    return {"message": "Device deleted"}


# ── Device data ───────────────────────────────────────────────────────────────

@router.post("/{device_id}/data", status_code=201)
def push_device_data(device_id: int, req: DeviceDataCreate, db: Session = Depends(get_db)):
    """Robots POST telemetry here. No auth required so robots can push without tokens."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(404, "Device not found")
    entry = DeviceData(device_id=device_id, payload=json.dumps(req.data))
    db.add(entry)
    db.commit()
    return {"message": "Data stored", "id": entry.id}


@router.get("/{device_id}/data")
def get_device_data(
    device_id: int,
    limit: int = 100,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    device = db.query(Device).filter(Device.id == device_id, Device.user_id == user.id).first()
    if not device:
        raise HTTPException(404, "Device not found")
    rows = (
        db.query(DeviceData)
        .filter(DeviceData.device_id == device_id)
        .order_by(DeviceData.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {"id": r.id, "device_id": r.device_id, "data": json.loads(r.payload), "timestamp": r.timestamp}
        for r in rows
    ]
