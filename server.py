# Elementis - Spielserver
# Liefert das Spiel aus, leitet die BetterPortal-Bridge weiter und verteilt
# LAN-Mehrspieler-Nachrichten (WebSocket-Relay, die Spiellogik laeuft im Host-Browser).
# Start: start.bat  (oder: venv\Scripts\python server.py)
import asyncio
import itertools
import json
import socket
import sys
import webbrowser
from pathlib import Path

import aiohttp
from aiohttp import web

BASE_DIR = Path(__file__).resolve().parent
PORT = 5180
BETTERPORTAL_URL = "http://127.0.0.1:5177/api/portal"

# room_id -> {"name", "host": ws, "clients": {peer_id: ws}, "players": int}
ROOMS = {}
CONN = {}   # ws -> {"role", "room", "peer", "name"} (Rolle kann sich beim Host-Wechsel ändern)
_room_ids = itertools.count(1)


def lan_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))
            return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"


# ------------------------------------------------------------------ Statische Dateien

@web.middleware
async def no_cache(request, handler):
    resp = await handler(request)
    if not isinstance(resp, web.WebSocketResponse):
        # vendor/ (Three.js, 1,3 MB) ändert sich nie und darf eine Woche im Browser bleiben
        resp.headers["Cache-Control"] = "max-age=604800" if request.path.startswith("/vendor/") else "no-store"
    return resp


async def index(_request):
    return web.FileResponse(BASE_DIR / "index.html")


async def client_log(request):
    text = (await request.text())[:2000]
    ua = request.headers.get("User-Agent", "")[:120]
    print(f"[Browser {request.remote}] {text}\n    ({ua})", flush=True)
    return web.json_response({"ok": True})


# ------------------------------------------------------------------ BetterPortal-Bridge

async def bridge_portal(request):
    session = request.app["http"]
    try:
        async with session.get(BETTERPORTAL_URL, timeout=aiohttp.ClientTimeout(total=0.8)) as r:
            data = await r.json()
            return web.json_response({"ok": True, "online": True, "slots": data.get("slots", [])})
    except Exception:
        return web.json_response({"ok": True, "online": False, "slots": []})


# ------------------------------------------------------------------ LAN-Relay

def room_list():
    return [{"id": rid, "name": r["name"], "players": r["players"]} for rid, r in ROOMS.items()]


async def api_rooms(_request):
    return web.json_response({"ok": True, "rooms": room_list(), "ip": lan_ip(), "port": PORT})


async def send(ws, obj):
    if ws is not None and not ws.closed:
        try:
            await ws.send_str(json.dumps(obj, separators=(",", ":")))
        except (ConnectionResetError, RuntimeError):
            pass


