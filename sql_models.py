from colorama import Fore, Back
from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


class User(UserMixin, db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(15), unique=True)
    email = db.Column(db.String(50), unique=True)
    password = db.Column(db.String(80))
    avatar_filename = db.Column(db.String(30))

    def __repr__(self):
        return f'{Back.LIGHTCYAN_EX}<{Fore.MAGENTA}user: {Fore.RED}{self.id} {Fore.YELLOW}user={Fore.GREEN}"{self.username}"{Fore.RESET}>{Back.RESET}'


class Message(db.Model):
    __tablename__ = "messages"
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text)
    datetime = db.Column(db.DateTime, nullable=False)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    user = db.relationship("User", backref="messages")
