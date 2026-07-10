from textual.app import ComposeResult
from textual.containers import Vertical, Horizontal
from textual.widgets import Label, Input, ListView, ListItem, TextArea, Button
from textual import work
from textual.binding import Binding

from toolkit.db import get_connection

class StorageNotesModule(Vertical):
    """The Storage & Notes module - specifically designed for private local data."""
    
    BINDINGS = [
        Binding("ctrl+n", "new_note", "New Note"),
        Binding("ctrl+s", "save_note", "Save Note"),
        Binding("ctrl+d", "delete_note", "Delete Note"),
    ]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.current_note_id = None

    def compose(self) -> ComposeResult:
        yield Label("Private Local Notes", classes="module-title")
        with Horizontal(id="notes-container"):
            with Vertical(id="notes-sidebar"):
                yield Button("New Note (Ctrl+N)", id="btn-new-note", variant="success")
                yield ListView(id="notes-list")
            with Vertical(id="notes-editor-container"):
                yield Input(placeholder="Note Title", id="note-title")
                yield TextArea(id="note-content", show_line_numbers=True)
                with Horizontal(id="notes-actions"):
                    yield Button("Save (Ctrl+S)", id="btn-save", variant="primary")
                    yield Button("Delete (Ctrl+D)", id="btn-delete", variant="error")

    def on_mount(self) -> None:
        self.load_notes()

    @work(thread=True)
    def load_notes(self) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, title FROM notes ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        self.app.call_from_thread(self.update_notes_list, rows)

    def update_notes_list(self, rows: list) -> None:
        list_view = self.query_one("#notes-list", ListView)
        list_view.clear()
        for row in rows:
            item = ListItem(Label(row["title"]), id=f"note-{row['id']}")
            list_view.append(item)

    @work(thread=True)
    def load_note_content(self, note_id: int) -> None:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT title, content FROM notes WHERE id = ?", (note_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            self.app.call_from_thread(self.update_editor, row["title"], row["content"])

    def update_editor(self, title: str, content: str) -> None:
        self.query_one("#note-title", Input).value = title
        self.query_one("#note-content", TextArea).text = content or ""

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        if event.list_view.id == "notes-list" and event.item.id:
            try:
                note_id = int(event.item.id.replace("note-", ""))
                self.current_note_id = note_id
                self.load_note_content(note_id)
            except ValueError:
                pass

    def action_new_note(self) -> None:
        self.current_note_id = None
        self.query_one("#note-title", Input).value = ""
        self.query_one("#note-content", TextArea).text = ""
        self.query_one("#note-title", Input).focus()

    def action_save_note(self) -> None:
        title = self.query_one("#note-title", Input).value
        content = self.query_one("#note-content", TextArea).text
        if not title:
            return  # Need at least a title
        self._save_note_db(self.current_note_id, title, content)

    @work(thread=True)
    def _save_note_db(self, note_id, title, content):
        conn = get_connection()
        cursor = conn.cursor()
        if note_id:
            cursor.execute("UPDATE notes SET title = ?, content = ? WHERE id = ?", (title, content, note_id))
        else:
            cursor.execute("INSERT INTO notes (title, content) VALUES (?, ?)", (title, content))
            self.current_note_id = cursor.lastrowid
        conn.commit()
        conn.close()
        self.app.call_from_thread(self.load_notes)

    def action_delete_note(self) -> None:
        if self.current_note_id:
            self._delete_note_db(self.current_note_id)

    @work(thread=True)
    def _delete_note_db(self, note_id):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        conn.commit()
        conn.close()
        self.app.call_from_thread(self.action_new_note)
        self.app.call_from_thread(self.load_notes)

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "btn-new-note":
            self.action_new_note()
        elif event.button.id == "btn-save":
            self.action_save_note()
        elif event.button.id == "btn-delete":
            self.action_delete_note()
