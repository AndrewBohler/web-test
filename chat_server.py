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
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import FlaskForm
from flask_wtf.file import FileField
from flask_wtf.file import FileAllowed, FileRequired
import os
from werkzeug.utils import secure_filename
from wtforms import StringField, PasswordField, BooleanField
from wtforms import validators
from wtforms.fields.simple import TextAreaField, TextField
from wtforms.validators import InputRequired, Length, EqualTo, ValidationError
from wtforms.fields.html5 import EmailField, URLField
from werkzeug.security import generate_password_hash, check_password_hash

import colorama
from colorama import Fore
from wtforms.widgets.html5 import EmailInput, URLInput

colorama.init()

app = Flask(__name__)
app.config.from_pyfile("config.py")
db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = "login"

DEBUG = os.environ.get("FLASK_DEBUG", False)
print("DEBUG:", DEBUG)


class User(UserMixin, db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(15), unique=True)
    email = db.Column(db.String(50), unique=True)
    password = db.Column(db.String(80))
    avatar_filename = db.Column(db.String(30))

    def __repr__(self):
        return f'{colorama.Back.LIGHTCYAN_EX}<{Fore.MAGENTA}user: {Fore.RED}{self.id} {Fore.YELLOW}user={Fore.GREEN}"{self.username}"{Fore.RESET}>{colorama.Back.RESET}'


class Message(db.Model):
    __tablename__ = "messages"
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text)
    datetime = db.Column(db.DateTime, nullable=False)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    user = db.relationship("User", backref="messages")


db.create_all()
db.session.commit()


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


class CustomValidator:
    def UniqueEntry(
        table: "db.Model",
        column: Union["db.Column", str],
        message: Optional[str] = None,
    ):
        if type(column) is str:
            column = getattr(table, column, None)
        if not column:
            raise ValueError(f"{column} is not a column in {table}")

        def _validator(form, field):
            if table.query.filter(column == field.data).first():
                if not message:
                    raise ValidationError(f"{field.name} already exists")
                raise ValidationError(message)

        return _validator


class LoginForm(FlaskForm):
    username = StringField(
        "username",
        [
            InputRequired("enter username"),
            Length(min=4, max=15, message="must be between 4 and 15 characters"),
        ],
    )
    password = PasswordField(
        "password",
        [
            InputRequired("enter password"),
            Length(min=8, max=80, message="must be bewteen 8 and 80 characters"),
        ],
    )


class SignupForm(FlaskForm):
    email = EmailField(
        "email",
        [
            InputRequired("required"),
            Length(max=80, message="too long, max length is 40"),
            CustomValidator.UniqueEntry(User, "email", "address already in use"),
        ],
    )
    username = StringField(
        "username",
        [
            InputRequired("required"),
            Length(min=4, max=15, message="must be between 4 and 15 characters"),
            CustomValidator.UniqueEntry(User, User.username, "already in use"),
        ],
    )
    password = PasswordField(
        "password",
        [
            InputRequired("required"),
            Length(min=8, max=80, message="must be bewteen 8 and 80 characters"),
        ],
    )
    confirm = PasswordField(
        "confirmation",
        [
            InputRequired("required"),
            EqualTo("password", message="doesn't match password"),
        ],
    )


class AvatarForm(FlaskForm):
    avatar = FileField(
        "avatar",
        validators=[
            FileRequired(),
            FileAllowed(
                ["gif", "jpeg", "jpg", "png"], message="must be gif, jpeg, or png file"
            ),
        ],
    )


class ChatForm(FlaskForm):
    message = TextField(
        "message",
        validators=[
            InputRequired(),
            Length(min=1, max=2000, message="length cannot exceed 2000 characters"),
        ],
    )


def flash_form_errors(form: FlaskForm):
    for field, errors in form.errors.items():
        for error in errors:
            flash(f"{field}: {error}")


@app.route("/")
def index():
    return render_template("test/index.html", title="Index")


@app.route("/login", methods=["GET", "POST"])
def login():
    form = LoginForm()
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
    form = SignupForm()
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
    form = AvatarForm()
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
    form = ChatForm()
    if form.validate_on_submit():
        message = Message(
            text=form.message.data, datetime=datetime.utcnow(), user_id=current_user.id
        )
        db.session.add(message)
        db.session.commit()
        redirect(url_for("chat"))

    messages = Message.query.order_by("datetime").limit(100).all()
    return render_template("test/chat.html", title="chat", form=form, messages=messages)


if __name__ == "__main__":
    app.run(debug=DEBUG, use_evalex=False)

