from collections import defaultdict, deque, namedtuple
import colorama
from dataclasses import dataclass
from flask import abort, Flask, request, jsonify
from itertools import islice
import os
from pathlib import Path
import json
import ssl
import time

from typing import Deque, Dict, NamedTuple, Type


@dataclass
class User:
    name: str = "anon"
    time: float = 0.0
    color = colorama.Fore.YELLOW


class Message(NamedTuple):
    "message as a NamedTuple is json serializable"
    content: str
    user: str = ""
    time: float = time.time()


Token = Type[str]

CHAT: Deque[Message] = deque(maxlen=1000)
USERS: Dict[Token, User] = dict()

app = Flask(__name__)


@app.errorhandler(400)
def bad_request(e):
    return jsonify(error=str(e)), 400


@app.errorhandler(404)
def resource_not_found(e):
    return jsonify(error=str(e)), 404


@app.errorhandler(500)
def internal_error(e):
    original_exception = getattr(e, "original_exception", None)
    if original_exception:
        return jsonify(error=str(original_exception)), 500
    else:
        return jsonify(error=str(e)), 500


@app.route("/login", methods=["GET"])
def loginRequst():
    req = request.json

    if type(req) is not dict:
        abort(400, description="invalid json")

    elif "username" in req:
        token = req["username"]

        if not token in USERS:
            USERS[token] = User(token)  # token is username for now
            return {"token": token}, 201

        else:
            return {"token": token}, 200

    else:
        abort(400, description="must provide username")


@app.route("/chat", methods=["POST", "GET"])
def chat():
    if request.method == "GET":
        req = request.json

        if not req:
            abort(400, description="expected a json")

        elif type(req) is not dict:
            abort(400, description="json format incorrect")

        elif "token" not in req.keys():
            abort(400, description="token not provided")

        token = req["token"]

        if not token in USERS.keys():
            abort(400, description="token invalid")

        user = USERS[token]

        index = None
        for i, m in enumerate(CHAT):
            if m.time > user.time:
                index = i
                break

        user.time = time.time()

        if index is None:
            return jsonify(message=None), 204

        else:
            messages = [
                {"time": m.time, "user": m.user, "content": m.content}
                for m in list(CHAT)
            ]
            return jsonify(messages=messages), 200

    if request.method == "POST":
        req = request.json
        if "token" not in req:
            abort(400, description="must provide token")
        elif "message" not in req:
            abort(400, description="must provide message")

        token = req["token"]

        if token not in USERS.keys():
            abort(400, "invalid token")

        user = USERS[token]

        content = req["message"]

        if type(content) is not str:
            abort(400, description="message must be a string")

        post_time = time.time()

        msg = Message(content, user.name, post_time)
        CHAT.append(msg)

        return jsonify(None), 204


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
        req = request.json
        if type(req) is not dict:
            abort(400, description="request not understood")

        msg = getattr(req, "message", None)

        if msg:
            return jsonify(message="message recieved, throwing into the trash now"), 200
        else:
            return (
                jsonify(
                    message="well you didn't provide a message, but I would have thrown it away anyways!"
                ),
                200,
            )


def main(*args, **kwargs):
    app.run(
        host="0.0.0.0", port=5000, threaded=True, debug=True
    )  # will listen on port 5000


if __name__ == "__main__":
    main()

