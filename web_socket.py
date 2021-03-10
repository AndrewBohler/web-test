import colorama
from colorama import Fore
from datetime import datetime
from flask import Flask
from flask.templating import render_template
from flask_socketio import SocketIO, emit

import time

colorama.init()

app = Flask(__name__)
app.config["SECRET_KEY"] = "this is my secret key man"
socketio = SocketIO(app)


@socketio.on("connect")
def handle_connection():
    emit("message", "somebody connected!")


@socketio.on("message")
def handle_message(data):
    time.sleep(1)
    time_now = datetime.strftime(datetime.utcnow(), r"%H:%M:%S")
    emit("message", f"we recieved your message at {time_now}")


@socketio.on("disconnect")
def handle_disconnect():
    emit("message", "somebody disconnected...")


@socketio.on("chat-message")
def chat_message(message):
    emit("chat-message", message)


@app.route("/")
def index():
    return render_template("test/web-socket.html", title="cSOMETHING ELSE")


if __name__ == "__main__":
    socketio.run(app)
