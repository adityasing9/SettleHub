import subprocess
from textual.app import ComposeResult
from textual.containers import Vertical, Horizontal
from textual.widgets import Label, Button, Static

class CleanupModule(Vertical):
    """The Cleanup & Maintenance module."""

    def compose(self) -> ComposeResult:
        yield Label("Cleanup & Maintenance", classes="module-title")
        
        yield Label("Quick Actions", classes="section-label")
        with Horizontal(id="cleanup-actions"):
            yield Button("Open Disk Cleanup", id="btn-disk-cleanup", variant="primary")
            yield Button("Clear DNS Cache", id="btn-dns-flush", variant="warning")
            yield Button("Empty Recycle Bin", id="btn-empty-bin", variant="error")
            
        yield Static("", id="cleanup-output", classes="terminal-output")

    def update_output(self, text: str) -> None:
        self.query_one("#cleanup-output", Static).update(text)

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "btn-disk-cleanup":
            subprocess.Popen(['cleanmgr'], shell=True)
            self.update_output("Launched Windows Disk Cleanup tool.")
        elif event.button.id == "btn-dns-flush":
            try:
                subprocess.check_output(['ipconfig', '/flushdns'], shell=True)
                self.update_output("Successfully flushed the DNS Resolver Cache.")
            except Exception as e:
                self.update_output(f"Failed to flush DNS cache: {str(e)}")
        elif event.button.id == "btn-empty-bin":
            try:
                # Use PowerShell to empty recycle bin with confirmation
                cmd = ['powershell', '-NoProfile', '-Command', 'Clear-RecycleBin -Force']
                subprocess.check_output(cmd, shell=True)
                self.update_output("Recycle Bin emptied successfully.")
            except Exception as e:
                self.update_output(f"Failed to empty Recycle Bin.\nError: {str(e)}")
