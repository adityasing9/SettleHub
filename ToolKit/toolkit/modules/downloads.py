import os
from textual.app import ComposeResult
from textual.containers import Vertical, Horizontal
from textual.widgets import Label, Input, Button, Static
from textual import work
import yt_dlp

class DownloadsModule(Vertical):
    """The Downloads module featuring yt-dlp."""

    def compose(self) -> ComposeResult:
        yield Label("Downloads (yt-dlp Integration)", classes="module-title")
        
        with Horizontal(id="download-input-row"):
            yield Input(placeholder="Enter Video URL", id="download-url")
            yield Button("Download", id="btn-download", variant="primary")
            
        yield Static("Downloads will be saved to your Desktop.", id="download-status", classes="terminal-output")

    @work(thread=True)
    def download_video(self, url: str) -> None:
        self.app.call_from_thread(self.update_status, f"Starting download for: {url}")
        
        desktop = os.path.join(os.path.expanduser("~"), "Desktop")
        ydl_opts = {
            'outtmpl': os.path.join(desktop, '%(title)s.%(ext)s'),
            'format': 'best',
            'quiet': True,
            'no_warnings': True,
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                title = info.get('title', 'Unknown Title')
                self.app.call_from_thread(self.update_status, f"Successfully downloaded: {title}\nSaved to Desktop.")
        except Exception as e:
            self.app.call_from_thread(self.update_status, f"Download failed: {str(e)}")

    def update_status(self, text: str) -> None:
        self.query_one("#download-status", Static).update(text)

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "btn-download":
            url = self.query_one("#download-url", Input).value.strip()
            if url:
                self.query_one("#download-url", Input).value = ""
                self.download_video(url)
