"""
FastAPI Cloud Backend
- Auth (JWT signup/login) via MongoDB
- Devices CRUD + device data storage via MongoDB
- Telemetry: receives from robot, broadcasts via WebSocket, runs AI analysis
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import json
from datetime import datetime
from collections import deque
from typing import List

from models import TelemetryData, CommandRequest
from ai_module import AIAnalyzer
from database import connect_db, close_db  # noqa: F401
from routers import auth as auth_router
from routers import devices as devices_router

# In-memory state for real-time telemetry
telemetry_history = deque(maxlen=500)
pending_commands: dict = {}
connected_clients: List[WebSocket] = []

ai_analyzer = AIAnalyzer()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    print("Backend ready — MongoDB connected, waiting for robot data...")
    yield
    await close_db()
    print("Backend shutting down")


app = FastAPI(title="Mini ROS Cloud Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(auth_router.router)
app.include_router(devices_router.router)


# ── Telemetry (robot → cloud) ─────────────────────────────────────────────────

@app.post("/telemetry")
async def receive_telemetry(data: TelemetryData):
    record = data.dict()
    record["server_time"] = datetime.utcnow().isoformat()
    ai_result = ai_analyzer.analyze(record)
    record["ai"] = ai_result
    telemetry_history.append(record)
    await broadcast(record)
    return {"status": "ok", "ai": ai_result}


@app.get("/telemetry/history")
def get_history(limit: int = 60):
    return {"data": list(telemetry_history)[-limit:]}


# ── Commands (dashboard → robot) ──────────────────────────────────────────────

@app.post("/command")
async def send_command(cmd: CommandRequest):
    pending_commands.setdefault(cmd.robot_id, []).append({
        "action": cmd.action,
        "params": cmd.params,
        "queued_at": datetime.utcnow().isoformat(),
    })
    return {"status": "queued", "action": cmd.action}


@app.get("/commands/pending")
def get_pending_commands(robot_id: str = "lfr_001"):
    return {"commands": pending_commands.pop(robot_id, [])}


# ── WebSocket ─────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        await websocket.send_json({"type": "history", "data": list(telemetry_history)[-10:]})
        while True:
            msg = await websocket.receive_text()
            if json.loads(msg).get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        connected_clients.remove(websocket)


async def broadcast(data: dict):
    dead = []
    for client in connected_clients:
        try:
            await client.send_json({"type": "telemetry", "data": data})
        except Exception:
            dead.append(client)
    for c in dead:
        connected_clients.remove(c)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "telemetry_count": len(telemetry_history),
        "connected_dashboards": len(connected_clients),
        "robots_with_pending_cmds": list(pending_commands.keys()),
    }