async def ws_handler(request):
    ws = web.WebSocketResponse(heartbeat=10, max_msg_size=4 * 1024 * 1024)
    await ws.prepare(request)
    st = CONN[ws] = {"role": None, "room": None, "peer": None, "name": ""}
    try:
        async for msg in ws:
            if msg.type != aiohttp.WSMsgType.TEXT:
                continue
            try:
                m = json.loads(msg.data)
            except ValueError:
                continue
            t = m.get("t")
            room = ROOMS.get(st["room"]) if st["room"] else None

            if t == "list":
                await send(ws, {"t": "rooms", "rooms": room_list()})

            elif t == "host" and st["role"] is None:
                room_id = str(next(_room_ids))
                ROOMS[room_id] = {"name": str(m.get("name") or "Spiel")[:32], "host": ws, "host_peer": "h",
                                  "clients": {}, "players": 1, "peer_seq": itertools.count(1)}
                st.update(role="host", room=room_id, peer="h")
                await send(ws, {"t": "hosted", "room": room_id, "peer": "h"})

            elif t == "join" and st["role"] is None:
                room = ROOMS.get(str(m.get("room")))
                if not room:
                    await send(ws, {"t": "error", "msg": "Raum nicht gefunden."})
                    continue
                peer_id = f"c{next(room['peer_seq'])}"
                st.update(role="client", room=str(m.get("room")), peer=peer_id, name=str(m.get("name") or "")[:24])
                room["clients"][peer_id] = ws
                await send(ws, {"t": "joined", "room": st["room"], "peer": peer_id, "name": room["name"]})
                await send(room["host"], {"t": "peer_join", "peer": peer_id, "name": st["name"]})

            elif t == "to_host" and st["role"] == "client" and room:
                await send(room["host"], {"t": "from", "peer": st["peer"], "data": m.get("data")})

            elif t == "to" and st["role"] == "host" and room:
                payload = {"t": "msg", "data": m.get("data")}
                target = m.get("peer")
                if target == "*":
                    for cws in list(room["clients"].values()):
                        await send(cws, payload)
                else:
                    await send(room["clients"].get(target), payload)

            elif t == "meta" and st["role"] == "host" and room:
                room["players"] = int(m.get("players") or 1)
    finally:
        CONN.pop(ws, None)
        room = ROOMS.get(st["room"]) if st["room"] else None
        if room and st["role"] == "host":
            if room["clients"]:
                # Host-Wechsel: der am längsten verbundene Mitspieler übernimmt die Welt
                new_peer, new_ws = next(iter(room["clients"].items()))
                del room["clients"][new_peer]
                old_host = room["host_peer"]
                room["host"], room["host_peer"] = new_ws, new_peer
                if new_ws in CONN:
                    CONN[new_ws]["role"] = "host"
                peers = [{"peer": p, "name": CONN.get(w, {}).get("name", "")} for p, w in room["clients"].items()]
                await send(new_ws, {"t": "promoted", "oldHost": old_host, "peers": peers})
                for cws in list(room["clients"].values()):
                    await send(cws, {"t": "host_changed", "peer": new_peer, "oldHost": old_host})
            else:
                ROOMS.pop(st["room"], None)
        elif room and st["role"] == "client":
            room["clients"].pop(st["peer"], None)
            await send(room["host"], {"t": "peer_leave", "peer": st["peer"]})
    return ws


# ------------------------------------------------------------------ App

async def on_startup(app):
    app["http"] = aiohttp.ClientSession()


async def on_cleanup(app):
    await app["http"].close()


def make_app():
    app = web.Application(middlewares=[no_cache])
    app.router.add_get("/", index)
    app.router.add_get("/bridge/portal", bridge_portal)
    app.router.add_post("/api/clientlog", client_log)
    app.router.add_get("/api/rooms", api_rooms)
    app.router.add_get("/ws", ws_handler)
    app.router.add_static("/src/", BASE_DIR / "src")
    app.router.add_static("/vendor/", BASE_DIR / "vendor")
    skystones = BASE_DIR.parent / "Skystone"
    if skystones.is_dir():
        app.router.add_static("/skystones/", skystones)
    app.router.add_get("/styles.css", lambda r: web.FileResponse(BASE_DIR / "styles.css"))
    app.on_startup.append(on_startup)
    app.on_cleanup.append(on_cleanup)
    return app


def port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("0.0.0.0", port))
            return False
        except OSError:
            return True


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    open_browser = "--open" in sys.argv
    if port_in_use(PORT):
        print(f"Port {PORT} ist schon belegt - das Spiel laeuft vermutlich bereits.")
        print(f"  Einfach im Browser oeffnen: http://localhost:{PORT}")
        print("  (Sonst das andere Fenster mit dem Spielserver schliessen und neu starten.)")
        if open_browser:
            webbrowser.open(f"http://localhost:{PORT}")
        sys.exit(1)
    ip = lan_ip()
    print("Elementis laeuft")
    print(f"  Dieser PC:     http://localhost:{PORT}")
    print(f"  Im Heimnetz:   http://{ip}:{PORT}")
    print("Browser-Fehler erscheinen hier im Fenster.")
    app = make_app()
    if open_browser:
        async def _open(_app):
            # erst oeffnen, wenn der Server wirklich lauscht
            asyncio.get_running_loop().call_later(0.6, webbrowser.open, f"http://localhost:{PORT}")
        app.on_startup.append(_open)
    web.run_app(app, host="0.0.0.0", port=PORT, print=None)
