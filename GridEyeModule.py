import math
import time
import numpy as np
import busio
import board
import pygame
from scipy.interpolate import griddata
import matplotlib as plt 
from colour import Color
import adafruit_amg88xx
import io
from PIL import Image
import os

class GridEYECamera:
    def __init__(self):
        self.i2c_bus = None
        self.sensor = None
        self.connected = False
        self.min_temp = 26.0
        self.max_temp = 32.0
        self.colordepth = 1024
        self.points = [(math.floor(ix / 8), (ix % 8)) for ix in range(0, 64)]
        self.grid_x, self.grid_y = np.mgrid[0:7:32j, 0:7:32j]
        
        # Initialize color gradient
        self.pixels = []
        blue = Color("indigo")
        self.colors = list(blue.range_to(Color("red"), self.colordepth))
        self.colors = [(int(c.red * 255), int(c.green * 255), int(c.blue * 255)) 
                      for c in self.colors]
        
        # Pygame setup (for visualization)
        pygame.init()
        self.display = pygame.Surface((240, 240))
        time.sleep(0.1)  # Sensor stabilization

    def connect(self):
        try:
            self.i2c_bus = busio.I2C(board.SCL, board.SDA)
            self.sensor = adafruit_amg88xx.AMG88XX(self.i2c_bus)
            self.connected = True
            time.sleep(0.1)  # Sensor stabilization
            return True
        except Exception as e:
            print(f"Connection error: {e}")
            self.connected = False
            return False

    def disconnect(self):
        try:
            if self.i2c_bus:
                self.i2c_bus.deinit()
            self.sensor = None
            self.connected = False
            return True
        except Exception as e:
            print(f"Disconnection error: {e}")
            return False

    def is_connected(self):
        """Return the status of the sensor"""
        return self.connected

    def get_thermal_data(self):
        """Returns raw 8x8 temperature data"""
        if not self.connected or not self.sensor:
            return None
        try:
            return [row.copy() for row in self.sensor.pixels]
        except Exception as e:
            print(f"Error reading thermal data: {e}")
            self.connected = False
            return None

    def get_thermal_image(self):
        """Returns interpolated 32x32 RGB image"""
        if not self.connected or not self.sensor:
            return None
            
        try:
            # Read pixels
            _pixels = []
            self.pixels = []
            for row in self.sensor.pixels:
                _pixels += row.copy()
            self.pixels = _pixels
            
            # Normalize to color indices
            pixels = [self._map_value(p, self.min_temp, self.max_temp, 0, self.colordepth - 1) 
                     for p in self.pixels]
            
            # Interpolate
            bicubic = griddata(self.points, pixels, (self.grid_x, self.grid_y), method="cubic")
            
            # Render to surface
            self.display.fill((0, 0, 0))
            for ix, row in enumerate(bicubic):
                for jx, pixel in enumerate(row):
                    pygame.draw.rect(
                        self.display,
                        self.colors[self._constrain(int(pixel), 0, self.colordepth - 1)],
                        (ix * 7.5, jx * 7.5, 7.5, 7.5)  # 32x32 grid on 240x240 display
                    )
            
            # Convert to PIL Image
            img_bytes = pygame.image.tostring(self.display, "RGB")
            pil_img = Image.frombytes("RGB", (240, 240), img_bytes)
            buffered = io.BytesIO()
            pil_img.save(buffered, format="PNG")
            return buffered.getvalue()
        except Exception as e:
            print(f"Error generating thermal image: {e}")
            self.connected = False
            return None

    def set_temperature_range(self, min_temp, max_temp):
        self.min_temp = min_temp
        self.max_temp = max_temp

    def get_temperature_range(self):
        return {'min': self.min_temp, 'max': self.max_temp}
    
    def _constrain(self, val, min_val, max_val):
        return min(max_val, max(min_val, val))

    def _map_value(self, x, in_min, in_max, out_min, out_max):
        return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min

    def save_as_image(self, img, thermal_data, filename):
        """Save both the pygame visualization image and the thermal data with timestamps"""
        if img is None or thermal_data is None:
            print("No data to save")
            return False
            
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(filename), exist_ok=True)
            
            # Save Pygame surface as image
            pygame_image = pygame.surfarray.array3d(img)
            pil_image = Image.fromarray(pygame_image)
            image_filename = os.path.splitext(filename)[0] + "_visualization.png"
            pil_image.save(image_filename)
            
            # Save thermal data plot
            plot_filename = os.path.splitext(filename)[0] + "_plot.png"
            plt.figure(figsize=(8, 8))
            plt.imshow(np.array(thermal_data).reshape(8, 8), 
                      cmap='inferno', 
                      vmin=self.min_temp, 
                      vmax=self.max_temp)
            plt.axis('off')
            plt.colorbar()
            plt.savefig(plot_filename, bbox_inches='tight')
            plt.close()
            
            # Save thermal data to text file
            txt_filename = os.path.splitext(filename)[0] + ".txt"
            with open(txt_filename, 'w') as f:
                f.write(f"Temperature range: {self.min_temp} - {self.max_temp}\n")
                f.write("Thermal data:\n")
                for row in thermal_data:
                    f.write("\t".join([f"{x:.2f}" for x in row]) + "\n")
            
            return True
        except Exception as e:
            print(f"Error saving image/data: {e}")
            return False
if __name__ == '__main__':
    camera = GridEYECamera()
    if camera.connect():
        try:
            thermal_data = camera.get_thermal_data()
            thermal_image = camera.get_thermal_image()
            if thermal_data and thermal_image:
                # This will save three files:
                # "thermal_visualization.png", "thermal_plot.png", and "thermal.txt"
                camera.save_as_image(thermal_image, thermal_data, "thermal.png")
        finally:
            camera.disconnect()