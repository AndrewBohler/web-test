from collections import deque
import flask
from flask import abort, Flask, jsonify, render_template, request, redirect
from flask import json
from flask.globals import session
from flask_login import LoginManager, login_user, UserMixin, current_user
from flask_wtf import FlaskForm
import os
from wtforms import StringField, PasswordField
import wtforms
from wtforms.validators import DataRequired
import random
import time
from typing import Deque, Dict, NamedTuple, Tuple, Type


class User(UserMixin):
    def __init__(self, id: int, username: str, color: str = "cccccc"):
        self.id = id
        self.username = username
        self.color = color
        self.time = time.gmtime()


class Message(NamedTuple):
    content: str
    user: User
    gmtime: time.struct_time = time.gmtime()


class LoginForm(FlaskForm):
    username = StringField("username")
    password = PasswordField("password")


class SignupForm(FlaskForm):
    username = StringField("enter username")
    password = PasswordField("enter password")
    confirmation = PasswordField("confirm password")


class MessageForm(FlaskForm):
    message = StringField("message")


UCOUNT = 0


def create_user(form: SignupForm) -> User:
    global UCOUNT
    user = User(UCOUNT, form.username.data)
    UCOUNT += 1
    return user


Token = Type[str]

CHAT: Deque[Message] = deque(maxlen=1000)
USERS: Dict[int, User] = dict()

# debug ##########################################
def default_users_and_messages():
    for id, color, name in zip(
        [1, 2, 3, 4, 5],
        ["ff5555", "55ff55", "77a3d4", "0033aa", "123455"],
        ["Dave", "Jim", "Sadiq", "Jose", "Richard"],
    ):
        USERS[id] = User(id=id, username=name, color=color)

    current_time = time.time()
    for _ in range(200):
        user = random.choice(list(USERS.values()))
        current_time += random.uniform(0.25, 100.0)
        tm = time.gmtime(current_time)
        message = Message("You wut mate!?!?", user, tm)
        CHAT.append(message)


default_users_and_messages()
# end debug ######################################


app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ["SECRET_KEY"]

login_manager = LoginManager()
login_manager.init_app(app)


@login_manager.user_loader
def load_user(user_id: int):
    return USERS.get(user_id)


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


@app.template_filter()
def strftime(tm):
    return time.strftime(r"%y-%m-%d %H:%M:%S", tm)


@app.route("/login", methods=["GET", "POST"])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        current_user = None
        for user in USERS.values():
            if user.username == form.username.data:
                current_user = user
                login_user(user)
                flask.flash("Logged in successfully.")

        if not current_user:
            flask.flash("user does not exist")
            return render_template("login.html", form=form), 400

        return flask.redirect(flask.url_for("webclient"))
    return flask.render_template("login.html", form=form, title="login page")


@app.route("/signup", methods=["GET", "POST"])
def signup():
    form = SignupForm()
    if form.validate_on_submit():
        user = create_user(form)
        flask.flash("User created!")
        return flask.redirect(flask.url_for("login"))
    return render_template("signup.html", form=form, title="signup page")


@app.route("/chat/messages.json")
def get_messages():
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

    messages = [
        {"time": m.time, "user": m.user, "content": m.content}
        for m in list(CHAT)
        if m.time > user.time
    ]
    user.time = time.gmtime()
    return jsonify(messages=messages), 200


@app.route("/chat", methods=["POST", "GET"])
def chat():
    if request.method == "GET":
        return redirect("/chat/messages.json", code=307)

    elif request.method == "POST":
        req = request.json

        token = req.get("token", None)
        if not token:
            abort(400, description="must provide token")

        message = req.get("message", None)
        if not message:
            abort(400, description="must provide message")

        elif type(message) is not str:
            abort(400, description="message must be a string")

        user = USERS.get(token, None)
        if not user:
            abort(400, "invalid token")

        CHAT.append(Message(message, user.name, time.gmtime()))

        return {}, 204


@app.route("/chat/webclient", methods=["POST", "GET"])
def webclient():

    servername = "meh serva bruv"
    if request.method == "GET":
        return render_template(
            "webclient.html",
            title="web client chat",
            servername=servername,
            messages=CHAT,
            users=USERS,
            user=current_user,
        )

    elif request.method == "POST":
        abort(400)


@app.route("/index")
@app.route("/", methods=["POST", "GET"])
def index():
    if request.method == "GET":
        return render_template("site.html", title=__file__)

    elif request.method == "POST":
        req = request.json
        if type(req) is not dict:
            abort(400, description="request not understood")

        msg = req.get("message", None)
        if not msg:
            abort(
                400,
                "well you didn't provide a message, "
                "but I would have thrown it away anyways!",
            )

        return jsonify(message="message recieved, throwing into the trash now")


def main(*args, **kwargs):
    app.run(
        host="0.0.0.0", port=5000, threaded=True, debug=True
    )  # will listen on port 5000


if __name__ == "__main__":
    main()
