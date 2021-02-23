from flask_wtf import FlaskForm
from wtforms import StringField
from wtforms.validators import DataRequired


class MyForm(FlaskForm):
    name = StringField("name", validators=[DataRequired()])


if __name__ == "__main__":
    print("uhhh, no errors?")
