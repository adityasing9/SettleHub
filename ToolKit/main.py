import sys
import os

# Ensure the local package is in the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from toolkit.app import ToolkitApp
from toolkit.db import init_db

def main():
    init_db()
    app = ToolkitApp()
    app.run()

if __name__ == "__main__":
    main()
