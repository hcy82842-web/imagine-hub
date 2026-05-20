import json
import aiohttp
from .base import BaseProvider, ImageResult

class ModelsLabProvider(BaseProvider):
    def __init__(self, base_url: str, api_key: str = "", config: str = "{}"):
        super().__init__("https://modelslab.com", api_key)
        self._cfg = json.loads(config) if config else {}

    async def list_models(self) -> list[str]:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://modelslab.com/api/v4/dreambooth/model_list",
                json={"key": self.api_key},
            ) as resp:
                resp.raise_for_status()
                data = await resp.json()
                return [m["model_id"] for m in data if isinstance(m, dict) and "model_id" in m]

    async def generate(self, prompt: str, model: str, params: dict | None = None) -> ImageResult:
        p = params or {}
        body = {
            "key": self.api_key,
            "model_id": model,
            "prompt": prompt,
            "negative_prompt": p.get("negative_prompt", ""),
            "width": str(p.get("width", 1024)),
            "height": str(p.get("height", 1024)),
            "samples": str(p.get("samples", 1)),
            "num_inference_steps": str(p.get("num_inference_steps", 30)),
            "guidance_scale": p.get("guidance_scale", 7.5),
            "safety_checker": "no",
            "enhance_prompt": "yes",
            "seed": None,
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://modelslab.com/api/v6/images/text2img",
                json=body,
                headers={"Content-Type": "application/json"},
            ) as resp:
                resp.raise_for_status()
                data = await resp.json()
                if data.get("status") != "success":
                    raise ValueError(data.get("message", "Generation failed"))
                img_url = data["output"][0]
                async with session.get(img_url) as img_resp:
                    img_resp.raise_for_status()
                    img_bytes = await img_resp.read()
                    return ImageResult(images=[img_bytes], media_type=img_resp.content_type or "image/png")
