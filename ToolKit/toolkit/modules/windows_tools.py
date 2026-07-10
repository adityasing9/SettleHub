import platform
import subprocess
from textual.app import ComposeResult
from textual.containers import Vertical, Horizontal
from textual.widgets import Label, Button, Static, TabbedContent, TabPane
from textual import work

class WindowsToolkitModule(Vertical):
    """The Windows Toolkit module."""

    def compose(self) -> ComposeResult:
        yield Label("Windows Toolkit", classes="module-title")
        with TabbedContent():
            with TabPane("System Overview", id="win-overview"):
                yield Vertical(id="win-overview-container")
            with TabPane("Maintenance", id="win-maintenance"):
                yield Button("Run SFC Scan (System File Checker)", id="btn-sfc", variant="warning")
                yield Button("Check for Windows Updates", id="btn-wu", variant="primary")
                yield Static("", id="maintenance-output")

    def on_mount(self) -> None:
        self.load_overview()

    @work(thread=True)
    def load_overview(self) -> None:
        sys_info = platform.uname()
        # In a real app we'd use WMI or PowerShell to get deeper info
        try:
            # Get Windows Version via cmd
            cmd_output = subprocess.check_output('ver', shell=True, text=True).strip()
        except Exception:
            cmd_output = "Unknown"

        text = f"OS: {sys_info.system} {sys_info.release}\nNode: {sys_info.node}\nVersion: {cmd_output}\nArchitecture: {sys_info.machine}\nProcessor: {sys_info.processor}"
        self.app.call_from_thread(self.update_overview, text)

    def update_overview(self, text: str) -> None:
        container = self.query_one("#win-overview-container")
        container.mount(Static(text))

    def on_button_pressed(self, event: Button.Pressed) -> None:
        output = self.query_one("#maintenance-output", Static)
        if event.button.id == "btn-sfc":
            output.update("Note: SFC scan requires Administrator privileges.\nCommand: sfc /scannow")
        elif event.button.id == "btn-wu":
            output.update("Checking for updates via PowerShell...\n(Command: Get-WindowsUpdate)")
