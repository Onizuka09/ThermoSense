#!/bin/bash 
rsync -avz --exclude '.git' /home/moktar/IoT_projects/ThermoSense pi@raspberrypi.local:/home/pi/thermal_camera/
