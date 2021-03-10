from functools import singledispatchmethod
import colorama
from dataclasses import dataclass
from datetime import datetime
from typing import Callable, List, Optional, Type, Union
from flask import Flask, render_template, redirect, url_for
from flask.globals import request, session
from flask.helpers import flash
from flask_login import (
    LoginManager,
    current_user,
    login_required,
    login_user,
    logout_user,
)
from flask_socketio import SocketIO, emit, disconnect, join_room, send
from flask_wtf import FlaskForm
from functools import wraps
import json
import os
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from wtforms.widgets.html5 import EmailInput, URLInput

from . import forms
from .sql_models import db, User, Message

colorama.init()

app = Flask(__name__)
app.config.from_pyfile("config.py")

db.init_app(app)

login_manager = LoginManager(app)
login_manager.login_view = "login"

socketio = SocketIO(app)

DEBUG = os.environ.get("FLASK_DEBUG", False)
print("DEBUG:", DEBUG)


@dataclass
class OnlineUserState:
    _users_by_name = dict()
    _users_by_id = dict()
    _last_request_time = dict()

    def add_user(self, user: User):
        self._users_by_id[user.id] = user
        self._users_by_name[user.username] = user
        self._last_request_time[user.id] = datetime.utcnow()

    def remove_user(self, user: User):
        del self._users_by_id[user.id]
        del self._users_by_name[user.username]
        del self._last_request_time[user.id]

    @singledispatchmethod
    def lookup_user(self, user) -> User:
        raise TypeError(user)

    @lookup_user.register(int)
    def _lookup_by_id(self, user: int) -> User:
        return self._users_by_id.get(id, None)

    @lookup_user.register(str)
    def _lookup_by_name(self, user: str) -> User:
        return self._users_by_name.get(user, None)

    @singledispatchmethod
    def update_request_time(self, user, time=datetime.utcnow()) -> None:
        raise TypeError(user)

    @update_request_time.register
    def _(self, user: int, time=datetime.utcnow()) -> None:
        self._last_request_time[user] = time

    @update_request_time.register
    def _(self, user: str, time=datetime.utcnow()) -> None:
        user_id = self._by_username[user].id
        self._last_request_time[user_id] = time

    @singledispatchmethod
    def get_last_request_time(self, user) -> datetime:
        raise TypeError(user)

    @get_last_request_time.register
    def _(self, user: int) -> datetime:
        return self._last_request_time[user]

    @get_last_request_time.register
    def _(self, user: str) -> datetime:
        user_id = self._users_by_name[user].id
        return self._last_request_time[user_id]

    def get_users_by_name(self) -> List[User]:
        return self._users_by_name.values()


onlineUsers = OnlineUserState()


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


def flash_form_errors(form: FlaskForm):
    for field, errors in form.errors.items():
        for error in errors:
            flash(f"{field}: {error}")


def authentication_required(socket_func):
    @wraps(socket_func)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            disconnect()
        else:
            return socket_func(*args, **kwargs)

    return wrapper


@socketio.on("connect")
@authentication_required
def handle_connection():
    join_room("chat")
    emit("message", "you have connected", broadcast=False, room="chat")
    emit(
        "message",
        f"{current_user.username} has connected!",
        broadcast=True,
        include_self=False,
    )


@socketio.on("chat-message")
@authentication_required
def handle_message(data):
    text = data["text"]
    room = "chat"
    message = Message(text=text, datetime=datetime.utcnow(), user_id=current_user.id)
    db.session.add(message)
    db.session.commit()
    payload = {
        "time": datetime.strftime(message.datetime, r"%H:%M:%S"),
        "username": current_user.username,
        "text": text,
    }
    # payload = json.dumps(payload)
    emit("chat-message", payload, broadcast=True, include_self=True, room=room)


@socketio.on("disconnect")
def handle_disconnect():
    emit("message", "you have been disconnected", broadcast=False)
    emit(
        "message",
        f"{current_user.username} has disconnected",
        room="chat",
        broadcast=True,
    )
    disconnect()


app.add_template_filter(datetime.strftime)


@app.route("/")
def index():
    return render_template("test/index.html", title="Index")


@app.route("/login", methods=["GET", "POST"])
def login():
    form = forms.Login()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and check_password_hash(user.password, form.password.data):
            login_user(user)
            onlineUsers.add_user(user)
            flash("Login Success!", "success")
            return redirect(url_for("dashboard"))

        else:
            flash("username/password combination incorrect", "error")

    elif form.is_submitted():
        flash_form_errors(form)

    return render_template("test/login.html", title="Login", form=form)


@app.route("/logout")
@login_required
def logout():
    onlineUsers.remove_user(current_user)
    logout_user()
    return render_template("/test/logout.html")


@app.route("/signup", methods=["GET", "POST"])
def signup():
    form = forms.Signup()
    if form.validate_on_submit():
        hashed_password = generate_password_hash(form.password.data, "sha256")
        new_user = User(
            username=form.username.data,
            email=form.email.data,
            password=hashed_password,
        )
        db.session.add(new_user)
        db.session.commit()
        flash("User created!", "success")
        session["user_id"] = new_user.id
        return redirect(url_for("login")), 300

    elif form.is_submitted():
        flash_form_errors(form)

    return render_template("test/signup.html", title="Signup", form=form)


@app.route("/change_avatar", methods=["POST", "GET"])
@login_required
def change_avatar():
    form = forms.Avatar()
    if form.validate_on_submit():
        filename = secure_filename(form.avatar.data.filename)
        filename = f"user_{current_user.id}_avatar.{filename.split('.')[-1]}"
        form.avatar.data.save(f"static/avatars/{filename}")
        current_user.avatar_filename = filename

        db.session.commit()
        flash("changed avatar", "success")
        redirect(url_for("dashboard"))

    elif form.is_submitted():
        flash_form_errors(form)

    return render_template("test/change_avatar.html", form=form)


@app.route("/dashboard")
@login_required
def dashboard():
    return render_template("test/dashboard.html")


@app.route("/chat", methods=["POST", "GET"])
@login_required
def chat():
    form = forms.Chat()
    messages = Message.query.order_by("datetime").limit(100).all()
    return render_template(
        "test/chat.html",
        title="chat",
        form=form,
        messages=messages,
        online_users=[
            (user.username, str(user.id)) for user in onlineUsers.get_users_by_name()
        ],
    )


@app.route("/chat/messages")
@login_required
def chat_messages():
    last_seen = onlineUsers.get_last_request_time(current_user.id)
    messages = (
        Message.query.order_by(Message.datetime)
        .filter(Message.datetime > last_seen)
        .all()
    )
    resp = json.dumps(
        [
            (datetime.strftime(msg.datetime, r"%H:%M:%S"), msg.user.username, msg.text)
            for msg in messages
        ]
    )
    return resp


@app.route("/chat/post", methods=["POST"])
def chat_post():
    form = forms.Chat()
    if form.validate_on_submit():
        message = Message(
            text=form.message.data, datetime=datetime.utcnow(), user_id=current_user.id
        )
        db.session.add(message)
        db.session.commit()
    flash_form_errors(form)
    return redirect(url_for("chat"))


@app.route("/user/<user_id>/")
def user_avatar(user_id):
    user = User.query.filter(User.id == user_id).first()
    if not user:
        title = "invalid user"
    else:
        title = user.username

    return render_template("user_profile.html", title=title, user=user)


if __name__ == "__main__":
    socketio.run(debug=DEBUG, use_evalex=False)

