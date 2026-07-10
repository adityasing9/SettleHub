from textual.app import ComposeResult
from textual.containers import Vertical, Horizontal
from textual.widgets import Label, Input, DataTable
from textual import work

from toolkit.db import get_connection

class EncyclopediaModule(Vertical):
    """The Run Commands Encyclopedia module."""

    def compose(self) -> ComposeResult:
        yield Label("Run Commands Encyclopedia", id="encyclopedia-title", classes="module-title")
        yield Input(placeholder="Search commands, descriptions, or categories...", id="encyclopedia-search")
        yield DataTable(id="encyclopedia-table")

    def on_mount(self) -> None:
        table = self.query_one(DataTable)
        table.add_columns("Name", "Command", "Category", "Risk", "Description")
        table.cursor_type = "row"
        self.load_commands()

    @work(thread=True)
    def load_commands(self, search_term: str = "") -> None:
        """Load commands from the database and populate the table."""
        conn = get_connection()
        cursor = conn.cursor()
        
        query = "SELECT name, command, category, risk_level, description FROM commands"
        params = ()
        
        if search_term:
            query += " WHERE name LIKE ? OR command LIKE ? OR description LIKE ? OR category LIKE ?"
            like_term = f"%{search_term}%"
            params = (like_term, like_term, like_term, like_term)
            
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        # Update UI from the main thread
        self.app.call_from_thread(self.update_table, rows)

    def update_table(self, rows: list) -> None:
        table = self.query_one(DataTable)
        table.clear()
        for row in rows:
            table.add_row(row["name"], row["command"], row["category"], row["risk_level"], row["description"])

    def on_input_changed(self, event: Input.Changed) -> None:
        if event.input.id == "encyclopedia-search":
            self.load_commands(event.value)
