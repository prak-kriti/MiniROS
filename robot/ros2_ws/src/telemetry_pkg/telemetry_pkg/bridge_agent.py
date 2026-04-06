#!/usr/bin/env python3
"""
Bridge Agent
- Subscribes to ROS /robot/telemetry
- Forwards each message to the cloud backend via HTTP POST
- Also polls the backend for pending commands and publishes them to ROS
- This is the key edge-cloud connector
"""
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import requests
import json
import threading
import time
import os

CLOUD_URL = os.getenv('CLOUD_URL', 'http://localhost:8000')


class BridgeAgent(Node):
    def __init__(self):
        super().__init__('bridge_agent')
        
        # Subscribe to telemetry to forward to cloud
        self.telemetry_sub = self.create_subscription(
            String, '/robot/telemetry', self.forward_to_cloud, 10
        )
        
        # Publisher for commands received from cloud
        self.command_pub = self.create_publisher(String, '/robot/commands', 10)
        
        # Poll for commands every 0.5s in a background thread
        self.poll_thread = threading.Thread(target=self.poll_commands, daemon=True)
        self.poll_thread.start()
        
        self.get_logger().info(f'Bridge Agent started. Cloud: {CLOUD_URL}')

    def forward_to_cloud(self, msg):
        """Send telemetry data to cloud backend"""
        try:
            data = json.loads(msg.data)
            response = requests.post(
                f'{CLOUD_URL}/telemetry',
                json=data,
                timeout=2.0
            )
            if response.status_code != 200:
                self.get_logger().warn(f'Cloud returned {response.status_code}')
        except requests.exceptions.ConnectionError:
            self.get_logger().warn('Cloud unreachable, will retry next cycle')
        except Exception as e:
            self.get_logger().error(f'Bridge error: {e}')

    def poll_commands(self):
        """Check cloud for pending commands and publish to ROS"""
        while True:
            try:
                response = requests.get(
                    f'{CLOUD_URL}/commands/pending',
                    params={'robot_id': 'lfr_001'},
                    timeout=2.0
                )
                if response.status_code == 200:
                    commands = response.json().get('commands', [])
                    for cmd in commands:
                        msg = String()
                        msg.data = json.dumps(cmd)
                        self.command_pub.publish(msg)
                        self.get_logger().info(f'Dispatched command: {cmd}')
            except Exception:
                pass  # Silently retry
            time.sleep(0.5)


def main(args=None):
    rclpy.init(args=args)
    node = BridgeAgent()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()