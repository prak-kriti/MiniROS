#!/usr/bin/env python3
"""
LFR Real Sensor Node — NodeMCU/ESP8266 receiver

Flow:
  ESP8266 → POST /sensor (FastAPI) → this node GETs /sensor → /robot/telemetry (ROS2)
  → bridge_agent → POST /telemetry (FastAPI) → WebSocket → Dashboard

bridge_agent handles forwarding to FastAPI — do NOT duplicate that here.
"""

import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json, time, requests, os


BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8000')
DEVICE_ID   = os.getenv('DEVICE_ID', 'lfr_001')
SENSOR_URL  = BACKEND_URL + f'/sensor?device_id={DEVICE_ID}'


class LFRRealSensor(Node):

    def __init__(self):
        super().__init__('lfr_real_sensor_publisher')

        self.pub = self.create_publisher(String, '/robot/telemetry', 10)
        self.cmd_sub = self.create_subscription(
            String, '/robot/commands', self.handle_command, 10
        )

        self.timer = self.create_timer(0.5, self.publish)

        # Robot state
        self.command = 'auto'
        self.manual_left = 0
        self.manual_right = 0

        self.battery_mv = 7400
        self.distance_cm = 0.0
        self.lap = 0
        self.pid_integral = 0.0

        self.get_logger().info(f'Real Sensor Node running — polling {SENSOR_URL}')

    def handle_command(self, msg):
        try:
            cmd = json.loads(msg.data)
            action = cmd.get('action', 'auto')
            self.command = action

            if action == 'stop':
                self.manual_left = 0
                self.manual_right = 0
            elif action == 'move_forward':
                self.manual_left = 200
                self.manual_right = 200
            elif action == 'move_backward':
                self.manual_left = -150
                self.manual_right = -150
            elif action == 'turn_left':
                self.manual_left = 80
                self.manual_right = 200
            elif action == 'turn_right':
                self.manual_left = 200
                self.manual_right = 80
        except Exception:
            pass

    def get_real_sensors(self):
        try:
            res = requests.get(SENSOR_URL, timeout=1.0)
            return res.json().get('ir', [0, 0, 0, 0, 0])
        except requests.exceptions.Timeout:
            self.get_logger().warn(f'Sensor fetch TIMEOUT: {SENSOR_URL}')
            return [0, 0, 0, 0, 0]
        except requests.exceptions.ConnectionError:
            self.get_logger().warn(f'Sensor fetch CONNECTION ERROR: {SENSOR_URL}')
            return [0, 0, 0, 0, 0]
        except Exception as e:
            self.get_logger().warn(f'Sensor fetch failed: {e}')
            return [0, 0, 0, 0, 0]

    def pid_error(self, sensors):
        weights = [-2, -1, 0, 1, 2]
        total = sum(sensors)
        if total == 0:
            return self.pid_integral
        error = sum(w * s for w, s in zip(weights, sensors)) / total
        self.pid_integral = error
        return round(error, 3)

    def motor_speeds(self, error):
        if self.command != 'auto':
            return self.manual_left, self.manual_right
        kp = 60
        base = 180
        left = int(min(255, max(0, base + kp * error)))
        right = int(min(255, max(0, base - kp * error)))
        return left, right

    def publish(self):
        sensors = self.get_real_sensors()
        error = self.pid_error(sensors)
        l_speed, r_speed = self.motor_speeds(error)

        if self.command != 'stop':
            self.battery_mv = max(6000, self.battery_mv - 1)
        battery_pct = round((self.battery_mv - 6000) / (8400 - 6000) * 100, 1)

        avg_speed = (abs(l_speed) + abs(r_speed)) / 2
        if self.command != 'stop':
            self.distance_cm += avg_speed * 0.001 * 0.5
        if self.distance_cm > 500 * (self.lap + 1):
            self.lap += 1

        if sum(sensors) == 0:
            line_state = 'lost_line'
        elif sensors[2] == 1:
            line_state = 'on_line'
        elif sensors[0] or sensors[1]:
            line_state = 'left'
        elif sensors[3] or sensors[4]:
            line_state = 'right'
        else:
            line_state = 'unknown'

        payload = {
            'timestamp': time.time(),
            'robot_id': DEVICE_ID,
            'ir_sensors': sensors,
            'line_state': line_state,
            'pid_error': error,
            'motor_left': l_speed,
            'motor_right': r_speed,
            'battery_mv': int(self.battery_mv),
            'battery_pct': battery_pct,
            'distance_cm': round(self.distance_cm, 1),
            'lap_count': self.lap,
            'speed': round(avg_speed / 255 * 0.5, 3),
            'temperature': 30.0,
        }

        msg = String()
        msg.data = json.dumps(payload)
        self.pub.publish(msg)

        self.get_logger().info(f'IR={sensors} | L={l_speed} R={r_speed} | {battery_pct}%')


def main(args=None):
    rclpy.init(args=args)
    node = LFRRealSensor()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
