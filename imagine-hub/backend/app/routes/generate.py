import base64
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from sqlmodel import Session
from app.database import engine
from app.models.provider import ProviderConfig
from app.models.history import GenerationHistory
from app.models.schemas import GenerateRequest, GenerateResponse
from app.providers import get_provider, get_param_schema
from app.utils.image_storage import save_image

router = APIRouter(prefix="/api", tags=["generate"])

@router.post("/generate", response_model=GenerateResponse)
async def generate_image(req: GenerateRequest):
    with Session(engine) as session:
        provider_cfg = session.get(ProviderConfig, req.provider_id)
        if not provider_cfg:
            raise HTTPException(status_code=404, detail="Provider not found")

    provider = get_provider(
        provider_cfg.provider_type, provider_cfg.base_url, provider_cfg.api_key, provider_cfg.config
    )
    result = await provider.generate(req.prompt, req.model, req.params)

    img_path = save_image(result.image_data)

    with Session(engine) as session:
        history = GenerationHistory(
            prompt=req.prompt,
            provider_id=req.provider_id,
            provider_name=provider_cfg.name,
            model_name=req.model,
            params=json.dumps(req.params),
            image_path=img_path,
            created_at=datetime.now().isoformat(),
        )
        session.add(history)
        session.commit()

    return GenerateResponse(
        image_base64=base64.b64encode(result.image_data).decode(),
        media_type=result.media_type,
    )

@router.get("/providers/{provider_id}/models")
async def list_models(provider_id: int):
    with Session(engine) as session:
        provider_cfg = session.get(ProviderConfig, provider_id)
        if not provider_cfg:
            raise HTTPException(status_code=404, detail="Provider not found")

    provider = get_provider(provider_cfg.provider_type, provider_cfg.base_url, provider_cfg.api_key)
    models = await provider.list_models()
    return {"models": models}

@router.get("/providers/schema/{provider_type}")
def get_provider_schema(provider_type: str):
    schema = get_param_schema(provider_type)
    return {"schema": schema}
