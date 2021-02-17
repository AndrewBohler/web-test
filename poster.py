import click
from flask import Flask, request
import json
from pathlib import Path
import requests
import threading
import time

from typing import Callable, Optional, Type


URL_t = Type[str]


TARGET = "http://localhost:5000"
NAME = ""

JSON = None


class ExitChat(Exception):
    pass


CHAT_COMMANDS = dict()


def get_json(url):
    if url:
        r = requests.get(url)
        r_json = r.json()
        print(json.dumps(r_json, indent=2))
        return r_json
    else:
        return dict()


def format_status_code(status: int):
    "returns a colored string of the http status code"
    if not status // 200:
        return click.style(str(status), fg="white")
    elif not status // 300:
        return click.style(str(status), fg="green")
    elif not status // 400:
        return click.style(str(status), fg="yellow")
    else:
        return click.style(str(status), fg="red")


def enter_chat():
    print("press <enter> to send message, <ctrl-C> to quit")
    status = ""
    try:
        while True:
            msg = input(f"[{status:>3}]{NAME}>")

            if msg[0] == "/":
                cmd = msg[1:].split(" ")

                if cmd[0] in CHAT_COMMANDS:
                    CHAT_COMMANDS[cmd[0]](cmd[1:])
                    continue

                else:
                    print("invalid command")
                    continue

            msg = msg.replace("\\n", "\n")
            payload = {"message": msg}
            r = requests.post(url=TARGET, json=json.dumps(payload))
            r_json = r.json()
            success = "SUCCESS" if r_json.get("success") else "FAILURE"
            message = r_json.get("message", "")
            status = format_status_code(r.status_code)

    except ExitChat:
        print("exiting chat")


def connectToServer() -> bool:
    global TOKEN
    try:
        payload = {"request_type": "login", "username": NAME}
        print("requesting GET")
        resp = requests.get(url=URL, json=json.dumps(payload))
        print("recieved response", resp.status_code)
        resp = resp.json()

        if not resp:
            print("response empty")
            return False

        if "token" in resp:
            TOKEN = resp["token"]
            return True

        else:
            msg = "login failed: "
            if "message" in resp:
                msg += resp["message"]

            print(msg)
            return False

    except Exception as e:
        print("exception occurred while trying to connect to", URL, "\n" + str(e))
        return False


def main():
    global NAME
    global URL

    login_success = False

    while not login_success:
        URL = input("enter url>")
        NAME = input("enter username>")

        login_success = connectToServer()

    enter_chat()

    print("exiting...")


if __name__ == "__main__":
    main()

