from os import urandom


SECRET_KEY = urandom(24)
SQLALCHEMY_DATABASE_URI = "sqlite:///local/test/database.db"
SQLALCHEMY_TRACK_NOTIFICATIONS = True
MAX_CONTENT_LENGTH = 100 * 1024
