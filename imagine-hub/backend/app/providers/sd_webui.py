import aiohttp
import base64
from .base import BaseProvider, ImageResult

class SDWebUIProvider(BaseProvider):
    async def list_models(self) -> list[str]:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.base_url}/sdapi/v1/sd-models") as resp:
                resp.raise_for_status()
                data = await resp.json()
                return [m["model_name"] for m in data]

    async def generate(self, prompt: str, model: str, params: dict | None = None) -> ImageResult:
        p = params or {}
        body = {
            "prompt": prompt,
            "negative_prompt": p.get("negative_prompt", ""),
            "steps": p.get("steps", 20),
            "cfg_scale": p.get("cfg_scale", 7),
            "width": p.get("width", 512),
            "height": p.get("height", 512),
            "sampler_name": p.get("sampler_name", "Euler a"),
            "batch_size": p.get("n", 1),
        }
        if model:
            body["override_settings"] = {"sd_model_checkpoint": model}
            body["override_settings_restore_afterwards"] = True

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/sdapi/v1/txt2img", json=body
            ) as resp:
                resp.raise_for_status()
                data = await resp.json()
                image_bytes_list: list[bytes] = []
                for raw in data["images"]:
                    if "," in raw:
                        raw = raw.split(",", 1)[1]
                    image_bytes_list.append(base64.b64decode(raw))
                return ImageResult(images=image_bytes_list, media_type="image/png")
