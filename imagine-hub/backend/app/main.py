import socket
import traceback
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import create_db_and_tables
from app.routes.providers import router as providers_router
from app.routes.generate import router as generate_router
from app.routes.history import router as history_router

app = FastAPI(title="Imagine Hub")

app.include_router(providers_router)
app.include_router(generate_router)
app.include_router(history_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal error: {str(exc)}"},
    )

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "imagine-hub"}

def _get_lan_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.254.254.254", 1))
        return s.getsockname()[0]
    except:
        pass
    finally:
        s.close()
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ip = info[4][0]
            if ip.startswith(("192.168.", "10.", "172.")):
                return ip
    except:
        pass
    return "127.0.0.1"

@app.get("/api/network-info")
def network_info(request: Request):
    lan_ip = _get_lan_ip()
    port = request.url.port or 8000
    return {
        "lan_ip": lan_ip,
        "lan_url": f"http://{lan_ip}:{port}",
        "host": request.url.hostname,
    }

frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
