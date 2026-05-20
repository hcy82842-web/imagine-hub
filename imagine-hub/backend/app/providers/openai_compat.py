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
        n = p.get("n", 1)
        body = {
            "model": model,
            "prompt": prompt,
            "n": n,
            "size": p.get("size", "1920x1080"),
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
                entries = data.get("data") or data.get("images", [])
                media_type = "image/png"
                image_bytes_list: list[bytes] = []
                for entry in entries:
                    url = entry["url"]
                    async with session.get(url) as img_resp:
                        img_resp.raise_for_status()
                        image_bytes_list.append(await img_resp.read())
                        media_type = img_resp.content_type or "image/png"
                extra = {}
                for h, v in resp.headers.items():
                    hl = h.lower()
                    if hl.startswith("x-ratelimit-") or hl.startswith("x-rate-limit-") or hl in ("x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset"):
                        extra[h] = v
                return ImageResult(
                    images=image_bytes_list,
                    media_type=media_type,
                    extra=extra,
                )
