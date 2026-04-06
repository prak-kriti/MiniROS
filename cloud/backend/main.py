"""
FastAPI Cloud Backend
- Receives telemetry from the robot
- Broadcasts to dashboard via WebSocket
- Queues commands for the robot to poll
- Runs AI analysis on incoming data
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import json
from datetime import datetime
from collections import deque
from typing import List
from models import TelemetryData, CommandRequest
from ai_module import AIAnalyzer

# In-memory storage (replace with Redis/PostgreSQL for production)
telemetry_history = deque(maxlen=500)   # last 500 readings
pending_commands = {}                   # robot_id -> list of commands
connected_clients: List[WebSocket] = [] # dashboard WebSocket connections

ai_analyzer = AIAnalyzer()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Backend started — waiting for robot data...")
    yield
    print("Backend shutting down")


app = FastAPI(title="Mini ROS Cloud Backend", lifespan=lifespan)

# Allow React dashboard to connect (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten this in production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Telemetry endpoint ────────────────────────────────────────────────────────

@app.post("/telemetry")
async def receive_telemetry(data: TelemetryData):
    """Robot POSTs telemetry here every second"""
    record = data.dict()
    record['server_time'] = datetime.utcnow().isoformat()
    
    # Run AI analysis
    ai_result = ai_analyzer.analyze(record)
    record['ai'] = ai_result
    
    # Store in memory
    telemetry_history.append(record)
    
    # Broadcast to all connected dashboard clients
    await broadcast(record)
    
    return {"status": "ok", "ai": ai_result}


@app.get("/telemetry/history")
def get_history(limit: int = 60):
    """Dashboard fetches recent history on page load"""
    data = list(telemetry_history)[-limit:]
    return {"data": data}


# ── Command endpoints ─────────────────────────────────────────────────────────

@app.post("/command")
async def send_command(cmd: CommandRequest):
    """Dashboard POSTs a command here; robot polls and picks it up"""
    robot_id = cmd.robot_id
    if robot_id not in pending_commands:
        pending_commands[robot_id] = []
    
    pending_commands[robot_id].append({
        "action": cmd.action,
        "params": cmd.params,
        "queued_at": datetime.utcnow().isoformat()
    })
    
    return {"status": "queued", "action": cmd.action}


@app.get("/commands/pending")
def get_pending_commands(robot_id: str = "lfr_001"):
    """Robot polls this endpoint to get its pending commands"""
    commands = pending_commands.pop(robot_id, [])
    return {"commands": commands}


# ── WebSocket for dashboard ───────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    print(f"Dashboard connected. Total clients: {len(connected_clients)}")
    
    try:
        # Send last 10 readings as initial state
        history = list(telemetry_history)[-10:]
        await websocket.send_json({"type": "history", "data": history})
        
        # Keep connection open, handle incoming messages
        while True:
            msg = await websocket.receive_text()
            data = json.loads(msg)
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        connected_clients.remove(websocket)
        print(f"Dashboard disconnected. Total clients: {len(connected_clients)}")


async def broadcast(data: dict):
    """Send data to all connected dashboard WebSocket clients"""
    disconnected = []
    for client in connected_clients:
        try:
            await client.send_json({"type": "telemetry", "data": data})
        except Exception:
            disconnected.append(client)
    for client in disconnected:
        connected_clients.remove(client)


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "telemetry_count": len(telemetry_history),
        "connected_dashboards": len(connected_clients),
        "robots_with_pending_cmds": list(pending_commands.keys())
    }