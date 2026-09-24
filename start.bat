@echo off
title Elementis
cd /d "%~dp0"
if not exist venv\Scripts\python.exe (
    echo Erster Start: Python-Umgebung wird eingerichtet...
    python -m venv venv
    venv\Scripts\python.exe -m pip install --disable-pip-version-check -q -r requirements.txt
)
venv\Scripts\python.exe server.py --open
pause
