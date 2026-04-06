from setuptools import setup

package_name = 'telemetry_pkg'

setup(
    name=package_name,
    version='0.0.1',
    packages=[package_name],
    install_requires=['setuptools'],
    entry_points={
        'console_scripts': [
            'sensor_publisher = telemetry_pkg.sensor_publisher:main',
            'command_subscriber = telemetry_pkg.command_subscriber:main',
            'bridge_agent = telemetry_pkg.bridge_agent:main',
        ],
    },
)