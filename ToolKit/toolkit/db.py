import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "toolkit.db")

def get_connection():
    """Returns a connection to the SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database schema."""
    conn = get_connection()
    cursor = conn.cursor()

    # Create commands table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS commands (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            command TEXT NOT NULL,
            description TEXT,
            category TEXT,
            risk_level TEXT
        )
    ''')

    # Create notes table (stored locally, strictly private)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Seed initial data if empty
    cursor.execute("SELECT COUNT(*) FROM commands")
    if cursor.fetchone()[0] == 0:
        seed_data = [
            ("Network Connections", "ncpa.cpl", "Opens the Network Connections control panel.", "Networking", "Low"),
            ("Programs and Features", "appwiz.cpl", "Opens the Add/Remove Programs panel.", "System", "Low"),
            ("Services", "services.msc", "Opens the Services management console.", "System", "Medium"),
            ("Registry Editor", "regedit", "Opens the Windows Registry Editor.", "System", "High"),
            ("Disk Cleanup", "cleanmgr", "Opens the Disk Cleanup utility.", "Maintenance", "Low"),
            ("Task Manager", "taskmgr", "Opens the Task Manager.", "System", "Low"),
            ("Temp Folder", "explorer %temp%", "Opens the temporary files folder.", "Files", "Low"),
            ("Startup Folder", "shell:startup", "Opens the user's startup folder.", "System", "Low"),
            ("Device Manager", "devmgmt.msc", "Opens the Device Manager.", "System", "Medium"),
            ("Command Prompt", "cmd", "Opens the Command Prompt.", "Terminal", "Low"),
            ("System Information", "msinfo32", "Displays detailed system information.", "System", "Low"),
        ]
        cursor.executemany(
            "INSERT INTO commands (name, command, description, category, risk_level) VALUES (?, ?, ?, ?, ?)",
            seed_data
        )
        conn.commit()

    conn.close()
