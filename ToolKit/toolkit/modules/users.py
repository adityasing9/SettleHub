import subprocess
import json
from textual.app import ComposeResult
from textual.containers import Vertical, Horizontal
from textual.widgets import Label, DataTable, Button, Static
from textual import work

class UserManagementModule(Vertical):
    """The User Management module for viewing local Windows users."""

    def compose(self) -> ComposeResult:
        yield Label("User Management", classes="module-title")
        yield DataTable(id="users-table")
        with Horizontal(id="users-actions"):
            yield Button("Refresh", id="btn-refresh-users", variant="primary")
            yield Static("Note: Modifying users requires Administrator privileges.", id="users-notice")

    def on_mount(self) -> None:
        table = self.query_one("#users-table", DataTable)
        table.add_columns("Name", "Enabled", "Description")
        table.cursor_type = "row"
        self.load_users()

    @work(thread=True)
    def load_users(self) -> None:
        """Fetch local users using PowerShell."""
        try:
            # Using PowerShell to get local users in JSON format
            cmd = ['powershell', '-NoProfile', '-Command', 
                   'Get-LocalUser | Select-Object Name, Enabled, Description | ConvertTo-Json -Compress']
            
            # Use CREATE_NO_WINDOW on Windows to prevent flashing console windows
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            
            result = subprocess.check_output(cmd, startupinfo=startupinfo, text=True, stderr=subprocess.DEVNULL)
            
            users = json.loads(result)
            
            # Convert single object to list if only one user exists
            if isinstance(users, dict):
                users = [users]
                
            self.app.call_from_thread(self.update_table, users)
        except Exception as e:
            # Fallback or error handling
            self.app.call_from_thread(self.update_table, [{"Name": "Error", "Enabled": False, "Description": str(e)}])

    def update_table(self, users: list) -> None:
        table = self.query_one("#users-table", DataTable)
        table.clear()
        for user in users:
            enabled = "Yes" if user.get("Enabled") else "No"
            table.add_row(user.get("Name", "Unknown"), enabled, user.get("Description", ""))

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "btn-refresh-users":
            table = self.query_one("#users-table", DataTable)
            table.clear()
            self.load_users()
