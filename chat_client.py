import click
from flask import Flask, request
import json
from pathlib import Path
import requests
import threading
import time

from typing import Callable, Dict, List, Optional, Type

from requests import exceptions
from requests.packages.urllib3.exceptions import HTTPError

import error


URL_t = Type[str]
NAME = ""
CHAT_COMMANDS: Dict[str, Callable] = dict()


def handleChatCommand(line: str):
    if len(line) < 2:
        raise error.ChatInvalidCommand(reason="no command given")
    command, *args = line[1:].split(" ")
    cmd = CHAT_COMMANDS.get(command, None)
    if cmd is None:
        raise error.ChatInvalidCommand(invalid_name=command)
    cmd(*args)


def chatCommand(
    command: Callable = None,
    *,
    name: str = "",
    help: str = "",
    syntax: str = "",
    arguments: List[str] = None,
):
    def register(command):
        nonlocal name
        if not name:
            name = command.__name__
        CHAT_COMMANDS[name] = command

        command._help = help
        command._syntax = syntax
        command._arguments = arguments
        print("registered", name, "as a chat command")

    def decorator(command: Callable):
        register(command)
        return command

    if command is None:
        return decorator
    else:
        register(command)
        return command


@chatCommand(name="exit")
def exitChat(*args) -> None:
    "exit the chat"
    if args:
        raise error.ChatInvalidArgument
    else:
        raise error.ChatExit


@chatCommand(arguments=["resource messages users"])
def get(resource: str = None) -> None:
    "get <resource> from the server"
    if not resource:
        raise error.ChatMissingArgument

    resp = requests.get(url=URL + "/chat", json={"token": TOKEN, "get": "messages"})
    resp.raise_for_status()
    resp = resp.json()
    if resp is not dict:
        raise error.ChatException("expected a dict type json")

    messages = resp.get("messages", [])

    if not messages:
        print("there are no new messages")

    for message in messages:
        tm = message.get("time", None)
        if tm is float:
            tm = time.strftime(tm)
        else:
            tm = ""

        print("[" + tm + "]", message.get("user", ""), ">", message.get("content", ""))


@chatCommand(name="help")
def chatHelp(*args: List[str]) -> None:
    "print this help message"
    if not args:
        print("use '/' to invoke commands")
        print("command list:")
        for name, command in CHAT_COMMANDS.items():
            print(f"\t{name:<20}: {command.__doc__}")
        return

    cmd_name = args[0]
    cmd = CHAT_COMMANDS.get(cmd_name, None)
    if cmd is None:
        print(
            f'"{cmd_name}" is not a valid command,'
            "type /help to view list of valid commands"
        )
        return

    if len(args) > 1:
        subcommands = [subcommand for subcommand in args[1:]]

    else:
        text = getattr(cmd, "_help", cmd.__doc__)
        print(f"{cmd_name}: {text}")


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
            msg = input(f'[{status:>3}]{click.style(NAME, fg="yellow", bold=True)}>')

            if not msg:
                status = ""
                continue

            elif msg[0] == "/":
                handleChatCommand(msg)

            msg = msg.replace("\\n", "\n")
            payload = {"token": TOKEN, "message": msg}
            resp = requests.post(url=URL + "/chat", json=payload)
            resp.raise_for_status()
            status = format_status_code(resp.status_code)

        except error.ChatExit as e:
            print(e)
            break

        except error.ChatException as e:
            print(e)
            status = ""
            continue

        except HTTPError as e:
            print(e)

            if (resp_json := resp.json()) is not dict:
                raise error.ChatDisconnect(reason="expected response json to be a dict")

            elif resp_json:
                print(resp_json)


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

