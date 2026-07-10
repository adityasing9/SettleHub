import subprocess
import requests
import socket
from textual.app import ComposeResult
from textual.containers import Vertical, Horizontal
from textual.widgets import Label, Button, Static, Input
from textual import work

class NetworkingModule(Vertical):
    """The Networking module."""

    def compose(self) -> ComposeResult:
        yield Label("Networking Dashboard", classes="module-title")
        
        with Horizontal(id="network-actions"):
            yield Button("Get IPs", id="btn-net-ips", variant="primary")
            
        yield Static("", id="network-ip-output")
        
        yield Label("Ping Utility", classes="section-label")
        with Horizontal(id="ping-input-row"):
            yield Input(placeholder="Enter IP or Domain (e.g. google.com)", id="ping-input")
            yield Button("Ping", id="btn-net-ping", variant="success")
            
        yield Static("", id="network-ping-output", classes="terminal-output")

    @work(thread=True)
    def fetch_ips(self) -> None:
        self.app.call_from_thread(self.update_ip_output, "Fetching IPs...")
        
        try:
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)
        except Exception:
            local_ip = "Unknown"
            
        try:
            public_ip = requests.get('https://api.ipify.org', timeout=5).text
        except Exception:
            public_ip = "Unavailable (Check internet connection)"

        text = f"Hostname: {hostname}\nLocal IP: {local_ip}\nPublic IP: {public_ip}"
        self.app.call_from_thread(self.update_ip_output, text)

    def update_ip_output(self, text: str) -> None:
        self.query_one("#network-ip-output", Static).update(text)

    @work(thread=True)
    def run_ping(self, target: str) -> None:
        self.app.call_from_thread(self.update_ping_output, f"Pinging {target}...")
        try:
            # -n 4 is for Windows ping (count)
            result = subprocess.check_output(['ping', '-n', '4', target], text=True, stderr=subprocess.STDOUT)
            self.app.call_from_thread(self.update_ping_output, result)
        except subprocess.CalledProcessError as e:
            self.app.call_from_thread(self.update_ping_output, e.output)
        except Exception as e:
            self.app.call_from_thread(self.update_ping_output, f"Error: {str(e)}")

    def update_ping_output(self, text: str) -> None:
        self.query_one("#network-ping-output", Static).update(text)

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "btn-net-ips":
            self.fetch_ips()
        elif event.button.id == "btn-net-ping":
            target = self.query_one("#ping-input", Input).value.strip()
            if target:
                self.run_ping(target)
