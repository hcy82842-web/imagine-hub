import aiohttp
from .base import BaseProvider, ImageResult

class OpenAICompatProvider(BaseProvider):
    async def list_models(self) -> list[str]:
        async with aiohttp.ClientSession() as session:
            headers = {}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            async with session.get(f"{self.base_url}/v1/models", headers=headers) as resp:
                resp.raise_for_status()
                data = await resp.json()
                return [m["id"] for m in data.get("data", [])]

    async def generate(self, prompt: str, model: str, params: dict | None = None) -> ImageResult:
        p = params or {}
        body = {
            "model": model,
            "prompt": prompt,
            "n": p.get("n", 1),
            "size": p.get("size", "1024x1024"),
        }
        if "quality" in p:
            body["quality"] = p["quality"]

        async with aiohttp.ClientSession() as session:
            headers = {"Content-Type": "application/json"}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            async with session.post(
                f"{self.base_url}/v1/images/generations",
                json=body,
                headers=headers,
            ) as resp:
                resp.raise_for_status()
                data = await resp.json()
                images = data.get("data") or data.get("images", [])
                url = images[0]["url"]
                async with session.get(url) as img_resp:
                    img_resp.raise_for_status()
                    img_bytes = await img_resp.read()
                    return ImageResult(
                        image_data=img_bytes,
                        media_type=img_resp.content_type or "image/png",
                    )
