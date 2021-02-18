from collections import defaultdict, deque, namedtuple
import colorama
from dataclasses import dataclass
from flask import Flask, request
from itertools import islice
import os
from pathlib import Path
import json
import ssl
import time

from typing import Deque, Dict, NamedTuple, Type

# from flask.wrappers import Request


@dataclass
class User:
    name: str = "anon"
    time: float = 0.0
    color = colorama.Fore.YELLOW


class Message(NamedTuple):
    content: str
    user: str = ""
    time: float = time.time()


Token = Type[str]

CHAT: Deque[Message] = deque(maxlen=1000)
USERS: Dict[Token, User] = dict()

app = Flask(__name__)


@app.route("/login", methods=["GET"])
def loginRequst():
    try:
        req = request.json
        return_string = ""

        if "username" in req:
            token = req["username"]

            if not token in USERS:
                USERS[token] = User(token)  # token is username for now
                msg = "user created!"
                print("created user", USERS[token])

            else:
                msg = "user found!"

            return_string = json.dumps(
                {"success": True, "token": token, "message": msg}
            )

        else:
            return_string = json.dumps({"success": False, "message": "invalid login"})

        print("\n\treturn_string:", return_string, "\n")

        return return_string

    except Exception as e:
        print("exception! what happended: ", e)
        return "internal failure: " + str(e)


@app.route("/chat", methods=["POST", "GET"])
def chat():
    if request.method == "GET":
        try:
            req = request.json

            if not req:
                return json.dumps({"success": False, "message": "invalid request"})

            if "token" not in req.keys():
                return json.dumps(
                    {
                        "success": False,
                        "message": "user must provide token to post",
                        "messages": None,
                    }
                )

            token = req["token"]

            if not token in USERS.keys():
                return json.dumps(
                    {"success": False, "message": "invalid token", "messages": None}
                )

            user = USERS[token]

            index = None
            for i, m in enumerate(CHAT):
                if m.time > user.time:
                    index = i
                    break

            user.time = time.time()

            if index is None:
                return json.dumps({"messages": None})

            else:
                return json.dumps(
                    {
                        "messages": [
                            {"time": m.time, "user": m.user, "content": m.content}
                            for m in list(CHAT)
                        ]
                    }
                )

        except Exception as e:
            print("exception occured during GET request:", str(e))
            return r'{"result": "failure"}'

    if request.method == "POST":
        try:
            req = request.json
            if "token" not in req:
                return json.dumps({"message": "token must be provided"})
            elif "message" not in req:
                return json.dumps({"message": "message invalid"})

            token = req["token"]
            post_time = time.time()
            user = USERS[token]
            content = req["message"]

            msg = Message(user.name, content, post_time)
            CHAT.append(msg)
            return json.dumps({"status": "success", "message": "message posted"})

        except Exception as e:
            print("exception occured during POST request:", str(e))
            return "failure: " + str(e)


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
    while True:
        try:
            app.run(
                host="0.0.0.0", port=5000, threaded=True, debug=True
            )  # will listen on port 5000

        except Exception as e:
            print(e)
            print("restarting app")
            continue


if __name__ == "__main__":
    main()

