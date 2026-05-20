import json
import time
import asyncio
import socket
from urllib.parse import urlparse
import aiohttp
from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select
from datetime import datetime
from app.database import engine
from app.models.provider import ProviderConfig
from app.models.schemas import ProviderCreate, ProviderUpdate, ProviderResponse, TestConnectionRequest, TestConnectionResponse, TestStep

router = APIRouter(prefix="/api/providers", tags=["providers"])

@router.get("", response_model=list[ProviderResponse])
def list_providers():
    with Session(engine) as session:
        providers = session.exec(select(ProviderConfig)).all()
        return providers

@router.post("", response_model=ProviderResponse, status_code=201)
def create_provider(data: ProviderCreate):
    with Session(engine) as session:
        provider = ProviderConfig(
            name=data.name,
            provider_type=data.provider_type,
            base_url=data.base_url,
            api_key=data.api_key,
            config=data.config,
            created_at=datetime.now().isoformat(),
        )
        session.add(provider)
        session.commit()
        session.refresh(provider)
        return provider

@router.get("/{provider_id}", response_model=ProviderResponse)
def get_provider(provider_id: int):
    with Session(engine) as session:
        provider = session.get(ProviderConfig, provider_id)
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        return provider

@router.put("/{provider_id}", response_model=ProviderResponse)
def update_provider(provider_id: int, data: ProviderUpdate):
    with Session(engine) as session:
        provider = session.get(ProviderConfig, provider_id)
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(provider, key, value)
        session.add(provider)
        session.commit()
        session.refresh(provider)
        return provider

@router.delete("/{provider_id}", status_code=204)
def delete_provider(provider_id: int):
    with Session(engine) as session:
        provider = session.get(ProviderConfig, provider_id)
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        session.delete(provider)
        session.commit()

async def _run_step(name: str, fn, timeout: float = 5.0) -> TestStep:
    start = time.monotonic()
    try:
        result = await asyncio.wait_for(fn(), timeout=timeout)
        ms = int((time.monotonic() - start) * 1000)
        return TestStep(name=name, ok=True, detail=str(result), ms=ms)
    except asyncio.TimeoutError:
        ms = int((time.monotonic() - start) * 1000)
        return TestStep(name=name, ok=False, detail=f"Timeout after {timeout}s", ms=ms)
    except Exception as e:
        ms = int((time.monotonic() - start) * 1000)
        return TestStep(name=name, ok=False, detail=str(e), ms=ms)

@router.post("/test-connection", response_model=TestConnectionResponse)
async def test_connection(req: TestConnectionRequest):
    parsed = urlparse(req.base_url if req.base_url.startswith(("http://", "https://")) else f"https://{req.base_url}")
    hostname = parsed.hostname or ""
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    scheme = parsed.scheme or "https"

    steps: list[TestStep] = []
    total_start = time.monotonic()

    # 1) DNS
    dns_step = await _run_step("dns", lambda: _test_dns(hostname))
    steps.append(dns_step)
    if not dns_step.ok:
        return _finish(steps, total_start)

    # 2) TCP
    tcp_step = await _run_step("tcp", lambda: _test_tcp(hostname, port))
    steps.append(tcp_step)
    if not tcp_step.ok:
        return _finish(steps, total_start)

    # 3) HTTP
    http_step = await _run_step("http", lambda: _test_http(scheme, hostname, port))
    steps.append(http_step)

    # 4) Auth
    if req.api_key:
        auth_step = await _run_step("auth", lambda: _test_auth(req.provider_type, scheme, hostname, port, req.api_key), timeout=8.0)
        steps.append(auth_step)
    else:
        steps.append(TestStep(name="auth", ok=None, detail="No API key provided", ms=0))

    # 5) Endpoint (custom provider)
    if req.provider_type == "custom":
        ep_step = await _run_step("endpoint", lambda: _test_custom_endpoint(scheme, hostname, port, req.api_key, req.config), timeout=10.0)
        steps.append(ep_step)

    return _finish(steps, total_start)

def _finish(steps: list[TestStep], start: float) -> TestConnectionResponse:
    total_ms = int((time.monotonic() - start) * 1000)
    success = all(s.ok for s in steps if s.ok is not None)
    return TestConnectionResponse(success=success, steps=steps, total_ms=total_ms)

async def _test_dns(hostname: str) -> str:
    loop = asyncio.get_event_loop()
    addrs = await loop.run_in_executor(None, lambda: socket.getaddrinfo(hostname, 80))
    ips = list(dict.fromkeys(a[4][0] for a in addrs))
    return f"Resolved {hostname} → {', '.join(ips)}"

async def _test_tcp(hostname: str, port: int) -> str:
    loop = asyncio.get_event_loop()
    _, writer = await asyncio.wait_for(
        asyncio.open_connection(hostname, port), timeout=5.0
    )
    writer.close()
    await writer.wait_closed()
    return f"Connected to {hostname}:{port}"

async def _test_http(scheme: str, hostname: str, port: int) -> str:
    url = f"{scheme}://{hostname}:{port}" if port not in (80, 443) else f"{scheme}://{hostname}"
    async with aiohttp.ClientSession() as session:
        async with session.head(url, timeout=5) as resp:
            return f"HTTP {resp.status} {resp.reason}"

async def _test_auth(provider_type: str, scheme: str, hostname: str, port: int, api_key: str) -> str:
    if provider_type == "openai_compat":
        base = f"{scheme}://{hostname}:{port}" if port not in (80, 443) else f"{scheme}://{hostname}"
        url = f"{base.rstrip('/')}/models"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers={"Authorization": f"Bearer {api_key}"}, timeout=8) as resp:
                if resp.status == 200:
                    return f"API key valid (GET /models → 200)"
                elif resp.status == 401:
                    raise PermissionError(f"Invalid API key (HTTP {resp.status})")
                else:
                    raise ConnectionError(f"Auth check returned HTTP {resp.status}")
    else:
        base = f"{scheme}://{hostname}:{port}" if port not in (80, 443) else f"{scheme}://{hostname}"
        async with aiohttp.ClientSession() as session:
            async with session.head(base, headers={"Authorization": f"Bearer {api_key}"}, timeout=8) as resp:
                return f"Server responded with HTTP {resp.status} (bearer auth sent)"

async def _test_custom_endpoint(scheme: str, hostname: str, port: int, api_key: str, config_str: str) -> str:
    base = f"{scheme}://{hostname}:{port}" if port not in (80, 443) else f"{scheme}://{hostname}"
    try:
        cfg = json.loads(config_str)
    except json.JSONDecodeError:
        cfg = {}

    endpoint = cfg.get("endpoint", "")
    if not endpoint:
        return "No endpoint configured, skipping"
    method = cfg.get("method", "POST")
    url = endpoint if endpoint.startswith("http") else f"{base.rstrip('/')}/{endpoint.lstrip('/')}"

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    body = {"_test": True} if method == "POST" else None
    async with aiohttp.ClientSession() as session:
        async with session.request(method, url, headers=headers, json=body, timeout=8) as resp:
            if resp.status in (400, 422):
                return f"Endpoint reachable (expected: sent intentionally invalid data → {resp.status})"
            elif resp.status == 404:
                raise ConnectionError(f"Endpoint not found (HTTP 404) — check the path: {url}")
            elif resp.status in (401, 403):
                raise PermissionError(f"Auth rejected at endpoint (HTTP {resp.status})")
            else:
                return f"Endpoint responded (HTTP {resp.status})"
