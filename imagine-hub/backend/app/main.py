import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
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
