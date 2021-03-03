import colorama
from datetime import datetime
from typing import Callable, Optional, Union
from flask import Flask, render_template, redirect, url_for
from flask.globals import request, session
from flask.helpers import flash
from flask_login import (
    LoginManager,
    UserMixin,
    current_user,
    login_required,
    login_user,
    logout_user,
)
from flask_wtf import FlaskForm
import os
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from wtforms.widgets.html5 import EmailInput, URLInput

import forms
from sql_models import db, User, Message

colorama.init()

app = Flask(__name__)
app.config.from_pyfile("config.py")

db.init_app(app)

login_manager = LoginManager(app)
login_manager.login_view = "login"

DEBUG = os.environ.get("FLASK_DEBUG", False)
print("DEBUG:", DEBUG)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


def flash_form_errors(form: FlaskForm):
    for field, errors in form.errors.items():
        for error in errors:
            flash(f"{field}: {error}")


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
    return render_template("test/chat.html", title="chat", form=form, messages=messages)


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


if __name__ == "__main__":
    app.run(debug=DEBUG, use_evalex=False)

