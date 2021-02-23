from typing import Callable, Optional

DEBUG = True


def test(except_class):
    if DEBUG:
        try:
            raise except_class
        except except_class as e:
            print(f"{except_class!s:<40}: {e}")
    return except_class


@test
class ChatException(Exception):
    def __init__(self, *, reason: Optional[str] = None, **kwargs):
        self.reason = reason

    def __str__(self) -> str:
        return self.reason or "a chat exception occured"


@test
class ChatDisconnect(ChatException):
    def __str__(self) -> str:
        return self.reason or "disconnect"


@test
class ChatExit(ChatException):
    def __str__(self) -> str:
        return self.reason or "exit chat"


@test
class ChatInvalidArgument(ChatException):
    def __init__(
        self, command: Optional[Callable] = None, arg: Optional[str] = None, **kwargs
    ):
        self.command = command
        self.arg = arg
        super().__init__(**kwargs)

    def __str__(self):
        if self.command:
            name = getattr(self.command, "name", self.command.__name__)

            if self.arg:
                return f'"{self.arg}" is not a valid argument for "{name}"'
            else:
                return f'invalid argument provided to "{name}"'
        else:
            return "invalid argument"


@test
class ChatInvalidCommand(ChatException):
    def __init__(self, *, invalid_name: Optional[str] = None, **kwargs):
        self.invalid_name = invalid_name
        super().__init__(**kwargs)

    def __str__(self) -> str:
        if self.invalid_name:
            return f'"{self.invalid_name}" is not a valid command'
        else:
            return "invalid command"


@test
class ChatMissingArgument(ChatException):
    def __init__(
        self,
        *,
        command: Optional[Callable] = None,
        required: Optional[str] = None,
        **kwargs,
    ):
        self.command = command
        self.required = required
        super().__init__(**kwargs)

    def __str__(self) -> str:
        if self.command:
            name = getattr(self.command, "name", self.command.__name__)
            return f'"{name}" missing required argument {f"<{self.required}>" if self.required else ""}'
        else:
            return f"command missing required argument"

