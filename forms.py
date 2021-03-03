from wtforms.validators import ValidationError
from chat_server import db
from typing import Optional, Union
from flask_wtf import FlaskForm
from flask_wtf.file import FileAllowed, FileField, FileRequired
from wtforms import StringField, PasswordField
from wtforms.fields.simple import TextField
from wtforms.validators import InputRequired, Length, EqualTo, ValidationError
from wtforms.fields.html5 import EmailField

from sql_models import User


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


class Login(FlaskForm):
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


class Signup(FlaskForm):
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


class Avatar(FlaskForm):
    avatar = FileField(
        "avatar",
        validators=[
            FileRequired(),
            FileAllowed(
                ["gif", "jpeg", "jpg", "png"], message="must be gif, jpeg, or png file"
            ),
        ],
    )


class Chat(FlaskForm):
    message = TextField(
        "message",
        validators=[
            InputRequired(),
            Length(min=1, max=2000, message="length cannot exceed 2000 characters"),
        ],
    )
