@echo off
rem Starts Drum Coach on http://localhost:8765 and opens it in your browser.
rem Needs Python. Close this window to stop the app.
cd /d "%~dp0"
python server.py || pause
