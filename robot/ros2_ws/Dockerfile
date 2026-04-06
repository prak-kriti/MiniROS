FROM ros:humble-ros-base

SHELL ["/bin/bash", "-c"]

WORKDIR /ws

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-colcon-common-extensions \
    python3-requests \
    ros-humble-std-msgs \
  && rm -rf /var/lib/apt/lists/*

COPY src ./src

RUN source /opt/ros/humble/setup.bash \
  && colcon build

COPY start-robot.sh /start-robot.sh
RUN sed -i 's/\r$//' /start-robot.sh \
  && chmod +x /start-robot.sh

CMD ["/start-robot.sh"]
