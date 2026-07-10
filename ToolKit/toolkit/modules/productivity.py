import uuid
import string
import random
from textual.app import ComposeResult
from textual.containers import Vertical, Horizontal
from textual.widgets import Label, Button, Input

class ProductivityModule(Vertical):
    """The Productivity module."""

    def compose(self) -> ComposeResult:
        yield Label("Productivity Tools", classes="module-title")
        
        yield Label("Password Generator", classes="section-label")
        with Horizontal(id="password-gen-row"):
            yield Button("Generate Password", id="btn-gen-pass", variant="primary")
            yield Input(value="", id="pass-output", read_only=True)
            
        yield Label("UUID Generator", classes="section-label")
        with Horizontal(id="uuid-gen-row"):
            yield Button("Generate UUID (v4)", id="btn-gen-uuid", variant="primary")
            yield Input(value="", id="uuid-output", read_only=True)

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "btn-gen-pass":
            chars = string.ascii_letters + string.digits + "!@#$%^&*()"
            password = ''.join(random.choice(chars) for _ in range(16))
            self.query_one("#pass-output", Input).value = password
        elif event.button.id == "btn-gen-uuid":
            new_uuid = str(uuid.uuid4())
            self.query_one("#uuid-output", Input).value = new_uuid
