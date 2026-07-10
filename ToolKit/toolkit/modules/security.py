import subprocess
from textual.app import ComposeResult
from textual.containers import Vertical, Horizontal
from textual.widgets import Label, Button, Static, TabbedContent, TabPane
from textual import work

class SecurityModule(Vertical):
    """The Security module for Defender and Firewall."""

    def compose(self) -> ComposeResult:
        yield Label("Security Dashboard", classes="module-title")
        
        with TabbedContent():
            with TabPane("Windows Defender", id="sec-defender"):
                yield Button("Refresh Defender Status", id="btn-defender-refresh", variant="primary")
                yield Static("Loading Defender Status...", id="defender-status")
                
            with TabPane("Firewall & Network", id="sec-firewall"):
                yield Static("Quick Actions:", classes="section-label")
                with Horizontal():
                    yield Button("Open Firewall Settings", id="btn-fw-open", variant="success")
                    yield Button("Advanced Firewall", id="btn-fw-advanced", variant="warning")
                yield Static("", id="firewall-output")

    def on_mount(self) -> None:
        self.load_defender_status()

    @work(thread=True)
    def load_defender_status(self) -> None:
        """Fetch Windows Defender status using PowerShell."""
        try:
            cmd = ['powershell', '-NoProfile', '-Command', 
                   'Get-MpComputerStatus | Select-Object AMServiceEnabled, AntivirusEnabled, RealTimeProtectionEnabled | ConvertTo-Json -Compress']
            
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            
            result = subprocess.check_output(cmd, startupinfo=startupinfo, text=True, stderr=subprocess.DEVNULL)
            
            import json
            status = json.loads(result)
            
            text = (
                f"Antivirus Service Enabled: {status.get('AMServiceEnabled')}\n"
                f"Antivirus Enabled: {status.get('AntivirusEnabled')}\n"
                f"Real-Time Protection: {status.get('RealTimeProtectionEnabled')}\n"
            )
            self.app.call_from_thread(self.update_defender_ui, text)
        except Exception as e:
            self.app.call_from_thread(self.update_defender_ui, f"Failed to get Defender status.\n(Requires PowerShell or elevated privileges)\nError: {str(e)}")

    def update_defender_ui(self, text: str) -> None:
        self.query_one("#defender-status", Static).update(text)

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "btn-defender-refresh":
            self.query_one("#defender-status", Static).update("Loading...")
            self.load_defender_status()
        elif event.button.id == "btn-fw-open":
            subprocess.Popen(['control', 'firewall.cpl'], shell=True)
            self.query_one("#firewall-output", Static).update("Opened Windows Firewall settings.")
        elif event.button.id == "btn-fw-advanced":
            subprocess.Popen(['mmc', 'wf.msc'], shell=True)
            self.query_one("#firewall-output", Static).update("Opened Windows Defender Firewall with Advanced Security.")
