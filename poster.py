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
            payload = {"message": msg}
            r = requests.post(url=URL + "/chat", json=json.dumps(payload))
            r_json = r.json()
            success = "SUCCESS" if r_json.get("success") else "FAILURE"
            message = r_json.get("message", "")
            status = format_status_code(r.status_code)

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
        payload = {"request_type": "login", "username": NAME}
        print("requesting GET")
        resp = requests.get(url=URL + "/login", json=json.dumps(payload))
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


def listen_to_chat():
    payload = json.dumps({})
    resp = requests.get(url=URL + "/chat", json=payload)


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

