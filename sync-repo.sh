#!/bin/bash
rsync -avz --exclude '.git' --exclude 'env' . pi@raspberrypi.local:/home/pi/ThermoSense
