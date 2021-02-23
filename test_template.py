from flask import render_template, Flask
from pathlib import Path

# from app import app

extra_files = [file for file in Path("templates").rglob("*.html")]

app = Flask(__name__)

USERS = {
    "Bob": {"color": "blue", "name": "Bob"},
    "Steve": {"color": "red", "name": "Steve"},
}


@app.route("/")
@app.route("/index")
def index():
    user = {"username": "Miguel", "color": "blue"}
    messages = [
        {"user": USERS["Bob"], "content": "Beautiful day in Portland!"},
        {"user": USERS["Steve"], "content": "The Avengers movie was so cool!"},
    ]
    return render_template("messages.html", title="Home", user=user, messages=messages)


if __name__ == "__main__":
    app.run("0.0.0.0", 5001, debug=True, extra_files=extra_files)
