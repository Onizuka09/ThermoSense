from flask import Flask, jsonify, request,Response,send_file, render_template
import os

app = Flask(__name__)

@app.route('/')
def handle_route(): 
    return render_template("index.html")
    


if __name__ == "__main__": 
    app.run(debug=True,host='0.0.0.0')