"""Windows Service Setup and Management helper for RCPC Agent.

This script helps configure the RCPC Agent to run persistently on Windows startup,
either via Windows Task Scheduler (recommended, no external dependencies needed)
or Non-Sucking Service Manager (NSSM).
"""
import sys
import subprocess
from pathlib import Path

def setup_task_scheduler():
    """Register RCPC Agent as an automatic logon task using Windows schtasks."""
    python_exe = sys.executable
    script_path = Path(__file__).resolve().parent / "run_agent.py"
    
    task_name = "RCPC_Windows_Agent"
    command = f'schtasks /Create /TN "{task_name}" /TR "\"{python_exe}\" \"{script_path}\"" /SC ONLOGON /RL HIGHEST /F'
    
    print(f"Creating Windows Task Scheduler task: {task_name}...")
    try:
        res = subprocess.run(command, shell=True, capture_output=True, text=True)
        if res.returncode == 0:
            print("Successfully registered RCPC Agent in Windows Task Scheduler!")
            print("The agent will automatically launch when you sign into Windows.")
        else:
            print(f"Error registering task: {res.stderr.strip()}")
            print("Note: Administrator privileges may be required.")
    except Exception as e:
        print(f"Failed to execute schtasks: {e}")

if __name__ == "__main__":
    setup_task_scheduler()
