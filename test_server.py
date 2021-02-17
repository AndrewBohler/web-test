from flask import Flask, request
import os
from pathlib import Path
import json
import ssl
import time

log_file = Path("local/log.txt")

print("logging to", log_file)

if not os.path.exists(log_file):
    with open(log_file, "w") as file:
        current_time = time.strftime(r"%y-%m-%d %H:%M:%S")
        file.write(current_time + "log created\n")

app = Flask(__name__)


@app.route("/", methods=["POST", "GET"])
def index():
    current_time = time.strftime(r"%y-%m-%d %H:%M:%S")
    timestamp = f"[{current_time}]"
    if request.method == "GET":
        return "<h1>Hello from my test website!</h1><h4>How another header</h4><p>And maybe a paragraph...</p>"

    if request.method == "POST":
        try:
            print("Recieved POST, ", end="")
            req_json = json.loads(request.get_json())
            msg = req_json.get("message")
            if msg:
                with open(log_file, "a") as file:
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


if __name__ == "__main__":
    app.run(
        host="0.0.0.0", port=5000, threaded=True, debug=True
    )  # will listen on port 5000

