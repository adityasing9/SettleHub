import psutil
import platform
import os
from textual.app import ComposeResult
from textual.containers import Vertical, Horizontal
from textual.widgets import Label, Static, Sparkline
from textual.reactive import reactive

class StatWidget(Vertical):
    """A widget to display a single statistic."""
    def __init__(self, title: str, value: str, id: str | None = None):
        super().__init__(id=id)
        self.title_text = title
        self.value_text = value
        self.value_label = Label(self.value_text, classes="stat-value")

    def compose(self) -> ComposeResult:
        yield Label(self.title_text, classes="stat-title")
        yield self.value_label

    def update_value(self, new_value: str) -> None:
        self.value_label.update(new_value)

class DashboardModule(Vertical):
    """The main dashboard view showing system summary."""

    def on_mount(self) -> None:
        self.update_stats()
        self.set_interval(2.0, self.update_stats)

    def compose(self) -> ComposeResult:
        sys_info = platform.uname()
        yield Label(f"System Dashboard: {sys_info.node} ({sys_info.system} {sys_info.release})", id="dashboard-title")
        
        with Horizontal(id="stats-row"):
            yield StatWidget("CPU Usage", "0%", id="stat-cpu")
            yield StatWidget("RAM Usage", "0%", id="stat-ram")
            yield StatWidget("Disk Usage", "0%", id="stat-disk")

    def update_stats(self) -> None:
        cpu = psutil.cpu_percent()
        ram = psutil.virtual_memory()
        disk = psutil.disk_usage(os.path.abspath(os.sep))

        self.query_one("#stat-cpu", StatWidget).update_value(f"{cpu}%")
        self.query_one("#stat-ram", StatWidget).update_value(f"{ram.percent}% ({ram.used // (1024**3)}GB / {ram.total // (1024**3)}GB)")
        self.query_one("#stat-disk", StatWidget).update_value(f"{disk.percent}% ({disk.free // (1024**3)}GB free)")
