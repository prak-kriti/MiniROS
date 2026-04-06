from glob import glob
from setuptools import setup

package_name = 'telemetry_pkg'

setup(
    name=package_name,
    version='0.0.1',
    packages=[package_name],
    install_requires=['setuptools'],
    data_files=[
        ('share/ament_index/resource_index/packages', [f'resource/{package_name}']),
        (f'share/{package_name}', ['package.xml']),
        (f'share/{package_name}', glob('launch/*.py')),
    ],
    zip_safe=True,
    maintainer='Your Name',
    maintainer_email='you@example.com',
    description='Mini ROS Cloud Edge Robot Package',
    license='MIT',
    entry_points={
        'console_scripts': [
            'sensor_publisher = telemetry_pkg.sensor_publisher:main',
            'delivery_robot_publisher = telemetry_pkg.delivery_robot_publisher:main',
            'command_subscriber = telemetry_pkg.command_subscriber:main',
            'bridge_agent = telemetry_pkg.bridge_agent:main',
        ],
    },
)
