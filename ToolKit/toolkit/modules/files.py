import os
from textual.app import ComposeResult
from textual.containers import Vertical, Horizontal
from textual.widgets import Label, Input, Button, Static
from textual import work

class FileFolderModule(Vertical):
    """The File & Folder module."""

    def compose(self) -> ComposeResult:
        yield Label("File & Folder Tools", classes="module-title")
        
        yield Label("Folder Size Calculator", classes="section-label")
        with Horizontal(id="folder-size-input-row"):
            yield Input(placeholder="Enter absolute path (e.g. C:\\Users)", id="folder-path-input")
            yield Button("Calculate Size", id="btn-calc-size", variant="primary")
            
        yield Static("", id="folder-size-output")

    def get_size(self, start_path='.'):
        total_size = 0
        try:
            for dirpath, dirnames, filenames in os.walk(start_path):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    if not os.path.islink(fp):
                        total_size += os.path.getsize(fp)
        except Exception:
            pass # ignore permission errors
        return total_size

    def format_size(self, size_bytes):
        if size_bytes == 0:
            return "0B"
        size_name = ("B", "KB", "MB", "GB", "TB", "PB")
        i = 0
        while size_bytes >= 1024 and i < len(size_name) - 1:
            size_bytes /= 1024.0
            i += 1
        return f"{size_bytes:.2f} {size_name[i]}"

    @work(thread=True)
    def calculate_size_worker(self, path: str) -> None:
        if not os.path.exists(path):
            self.app.call_from_thread(self.update_output, f"Path does not exist: {path}")
            return
            
        if not os.path.isdir(path):
            self.app.call_from_thread(self.update_output, f"Path is not a directory: {path}")
            return

        size = self.get_size(path)
        formatted = self.format_size(size)
        self.app.call_from_thread(self.update_output, f"Total Size of '{path}': {formatted}")

    def update_output(self, text: str) -> None:
        self.query_one("#folder-size-output", Static).update(text)

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "btn-calc-size":
            path = self.query_one("#folder-path-input", Input).value.strip()
            if path:
                self.query_one("#folder-size-output", Static).update("Calculating... (This may take a while for large directories)")
                self.calculate_size_worker(path)
