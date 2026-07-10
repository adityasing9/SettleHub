# Toolkit (formerly SettleHub)

A production-quality, terminal-based toolkit for Windows featuring a professional Text User Interface (TUI). It functions as a complete operating system utility, allowing you to manage Windows, run commands, view system stats, and more—all without leaving your terminal.

## Features (Phase 1)
- **Home Dashboard**: Real-time System Summary (CPU, RAM, Disk usage).
- **Run Commands Encyclopedia**: A searchable SQLite database of standard Windows commands (e.g., `ncpa.cpl`, `appwiz.cpl`).
- **Windows Toolkit**: Basic system information and shortcuts for maintenance tasks like SFC scans and Windows Update.

*(Many more modules planned for Phase 2 and beyond, including Cloud Sync, AI Assistant, and Security Tools).*

## Installation & Setup

1. Clone the repository.
2. Ensure you have Python 3.10+ installed.
3. Create and activate a virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```
4. Install requirements:
   ```powershell
   pip install textual psutil pyinstaller
   ```
5. Run the application:
   ```powershell
   python main.py
   ```

## Building a Single Executable
To distribute the app as a single standalone executable:
```powershell
pyinstaller --name Toolkit --onefile main.py
```
This will generate `Toolkit.exe` in the `dist/` directory.

## Architecture
Built with [Textual](https://textual.textualize.io/) for Python, offering responsive flexbox layouts, a comprehensive component library, and CSS-like styling (`.tcss`).
