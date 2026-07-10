import os
import qrcode
from textual.app import ComposeResult
from textual.containers import Vertical, Horizontal
from textual.widgets import Label, Button, Input, Static
from textual import work

class QRModule(Vertical):
    """The QR & Barcode module."""

    def compose(self) -> ComposeResult:
        yield Label("QR Code Generator", classes="module-title")
        
        with Horizontal(id="qr-input-row"):
            yield Input(placeholder="Enter Text or URL to encode", id="qr-input")
            yield Button("Generate QR Code", id="btn-gen-qr", variant="primary")
            
        yield Static("", id="qr-output", classes="terminal-output")

    @work(thread=True)
    def generate_qr(self, data: str) -> None:
        try:
            desktop = os.path.join(os.path.expanduser("~"), "Desktop")
            # Create a safe filename
            safe_name = "".join([c if c.isalnum() else "_" for c in data[:10]])
            filepath = os.path.join(desktop, f"qrcode_{safe_name}.png")
            
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(data)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            img.save(filepath)
            
            self.app.call_from_thread(self.update_output, f"Successfully generated QR code.\nSaved to: {filepath}")
        except Exception as e:
            self.app.call_from_thread(self.update_output, f"Failed to generate QR code: {str(e)}")

    def update_output(self, text: str) -> None:
        self.query_one("#qr-output", Static).update(text)

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "btn-gen-qr":
            data = self.query_one("#qr-input", Input).value.strip()
            if data:
                self.query_one("#qr-output", Static).update("Generating...")
                self.generate_qr(data)
