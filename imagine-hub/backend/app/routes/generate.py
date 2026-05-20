import base64
import json
import aiohttp
from datetime import datetime
from fastapi import APIRouter, HTTPException
from sqlmodel import Session
from app.database import engine
from app.models.provider import ProviderConfig
from app.models.history import GenerationHistory
from app.models.schemas import GenerateRequest, GenerateResponse
from app.providers import get_provider, get_param_schema
from app.providers.base import ImageResult
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

    n_requested = req.params.get("n", 1)
    strategy = req.params.pop("strategy", "single_call")

    try:
        if strategy == "multi_call" and n_requested > 1:
            all_images: list[bytes] = []
            api_call_count = 0
            media_type = "image/png"
            for _ in range(n_requested):
                call_params = {**req.params, "n": 1}
                part = await provider.generate(req.prompt, req.model, call_params)
                all_images.extend(part.images)
                media_type = part.media_type
                api_call_count += 1
            result = ImageResult(images=all_images, media_type=media_type)
            n_received = len(all_images)
            api_calls_val = api_call_count
        else:
            result = await provider.generate(req.prompt, req.model, req.params)
            n_received = len(result.images)
            api_calls_val = 1
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except TimeoutError:
        raise HTTPException(status_code=408, detail="Request timed out")
    except aiohttp.ClientResponseError as e:
        status = e.status
        msg = {
            401: "Authentication failed: invalid or expired API key",
            403: "Access denied by provider",
            404: f"Model '{req.model}' not found on provider",
            429: "Rate limited, please try again later",
        }.get(status, f"Provider returned HTTP {status}: {e.message}")
        raise HTTPException(status_code=502, detail=msg)
    except aiohttp.ClientError as e:
        raise HTTPException(status_code=502, detail=f"Connection error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    images_b64: list[str] = []
    first_path = ""
    for i, img_bytes in enumerate(result.images):
        b64_str = base64.b64encode(img_bytes).decode()
        images_b64.append(b64_str)
        if i == 0:
            first_path = save_image(img_bytes)

    with Session(engine) as session:
        history = GenerationHistory(
            prompt=req.prompt,
            provider_id=req.provider_id,
            provider_name=provider_cfg.name,
            model_name=req.model,
            params=json.dumps(req.params),
            image_path=first_path,
            created_at=datetime.now().isoformat(),
        )
        session.add(history)
        session.commit()

    return GenerateResponse(
        images_base64=images_b64,
        media_type=result.media_type,
        n_requested=n_requested,
        n_received=n_received,
        strategy=strategy,
        api_calls=api_calls_val,
        rate_limit_info=result.extra,
    )

@router.get("/providers/{provider_id}/models")
async def list_models(provider_id: int):
    with Session(engine) as session:
        provider_cfg = session.get(ProviderConfig, provider_id)
        if not provider_cfg:
            raise HTTPException(status_code=404, detail="Provider not found")

    provider = get_provider(provider_cfg.provider_type, provider_cfg.base_url, provider_cfg.api_key, provider_cfg.config)
    models = await provider.list_models()

    if provider_cfg.provider_type != "custom":
        try:
            cfg = json.loads(provider_cfg.config)
            aliases = cfg.get("model_aliases", {})
            if aliases:
                models = [m for m in models if m in aliases]
        except json.JSONDecodeError:
            pass

    return {"models": models}

@router.get("/providers/schema/{provider_type}")
def get_provider_schema(provider_type: str):
    schema = get_param_schema(provider_type)
    return {"schema": schema}
