from collections import defaultdict, deque, namedtuple
import colorama
from dataclasses import dataclass
from flask import Flask, request
import os
from pathlib import Path
import json
import ssl
import time

from typing import Deque, Dict, Type

# from flask.wrappers import Request


@dataclass
class User:
    name: str = "anon"
    time: float = 0.0
    color = colorama.Fore.YELLOW


Message = namedtuple("Message", "time user content")
Token = Type[str]

CHAT: Deque[Message] = deque(maxlen=1000)
USERS: Dict[Token, User] = dict()

app = Flask(__name__)


@app.route("/login", methods=["GET"])
def loginRequst():
    req = json.loads(request.json)

    if "request_type" not in req:
        return json.dumps({"message": "request type not provided"})

    if "username" in req:
        token = req["username"]

        if not token in USERS:
            USERS[token] = User(token)  # token is username for now

        return json.dumps({"token": token})


@app.route("/chat", methods=["POST", "GET"])
def chat():
    if request.method == "GET":
        try:
            data = dict()
            req = json.loads(request.json)
            if not req:
                return "invalid request"

            if "token" not in req:
                return json.dumps({"message": "user must provide token to post"})

            token = req["token"]
            update_time = USERS[token].time

            index = 0
            for i, m in enumerate(CHAT[-1:-1:-1]):
                if m.time < update_time:
                    index = -i
                    break

            if index == 0:
                return ""

            else:
                return json.dumps({"messages": CHAT[index:]})

        except Exception as e:
            print("exception occured during GET request:", str(e))

    if request.method == "POST":
        try:
            req = json.loads(request.json)
            if "token" not in req:
                return json.dumps({"message": "token must be provided"})
            elif "message" not in req:
                return json.dumps({"message": "message invalid"})

            token = req["token"]
            post_time = time.time()
            user = USERS[token]
            content = req["message"]

            msg = Message(post_time, user, content)
            CHAT.append(msg)
            return json.dumps({"status": "success", "message": "message posted"})

        except Exception as e:
            print("exception occured during POST request:", str(e))


@app.route("/", methods=["POST", "GET"])
def index():
    current_time = time.strftime(r"%y-%m-%d %H:%M:%S")
    timestamp = f"[{current_time}]"
    if request.method == "GET":
        return (
            "<h1>Hello, this is a Flask server</h1>"
            "<h4>Header 4 baby!</h4>"
            "<p>This is some stuff that I am writing for fun</p>"
            f"<h2>Datetime: {timestamp}</h2>"
        )

    elif request.method == "POST":
        try:
            print("Recieved POST, ", end="")
            req_json = json.loads(request.get_json())
            msg = req_json.get("message")
            if msg:
                print(msg)
                return json.dumps(
                    {
                        "success": True,
                        "message": "message recieved, throwing into the trash now",
                    }
                )

            else:
                return json.dumps(
                    {
                        "success": False,
                        "message": "well, you didn't provide a message, but I would have thrown it away anyways...",
                    }
                )

        except TypeError as error:
            print(error)
            return json.dumps({"sucess": False, "message": str(error)})


def main(*args, **kwargs):
    for arg in args:
        print(arg)

    for kwarg in kwargs:
        print(kwarg)


if __name__ == "__main__":
    app.run(
        host="0.0.0.0", port=5000, threaded=True, debug=True
    )  # will listen on port 5000

