import json
import aiohttp
from .base import BaseProvider, ImageResult

class CustomProvider(BaseProvider):
    def __init__(self, base_url: str, api_key: str = "", config: str = "{}"):
        super().__init__(base_url, api_key)
        self._cfg = json.loads(config)

    async def list_models(self) -> list[str]:
        return ["custom"]

    async def generate(self, prompt: str, model: str, params: dict | None = None) -> ImageResult:
        cfg = dict(self._cfg)
        if params:
            cfg.update(params)

        endpoint = cfg.get("endpoint", self.base_url)
        if not endpoint:
            raise ValueError("Custom provider: endpoint is required")
        method = cfg.get("method", "POST").upper()
        raw_headers = cfg.get("headers", {"Content-Type": "application/json"})
        headers = raw_headers if isinstance(raw_headers, dict) else json.loads(raw_headers)
        if self.api_key and "Authorization" not in headers:
            headers["Authorization"] = f"Bearer {self.api_key}"

        request_template = cfg.get("request_template", '{"prompt": "{{prompt}}"}')
        response_path = cfg.get("response_path", "data.0.url")
        image_type = cfg.get("image_type", "url")

        body_str = request_template.replace("{{prompt}}", prompt).replace("{{model}}", model)
        body = json.loads(body_str) if method == "POST" else None

        async with aiohttp.ClientSession() as session:
            kwargs = {"headers": headers}
            if method == "POST":
                kwargs["json"] = body

            async with session.request(method, endpoint, **kwargs) as resp:
                resp.raise_for_status()
                data = await resp.json()

                parts = response_path.split(".")
                val = data
                for p in parts:
                    if p.isdigit():
                        val = val[int(p)]
                    else:
                        val = val[p]

                if image_type == "base64":
                    raw = val
                    if "," in raw:
                        raw = raw.split(",", 1)[1]
                    import base64 as b64
                    img_bytes = b64.b64decode(raw)
                    return ImageResult(image_data=img_bytes, media_type="image/png")
                else:
                    async with session.get(val) as img_resp:
                        img_resp.raise_for_status()
                        img_bytes = await img_resp.read()
                        return ImageResult(
                            image_data=img_bytes,
                            media_type=img_resp.content_type or "image/png",
                        )
