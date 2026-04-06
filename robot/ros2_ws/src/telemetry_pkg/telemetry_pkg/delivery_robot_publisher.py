#!/usr/bin/env python3
"""
Autonomous Delivery Robot — Fake Sensor Publisher
Simulates a ground delivery robot navigating waypoints to pick up
and drop off packages. State machine:

  idle → en_route_pickup → at_pickup → en_route_dropoff
       → at_dropoff → returning → idle  (loop, mission_count++)

Published fields:
  robot_id, delivery_status, cargo_loaded,
  gps_lat, gps_lng, speed_mps, heading_deg,
  battery_pct, distance_m,
  obstacle_cm, wheel_left_rpm, wheel_right_rpm,
  motor_temp_c, mission_count, eta_seconds
"""
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json, random, time, math


# Simulated waypoints  (lat, lng)  for a small loop
BASE_LAT,  BASE_LNG  = 37.7749, -122.4194
WAYPOINTS = [
    (BASE_LAT + 0.0000, BASE_LNG + 0.0000),   # 0 — home/base
    (BASE_LAT + 0.0010, BASE_LNG + 0.0005),   # 1 — pickup zone
    (BASE_LAT + 0.0008, BASE_LNG - 0.0012),   # 2 — dropoff zone
]


class DeliveryRobotFakeSensor(Node):

    # state → (min_ticks, max_ticks, next_state, cargo_after)
    TRANSITIONS = {
        'idle':              (10, 18, 'en_route_pickup',  False),
        'en_route_pickup':   (22, 35, 'at_pickup',        False),
        'at_pickup':         ( 5,  9, 'en_route_dropoff', True),
        'en_route_dropoff':  (22, 35, 'at_dropoff',       True),
        'at_dropoff':        ( 5,  9, 'returning',        False),
        'returning':         (18, 28, 'idle',             False),
    }

    def __init__(self):
        super().__init__('delivery_robot_publisher')
        self.pub = self.create_publisher(String, '/delivery/telemetry', 10)
        self.cmd_sub = self.create_subscription(
            String, '/delivery/commands', self.handle_command, 10
        )
        self.timer = self.create_timer(0.5, self.publish)

        # State
        self.status      = 'idle'
        self.state_ticks = 0
        self.state_limit = random.randint(10, 18)
        self.cargo       = False
        self.mission_count = 0
        self.command     = 'auto'

        # Physics
        self.gps_lat     = BASE_LAT
        self.gps_lng     = BASE_LNG
        self.heading_deg = 0.0
        self.speed_mps   = 0.0
        self.distance_m  = 0.0
        self.battery_pct = 100.0
        self.motor_temp  = 28.0
        self.w_left      = 0
        self.w_right     = 0

        # Obstacle simulation
        self.obstacle_cm = 300
        self.obstacle_timer = 0

        self.get_logger().info('Delivery Robot fake node started!')

    # ── Command handling ──────────────────────────────────────────────────────

    def handle_command(self, msg):
        try:
            cmd = json.loads(msg.data)
            action = cmd.get('action', 'auto')
            self.command = action
            self.get_logger().info(f'Command received: {action}')
            if action == 'emergency_stop':
                self.speed_mps = 0.0
                self.w_left = self.w_right = 0
            elif action == 'start_delivery' and self.status == 'idle':
                self.status = 'en_route_pickup'
                self.state_ticks = 0
                self.state_limit = random.randint(22, 35)
        except json.JSONDecodeError:
            pass

    # ── State machine ─────────────────────────────────────────────────────────

    def tick_state(self):
        if self.command == 'emergency_stop':
            return
        self.state_ticks += 1
        if self.state_ticks >= self.state_limit:
            _, _, next_state, cargo_after = self.TRANSITIONS[self.status]
            if next_state == 'idle':
                self.mission_count += 1
            self.status = next_state
            self.cargo = cargo_after
            lo, hi = self.TRANSITIONS[next_state][0], self.TRANSITIONS[next_state][1]
            self.state_limit = random.randint(lo, hi)
            self.state_ticks = 0
            self.get_logger().info(f'State → {self.status}  missions={self.mission_count}')

    # ── Sensor simulation ─────────────────────────────────────────────────────

    def is_moving(self):
        return self.status in ('en_route_pickup', 'en_route_dropoff', 'returning')

    def update_physics(self):
        if self.command == 'emergency_stop' or not self.is_moving():
            # Decelerate
            self.speed_mps = max(0.0, self.speed_mps - 0.15)
            self.w_left  = max(0, int(self.w_left  * 0.85))
            self.w_right = max(0, int(self.w_right * 0.85))
        else:
            # Accelerate to cruising speed with noise
            target = 1.4 + random.uniform(-0.2, 0.2)
            self.speed_mps = min(target, self.speed_mps + random.uniform(0.05, 0.15))
            base_rpm = int(self.speed_mps * 80)
            self.w_left  = base_rpm + random.randint(-5, 5)
            self.w_right = base_rpm + random.randint(-5, 5)
            # Slowly drift heading
            self.heading_deg = (self.heading_deg + random.gauss(0, 3)) % 360

        # Move GPS position
        if self.speed_mps > 0.1:
            d_lat = math.cos(math.radians(self.heading_deg)) * self.speed_mps * 0.5 * 9e-6
            d_lng = math.sin(math.radians(self.heading_deg)) * self.speed_mps * 0.5 * 9e-6
            self.gps_lat += d_lat
            self.gps_lng += d_lng
            self.distance_m += self.speed_mps * 0.5

        # Battery: drains when moving, slow drain otherwise
        drain = 0.015 if self.is_moving() else 0.002
        self.battery_pct = max(0.0, self.battery_pct - drain + random.uniform(-0.001, 0.001))

        # Motor temperature
        if self.is_moving():
            self.motor_temp = min(75.0, self.motor_temp + random.uniform(0.01, 0.05))
        else:
            self.motor_temp = max(28.0, self.motor_temp - random.uniform(0.02, 0.08))
        self.motor_temp += random.gauss(0, 0.2)

    def update_obstacle(self):
        self.obstacle_timer += 1
        if self.obstacle_timer > random.randint(15, 40):
            # Brief close obstacle event
            self.obstacle_cm = random.randint(30, 90)
            self.obstacle_timer = 0
        elif self.obstacle_cm < 100:
            # Recover
            self.obstacle_cm = min(300, self.obstacle_cm + random.randint(10, 30))
        else:
            self.obstacle_cm = 300 + random.randint(-20, 20)

    def eta(self):
        if not self.is_moving():
            return 0
        # Rough ETA based on remaining ticks * 0.5s each
        remaining_ticks = max(0, self.state_limit - self.state_ticks)
        return remaining_ticks  # each tick = 0.5 s

    # ── Main publish loop ─────────────────────────────────────────────────────

    def publish(self):
        self.tick_state()
        self.update_physics()
        self.update_obstacle()

        payload = {
            'timestamp':        time.time(),
            'robot_id':         'adr_001',
            'delivery_status':  self.status,
            'cargo_loaded':     self.cargo,
            'gps_lat':          round(self.gps_lat, 6),
            'gps_lng':          round(self.gps_lng, 6),
            'speed_mps':        round(self.speed_mps, 2),
            'heading_deg':      round(self.heading_deg, 1),
            'battery_pct':      round(self.battery_pct, 1),
            'distance_m':       round(self.distance_m, 1),
            'obstacle_cm':      self.obstacle_cm,
            'wheel_left_rpm':   self.w_left,
            'wheel_right_rpm':  self.w_right,
            'motor_temp_c':     round(self.motor_temp, 1),
            'mission_count':    self.mission_count,
            'eta_seconds':      self.eta(),
        }

        msg = String()
        msg.data = json.dumps(payload)
        self.pub.publish(msg)

        self.get_logger().info(
            f'[{self.status:<20}] spd={self.speed_mps:.1f}m/s '
            f'bat={self.battery_pct:.0f}% obst={self.obstacle_cm}cm'
        )


def main(args=None):
    rclpy.init(args=args)
    node = DeliveryRobotFakeSensor()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
