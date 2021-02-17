from flask import Flask, request
import os
from pathlib import Path
import json
import ssl
import time

# directory = Path("C:/Users/drewb/Downloads")
filename = Path("payload.txt")

# incoming_payload_file = directory / filename
incoming_payload_file = filename
print(incoming_payload_file)

if not os.path.exists(incoming_payload_file):
    with open(incoming_payload_file, "w") as file:
        file.write("# start of file\n")

app = Flask(__name__)


@app.route("/", methods=["POST", "GET"])
def index():
    current_time = time.strftime(r"%y-%m-%d %H:%M:%S")
    timestamp = f"[{current_time}]"
    if request.method == "GET":
        return "<h1>Hello from Webhook Listener!</h1><h4>Josh is man!!!</h4><p>This is some stuff that I am writing for fun</p>"

    if request.method == "POST":
        try:
            print("Recieved POST, ", end="")
            req_json = json.loads(request.get_json())
            msg = req_json.get("message")
            if msg:
                with open(incoming_payload_file, "a") as file:
                    print("writing:", msg)
                    file.write(timestamp)
                    file.write(msg)
                    file.write("\n")
            else:
                print("no message to write")

        except TypeError as error:
            print(error)
            return '{"success":"false", "message":"You suck"}'

        return r'{"success":"true", "other":{"thing1":"something", "thing2":"something else"}}'


def main(*args, **kwargs):
    for arg in args:
        print(arg)

    for kwarg in kwargs:
        print(kwarg)


if __name__ == "__main__":
    app.run(
        host="0.0.0.0", port=5000, threaded=True, debug=True
    )  # will listen on port 5000

