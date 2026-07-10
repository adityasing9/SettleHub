import shutil
from textual.app import ComposeResult
from textual.containers import Vertical
from textual.widgets import Label, DataTable
from textual import work

class DeveloperModule(Vertical):
    """The Developer Toolkit module."""

    def compose(self) -> ComposeResult:
        yield Label("Developer Toolkit", classes="module-title")
        yield Label("Environment Checker", classes="section-label")
        yield DataTable(id="dev-tools-table")

    def on_mount(self) -> None:
        table = self.query_one("#dev-tools-table", DataTable)
        table.add_columns("Tool", "Installed", "Path")
        table.cursor_type = "row"
        self.check_tools()

    @work(thread=True)
    def check_tools(self) -> None:
        tools = ["git", "docker", "node", "python", "java", "rustc", "go", "flutter", "adb"]
        
        results = []
        for tool in tools:
            path = shutil.which(tool)
            installed = "Yes" if path else "No"
            display_path = path if path else "Not Found"
            results.append((tool.capitalize(), installed, display_path))
            
        self.app.call_from_thread(self.update_table, results)

    def update_table(self, results: list) -> None:
        table = self.query_one("#dev-tools-table", DataTable)
        table.clear()
        for row in results:
            table.add_row(*row)
