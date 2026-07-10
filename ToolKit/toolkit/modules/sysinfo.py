import platform
import psutil
from textual.app import ComposeResult
from textual.containers import Vertical
from textual.widgets import Label, DataTable
from textual import work

class SysInfoModule(Vertical):
    """The System Info module for deep hardware diagnostics."""

    def compose(self) -> ComposeResult:
        yield Label("System Information", classes="module-title")
        yield DataTable(id="sysinfo-table")

    def on_mount(self) -> None:
        table = self.query_one("#sysinfo-table", DataTable)
        table.add_columns("Component", "Detail")
        table.cursor_type = "row"
        self.load_sysinfo()

    @work(thread=True)
    def load_sysinfo(self) -> None:
        sys_info = platform.uname()
        
        info_list = [
            ("OS Node", sys_info.node),
            ("OS System", sys_info.system),
            ("OS Release", sys_info.release),
            ("OS Version", sys_info.version),
            ("Machine Architecture", sys_info.machine),
            ("Processor", sys_info.processor),
        ]
        
        # CPU
        cpu_freq = psutil.cpu_freq()
        info_list.append(("CPU Physical Cores", str(psutil.cpu_count(logical=False))))
        info_list.append(("CPU Logical Cores", str(psutil.cpu_count(logical=True))))
        if cpu_freq:
            info_list.append(("CPU Max Frequency", f"{cpu_freq.max:.2f}Mhz"))
            info_list.append(("CPU Current Frequency", f"{cpu_freq.current:.2f}Mhz"))
            
        # Memory
        svmem = psutil.virtual_memory()
        info_list.append(("Total RAM", self.get_size(svmem.total)))
        info_list.append(("Available RAM", self.get_size(svmem.available)))
        
        # Disks
        partitions = psutil.disk_partitions()
        for partition in partitions:
            try:
                partition_usage = psutil.disk_usage(partition.mountpoint)
                info_list.append((f"Disk {partition.device} Total", self.get_size(partition_usage.total)))
                info_list.append((f"Disk {partition.device} Free", self.get_size(partition_usage.free)))
                info_list.append((f"Disk {partition.device} FS", partition.fstype))
            except PermissionError:
                continue

        self.app.call_from_thread(self.update_table, info_list)

    def update_table(self, info_list: list) -> None:
        table = self.query_one("#sysinfo-table", DataTable)
        table.clear()
        for key, val in info_list:
            table.add_row(key, val)

    def get_size(self, bytes_val, suffix="B"):
        factor = 1024
        for unit in ["", "K", "M", "G", "T", "P"]:
            if bytes_val < factor:
                return f"{bytes_val:.2f}{unit}{suffix}"
            bytes_val /= factor
