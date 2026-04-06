#!/usr/bin/env python3
"""
LFR Fake Sensor Publisher — Command Aware
Responds to commands from dashboard:
- stop: motors = 0, speed = 0
- move_forward: full speed
- move_backward: reverse
- turn_left/right: differential motor speeds
"""
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json, random, time


class LFRFakeSensor(Node):

    STATES = ['on_line', 'on_line', 'on_line', 'slight_left',
              'slight_right', 'sharp_turn', 'lost_line']

    def __init__(self):
        super().__init__('lfr_sensor_publisher')
        self.pub = self.create_publisher(String, '/robot/telemetry', 10)
        self.timer = self.create_timer(0.5, self.publish)

        # Subscribe to commands
        self.cmd_sub = self.create_subscription(
            String, '/robot/commands', self.handle_command, 10
        )

        # Robot state
        self.battery_mv = 7400
        self.state = 'on_line'
        self.state_timer = 0
        self.distance_cm = 0.0
        self.lap = 0
        self.pid_integral = 0.0

        # Command controlled state
        self.command = 'auto'  # auto = normal LFR behaviour
        self.manual_left = 0
        self.manual_right = 0

        self.get_logger().info('LFR fake node running — command aware!')

    def handle_command(self, msg):
        """React to dashboard commands"""
        try:
            cmd = json.loads(msg.data)
            action = cmd.get('action', 'auto')
            self.command = action

            if action == 'stop':
                self.manual_left = 0
                self.manual_right = 0
                self.get_logger().info('Command: STOP')

            elif action == 'move_forward':
                self.manual_left = 200
                self.manual_right = 200
                self.get_logger().info('Command: FORWARD')

            elif action == 'move_backward':
                self.manual_left = -150
                self.manual_right = -150
                self.get_logger().info('Command: BACKWARD')

            elif action == 'turn_left':
                self.manual_left = 80
                self.manual_right = 200
                self.get_logger().info('Command: TURN LEFT')

            elif action == 'turn_right':
                self.manual_left = 200
                self.manual_right = 80
                self.get_logger().info('Command: TURN RIGHT')

        except json.JSONDecodeError:
            pass

    def next_state(self):
        if self.command != 'auto':
            return  # don't change LFR state in manual mode
        self.state_timer += 1
        if self.state_timer > random.randint(6, 20):
            self.state = random.choice(self.STATES)
            self.state_timer = 0
            if self.state == 'lost_line':
                self.state_timer = 8

    def ir_sensors(self):
        if self.command == 'stop':
            return [0, 0, 0, 0, 0]  # all dark when stopped
        if self.command in ['move_forward', 'move_backward']:
            return [0, 0, 1, 0, 0]  # centered
        if self.command == 'turn_left':
            return [0, 1, 1, 0, 0]
        if self.command == 'turn_right':
            return [0, 0, 1, 1, 0]

        # Auto mode
        patterns = {
            'on_line':     [0, 0, 1, 0, 0],
            'slight_left': [0, 1, 1, 0, 0],
            'slight_right':[0, 0, 1, 1, 0],
            'sharp_turn':  [1, 1, 0, 0, 0],
            'lost_line':   [0, 0, 0, 0, 0],
        }
        base = patterns.get(self.state, [0, 0, 1, 0, 0])
        return [int(v) ^ (1 if random.random() < 0.05 else 0) for v in base]

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
            # Add small noise to manual speeds
            l = self.manual_left + random.randint(-3, 3)
            r = self.manual_right + random.randint(-3, 3)
            return l, r

        kp, base = 60, 180
        left  = int(min(255, max(0, base + kp * error))) + random.randint(-3, 3)
        right = int(min(255, max(0, base - kp * error))) + random.randint(-3, 3)
        return left, right

    def publish(self):
        self.next_state()
        sensors = self.ir_sensors()
        error = self.pid_error(sensors)
        l_speed, r_speed = self.motor_speeds(error)

        # Battery drains only when moving
        if self.command != 'stop':
            self.battery_mv = max(6000, self.battery_mv - random.uniform(0.5, 2.0))
        battery_pct = round((self.battery_mv - 6000) / (8400 - 6000) * 100, 1)

        # Distance only increases when moving
        avg_speed = (abs(l_speed) + abs(r_speed)) / 2
        if self.command != 'stop':
            self.distance_cm += avg_speed * 0.001 * 0.5

        if self.distance_cm > 500 * (self.lap + 1):
            self.lap += 1

        # Line state reflects command
        if self.command == 'stop':
            line_state = 'stopped'
        elif self.command == 'move_forward':
            line_state = 'manual_forward'
        elif self.command == 'move_backward':
            line_state = 'manual_backward'
        elif self.command == 'turn_left':
            line_state = 'manual_left'
        elif self.command == 'turn_right':
            line_state = 'manual_right'
        else:
            line_state = self.state

        payload = {
            'timestamp':   time.time(),
            'robot_id':    'lfr_001',
            'ir_sensors':  sensors,
            'line_state':  line_state,
            'pid_error':   error,
            'motor_left':  l_speed,
            'motor_right': r_speed,
            'battery_mv':  int(self.battery_mv),
            'battery_pct': battery_pct,
            'distance_cm': round(self.distance_cm, 1),
            'lap_count':   self.lap,
            'speed':       round(avg_speed / 255 * 0.5, 3),
            'temperature': round(30 + random.gauss(0, 1.5), 1),
        }

        msg = String()
        msg.data = json.dumps(payload)
        self.pub.publish(msg)

        self.get_logger().info(
            f'cmd={self.command:<15} L={l_speed} R={r_speed} bat={battery_pct:.0f}%'
        )


def main(args=None):
    rclpy.init(args=args)
    node = LFRFakeSensor()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()