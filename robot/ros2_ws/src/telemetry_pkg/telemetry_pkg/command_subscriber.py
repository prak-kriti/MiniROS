#!/usr/bin/env python3
"""
Command Subscriber Node
- Listens to /robot/commands topic
- Executes move commands sent from the dashboard
"""
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json


class CommandSubscriber(Node):
    def __init__(self):
        super().__init__('command_subscriber')
        
        # Subscribe to /robot/commands
        self.subscription = self.create_subscription(
            String,
            '/robot/commands',
            self.handle_command,   # callback when message arrives
            10
        )
        self.get_logger().info('Command Subscriber ready, waiting for commands...')

    def handle_command(self, msg):
        """Called automatically every time a message arrives on /robot/commands"""
        try:
            command = json.loads(msg.data)
            action = command.get('action', 'unknown')
            
            self.get_logger().info(f'Received command: {action}')
            
            # Execute the command (on a real robot, send to motor controller)
            if action == 'move_forward':
                self.execute_move(0.5, 0.0)
            elif action == 'move_backward':
                self.execute_move(-0.5, 0.0)
            elif action == 'turn_left':
                self.execute_move(0.0, 0.5)
            elif action == 'turn_right':
                self.execute_move(0.0, -0.5)
            elif action == 'stop':
                self.execute_move(0.0, 0.0)
            else:
                self.get_logger().warn(f'Unknown command: {action}')
                
        except json.JSONDecodeError:
            self.get_logger().error('Invalid JSON command received')

    def execute_move(self, linear_x, angular_z):
        """
        On a real robot: publish to /cmd_vel (ROS 2 standard velocity topic)
        For simulation: just log the action
        """
        self.get_logger().info(
            f'Executing: linear={linear_x} m/s, angular={angular_z} rad/s'
        )
        # TODO for real robot:
        # from geometry_msgs.msg import Twist
        # twist = Twist()
        # twist.linear.x = linear_x
        # twist.angular.z = angular_z
        # self.vel_publisher.publish(twist)


def main(args=None):
    rclpy.init(args=args)
    node = CommandSubscriber()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()