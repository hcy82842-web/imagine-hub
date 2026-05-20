from pydantic import BaseModel
from typing import Optional

class ProviderCreate(BaseModel):
    name: str
    provider_type: str
    base_url: str
    api_key: str = ""
    config: str = "{}"

class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    provider_type: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    config: Optional[str] = None

class ProviderResponse(BaseModel):
    id: int
    name: str
    provider_type: str
    base_url: str
    api_key: str
    models: str
    config: str
    created_at: str

class GenerateRequest(BaseModel):
    provider_id: int
    model: str
    prompt: str
    params: dict = {}

class GenerateResponse(BaseModel):
    images_base64: list[str]
    media_type: str = "image/png"

class HistoryItem(BaseModel):
    id: int
    prompt: str
    provider_id: int
    provider_name: str
    model_name: str
    params: str
    image_base64: str
    created_at: str

class TestConnectionRequest(BaseModel):
    provider_type: str
    base_url: str
    api_key: str = ""
    config: str = "{}"

class TestStep(BaseModel):
    name: str
    ok: bool | None
    detail: str
    ms: int

class TestConnectionResponse(BaseModel):
    success: bool
    steps: list[TestStep]
    total_ms: int
