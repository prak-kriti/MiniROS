from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class TelemetryData(BaseModel):
    timestamp: float
    robot_id: str
    speed: float
    temperature: float

    # LFR specific
    battery_pct: Optional[float] = 100.0
    battery_mv: Optional[int] = 7400
    ir_sensors: Optional[List[int]] = []
    line_state: Optional[str] = 'unknown'
    pid_error: Optional[float] = 0.0
    motor_left: Optional[int] = 0
    motor_right: Optional[int] = 0
    distance_cm: Optional[float] = 0.0
    lap_count: Optional[int] = 0

    # Generic fallback (kept optional so old data doesn't break)
    battery: Optional[float] = None
    x: Optional[float] = 0.0
    y: Optional[float] = 0.0

class CommandRequest(BaseModel):
    robot_id: str = "lfr_001"
    action: str
    params: Optional[Dict[str, Any]] = {}