@echo off
rem Starts Drum Coach with a secure https link for your phone, so the microphone and USB drums work there.
rem Needs Python and an internet connection. Keep this window open while you play; close it to stop.
rem The link is new each time, but your progress is saved on this computer and carries over.
cd /d "%~dp0"
if not exist tools\cloudflared.exe (
  echo Getting Cloudflare's free tunnel tool. This only happens once...
  if not exist tools mkdir tools
  curl -L --fail --progress-bar -o tools\cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe || (
    del tools\cloudflared.exe 2>nul
    echo Couldn't download it. Check this computer is online, then try again.
    pause
    exit /b 1
  )
)
python server.py --phone || pause
