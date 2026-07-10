from textual.app import App, ComposeResult
from textual.containers import Horizontal, Vertical
from textual.widgets import Header, Footer, Label, ListItem, ListView, ContentSwitcher
from textual.binding import Binding

from toolkit.modules import (
    DashboardModule, EncyclopediaModule, WindowsToolkitModule, 
    StorageNotesModule, UserManagementModule, SecurityModule, 
    FileFolderModule, NetworkingModule, DownloadsModule, SysInfoModule,
    DeveloperModule, ProductivityModule, QRModule, CleanupModule
)

class Sidebar(Vertical):
    def compose(self) -> ComposeResult:
        yield Label("Toolkit Modules", id="sidebar-title")
        yield ListView(
            ListItem(Label("Dashboard"), id="nav-dashboard"),
            ListItem(Label("Storage & Notes"), id="nav-storage"),
            ListItem(Label("Windows Toolkit"), id="nav-windows"),
            ListItem(Label("User Management"), id="nav-users"),
            ListItem(Label("Security"), id="nav-security"),
            ListItem(Label("Networking"), id="nav-network"),
            ListItem(Label("File & Folder"), id="nav-files"),
            ListItem(Label("Downloads"), id="nav-downloads"),
            ListItem(Label("Developer Toolkit"), id="nav-dev"),
            ListItem(Label("Productivity"), id="nav-productivity"),
            ListItem(Label("QR & Barcode"), id="nav-qr"),
            ListItem(Label("System Info"), id="nav-sysinfo"),
            ListItem(Label("Cleanup"), id="nav-cleanup"),
            ListItem(Label("Run Commands"), id="nav-commands"),
            ListItem(Label("Cloud Workspace"), id="nav-cloud"),
            ListItem(Label("AI Assistant"), id="nav-ai"),
            ListItem(Label("Settings"), id="nav-settings"),
            id="sidebar-list"
        )

class ContentArea(Vertical):
    def compose(self) -> ComposeResult:
        with ContentSwitcher(initial="module-dashboard", id="content-switcher"):
            yield DashboardModule(id="module-dashboard")
            yield StorageNotesModule(id="module-storage")
            yield WindowsToolkitModule(id="module-windows")
            yield UserManagementModule(id="module-users")
            yield SecurityModule(id="module-security")
            yield NetworkingModule(id="module-network")
            yield FileFolderModule(id="module-files")
            yield DownloadsModule(id="module-downloads")
            yield DeveloperModule(id="module-dev")
            yield ProductivityModule(id="module-productivity")
            yield QRModule(id="module-qr")
            yield SysInfoModule(id="module-sysinfo")
            yield CleanupModule(id="module-cleanup")
            yield EncyclopediaModule(id="module-commands")
            yield Label("Cloud Workspace - Coming Soon", id="module-cloud")
            yield Label("AI Assistant - Coming Soon", id="module-ai")
            yield Label("Settings - Coming Soon", id="module-settings")

class ToolkitApp(App):
    """The main application for Toolkit."""

    CSS_PATH = "ui/styles.tcss"
    
    BINDINGS = [
        Binding("ctrl+q", "quit", "Quit", show=True, priority=True),
        Binding("ctrl+p", "command_palette", "Commands", show=True),
        Binding("ctrl+s", "toggle_sidebar", "Toggle Sidebar", show=True),
    ]

    def compose(self) -> ComposeResult:
        yield Header()
        with Horizontal():
            yield Sidebar(id="sidebar")
            yield ContentArea(id="content")
        yield Footer()

    def action_toggle_sidebar(self) -> None:
        sidebar = self.query_one("#sidebar")
        if sidebar.has_class("-hidden"):
            sidebar.remove_class("-hidden")
        else:
            sidebar.add_class("-hidden")

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        """Handle sidebar navigation."""
        switcher = self.query_one(ContentSwitcher)
        item_id = event.item.id
        
        # Map nav-id to module-id
        if item_id and item_id.startswith("nav-"):
            module_id = item_id.replace("nav-", "module-")
            switcher.current = module_id
