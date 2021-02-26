from collections import deque
from datetime import datetime
from enum import unique
import flask
from flask import abort, Flask, jsonify, render_template, request, redirect
from flask.globals import session
from flask_login import LoginManager, login_user, UserMixin, current_user
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import FlaskForm
import os
from sqlalchemy.orm import backref
from wtforms import StringField, PasswordField
from wtforms.validators import InputRequired, Length, EqualTo
import random
import time
from typing import Deque, Dict, NamedTuple, Tuple, Type


app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ["SECRET_KEY"]
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///local/database.db"

db = SQLAlchemy(app)


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    password = db.Column(db.String(80), nullable=False)
    color = db.Column(db.String(6))


class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String, nullable=False)
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow())

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    user = db.relationship("User", backref=db.backref("messages"))


db.create_all()


class LoginForm(FlaskForm):
    username = StringField(
        "username", validators=[InputRequired("username"), Length(min=4, max=20)]
    )
    password = PasswordField(
        "password", validators=[InputRequired("password"), Length(min=8, max=80)]
    )


class SignupForm(FlaskForm):
    username = StringField(
        "username",
        validators=[
            InputRequired("username"),
            Length(
                min=4,
                max=20,
                message="username length must be between 4 and 20 characters",
            ),
        ],
    )
    password = PasswordField(
        "password",
        validators=[
            InputRequired("password"),
            Length(
                min=8,
                max=80,
                message="passord length must be between 8 and 80 characters long",
            ),
        ],
    )
    confirmation = PasswordField(
        "password", validators=[EqualTo("password", "confirmation does not match")]
    )


class MessageForm(FlaskForm):
    message = StringField("message", validators=[InputRequired(), Length(max=1000)])


Token = Type[str]

CHAT: Deque[Message] = deque(maxlen=1000)
USERS: Dict[int, User] = dict()

# debug ##########################################
def default_users_and_messages():
    # for id, color, name in zip(
    #     [1, 2, 3, 4, 5],
    #     ["ff5555", "55ff55", "77a3d4", "0033aa", "123455"],
    #     ["Dave", "Jim", "Sadiq", "Jose", "Richard"],
    # ):
    #     db.session.add(User(id=id, username=name, password="12345678", color=color))
    # db.session.commit()

    # quick and dirty (and bad) sentence generator

    adjectives = """
    cool good foreign universal persistent insane callous insensitive
    marginal kind blue green yellow red maroon purple pink orange pleasent
    """.replace(
        "\n", " "
    ).split(
        " "
    )

    nouns = """
    I it stuff sun cost that leaf leaves tree trend key time place
    seat chair bench wood lisp quest tempest request wench pirate
    bay lagoon moon Bitcoin Dogecoin Etherium ether void concept sense
    """.replace(
        "\n", " "
    ).split(
        " "
    )

    verbs_now = """
    using becoming running leaving trending meaning unquestioning requesting
    blazing condeming pleasing leaning removing attacking freaking testing
    sunning frequenting screening ramming blunting clasping frisking 
    """.replace(
        "\n", " "
    ).split(
        " "
    )
    users = db.session.query(User).all()
    for _ in range(200):
        user = random.choice(users)
        sentence = " ".join(
            [
                random.choice(nouns),
                random.choice(
                    [
                        "wants to",
                        "was " + random.choice(verbs_now) + " and",
                        "is",
                        "probably will be",
                    ]
                ),
                random.choice(verbs_now),
                random.choice("with or at and for".split(" ")),
                random.choice(nouns),
                random.choice(["", "and " + random.choice(nouns)]),
                random.choice(
                    "today yesterday now tomorrow later early before".split(" ")
                ),
                random.choice(nouns),
            ]
        ).replace("  ", " ")
        time.sleep(random.randint(1, 3) / 10)
        message = Message(content=sentence, user=user)
        db.session.add(message)
    db.session.commit()


# end debug ######################################

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
                print("found user!")
                current_user = user
                break

        if current_user and login_user(current_user):
            flask.flash("Logged in successfully.")
            return flask.redirect(flask.url_for("index"))

        else:
            print("could not find user...")
            flask.flash("user does not exist")
            return render_template("login.html", form=form), 400

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
        {"time": m.datetime, "user": m.user, "content": m.content}
        for m in db.session.query(Message).order_by(Message.date).limit(1000).all()
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
            messages=db.session.query(Message).order_by(Message.date).limit(1000).all(),
            users=db.session.query(User).all(),
            # user=current_user,
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
