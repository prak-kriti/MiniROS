#!/bin/bash
set -e

source /opt/ros/humble/setup.bash
source /ws/install/setup.bash

ros2 run telemetry_pkg receiver_node &
ros2 run telemetry_pkg bridge_agent &

wait -n
