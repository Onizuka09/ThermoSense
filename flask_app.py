from flask import Flask, render_template, jsonify, request
from camera import GridEYECamera
import time
import os
import numpy as np
from PIL import Image

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/images'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

camera = GridEYECamera()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/camera/status')
def camera_status():
    return jsonify({
        'status': 'connected' if camera.is_connected() else 'disconnected',
        'temperature_range': camera.get_temperature_range()
    })

@app.route('/api/camera/connect', methods=['POST'])
def connect_camera():
    camera.connect()
    return jsonify({'success': True, 'status': 'connected'})

@app.route('/api/camera/disconnect', methods=['POST'])
def disconnect_camera():
    camera.disconnect()
    return jsonify({'success': True, 'status': 'disconnected'})

@app.route('/api/camera/data')
def camera_data():
    if not camera.is_connected():
        return jsonify({'error': 'Camera not connected'}), 400
    
    thermal_data = camera.get_thermal_data().tolist()
    return jsonify({
        'thermal_data': thermal_data,
        'timestamp': time.time()
    })

@app.route('/api/camera/image')
def camera_image():
    if not camera.is_connected():
        return jsonify({'error': 'Camera not connected'}), 400
    
    img_array = camera.get_thermal_image()
    timestamp = str(int(time.time()))
    filename = f"thermal_{timestamp}.png"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    Image.fromarray(img_array).save(filepath)
    return jsonify({
        'url': f"/static/images/{filename}",
        'timestamp': timestamp
    })

@app.route('/api/camera/set_temperature_range', methods=['POST'])
def set_temperature_range():
    min_temp = request.json.get('min_temp')
    max_temp = request.json.get('max_temp')
    camera.set_temperature_range(float(min_temp), float(max_temp))
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)


