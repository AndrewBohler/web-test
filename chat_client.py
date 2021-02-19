import click
from flask import Flask, request
import json
from pathlib import Path
import requests
import threading
import time

from typing import Callable, Dict, List, Optional, Type

from requests import exceptions


URL_t = Type[str]

NAME = ""

JSON = None


class ChatException(Exception):
    def __str__(self) -> str:
        return "generic chat exception"


class ExitChat(ChatException):
    def __str__(self) -> str:
        return "exit command invoked"


class InvalidArguments(ChatException):
    def __str__(self) -> str:
        return "a command was invoked with invalid arguments"


def exitChat(args: Optional[List] = None):
    if args:
        raise InvalidArguments
    else:
        raise ExitChat


CHAT_COMMANDS: Dict[str, Callable] = dict()
CHAT_COMMANDS["exit"] = exitChat


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
    print('type "/exit" to exit chat')
    status = ""
    while True:
        try:
            msg = input(f"[{status:>3}]{NAME}>")

            if not msg:
                status = ""
                continue

            elif msg[0] == "/":
                cmd = msg[1:].split(" ")

                if not cmd:
                    status = ""
                    continue

                elif cmd[0] in CHAT_COMMANDS:
                    CHAT_COMMANDS[cmd[0]](cmd[1:])
                    continue

                else:
                    print("invalid command")
                    continue

            msg = msg.replace("\\n", "\n")
            payload = {"token": TOKEN, "message": msg}
            resp = requests.post(url=URL + "/chat", json=payload)
            status = format_status_code(resp.status_code)

        except ExitChat as e:
            print(e)
            break

        except ChatException as e:
            print(e)
            status = ""
            continue


def connectToServer() -> bool:
    global TOKEN
    try:
        payload = {"username": NAME}
        resp = requests.get(url=URL + "/login", json=payload)
        resp.raise_for_status()
        resp = resp.json()
        TOKEN = resp.get("token", None)
        if TOKEN:
            return True
        else:
            print("login failure:", resp.get("error", ""))
            return False

    except requests.exceptions.RequestException as e:
        print("login failure:", str(e))
        return False


def listen_to_chat():
    payload = json.dumps({})
    resp = requests.get(url=URL + "/chat", json=payload)


def main():
    global NAME
    global URL

    while True:
        login_success = False
        while not login_success:
            URL = input("enter url>")
            NAME = input("enter username>")

            login_success = connectToServer()

        enter_chat()


if __name__ == "__main__":
    main()

