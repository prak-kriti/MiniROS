#!/usr/bin/env python3
"""
LFR Sensor Publisher (Deterministic Fast Version)
- Sensors cycle: s3 → s1 → s2 → s4 → s5
- Update rate: 0.05 sec (20 Hz)
- Motors fixed to 0
"""

import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json, random, time


class LFRFakeSensor(Node):

    def __init__(self):
        super().__init__('lfr_sensor_publisher')

        self.pub = self.create_publisher(String, '/robot/telemetry', 10)
        self.timer = self.create_timer(0.05, self.publish)  # 🔥 20 Hz

        self.battery_mv = 7400
        self.distance_cm = 0.0
        self.lap = 0
        self.pid_integral = 0.0

        self.seq_index = 0  # for deterministic sequence

        self.get_logger().info('LFR sensor node running (fast deterministic mode)')

    # ✅ Deterministic sensor sequence
    def ir_sensors(self):
        # sequence: s3 → s1 → s2 → s4 → s5
        sequence = [2, 0, 1, 3, 4]

        # initialize if not exists
        if not hasattr(self, 'seq_index'):
            self.seq_index = 0

        pos = sequence[self.seq_index]

        sensors = [0, 0, 0, 0, 0]
        sensors[pos] = 1

        # update index SAFELY
        self.seq_index += 1
        if self.seq_index >= len(sequence):
            self.seq_index = 0

        return sensors

    # ✅ Detect state from sensors
    def detect_state(self, sensors):
        if sensors == [0, 0, 1, 0, 0]:
            return 'on_line'
        elif sensors in ([0, 1, 0, 0, 0]):
            return 'slight_left'
        elif sensors in ([0, 0, 0, 1, 0]):
            return 'slight_right'
        elif sensors[0] == 1:
            return 'sharp_left'
        elif sensors[4] == 1:
            return 'sharp_right'
        else:
            return 'lost_line'

    # ✅ PID error (for analytics)
    def pid_error(self, sensors):
        weights = [-2, -1, 0, 1, 2]
        total = sum(sensors)

        if total == 0:
            return self.pid_integral

        error = sum(w * s for w, s in zip(weights, sensors)) / total
        self.pid_integral = error
        return round(error, 3)

    def publish(self):
        sensors = self.ir_sensors()
        state = self.detect_state(sensors)
        error = self.pid_error(sensors)

        # 🔒 Motors fixed to zero
        l_speed, r_speed = 0, 0

        # battery simulation
        self.battery_mv = max(6000, self.battery_mv - random.uniform(0.5, 1.2))
        battery_pct = round((self.battery_mv - 6000) / (8400 - 6000) * 100, 1)

        # independent distance simulation
        self.distance_cm += random.uniform(0.5, 1.5)

        if self.distance_cm > 500 * (self.lap + 1):
            self.lap += 1

        payload = {
            'timestamp': time.time(),
            'robot_id': 'lfr_001',
            'ir_sensors': sensors,
            'line_state': state,
            'pid_error': error,
            'motor_left': 0,
            'motor_right': 0,
            'battery_mv': int(self.battery_mv),
            'battery_pct': battery_pct,
            'distance_cm': round(self.distance_cm, 1),
            'lap_count': self.lap,
            'speed': 0,
            'temperature': round(30 + random.gauss(0, 1.2), 1),
        }

        msg = String()
        msg.data = json.dumps(payload)
        self.pub.publish(msg)

        self.get_logger().info(
            f'sensors={sensors} state={state}'
        )


def main(args=None):
    rclpy.init(args=args)
    node = LFRFakeSensor()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()