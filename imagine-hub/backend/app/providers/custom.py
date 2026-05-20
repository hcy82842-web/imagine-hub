import json
import asyncio
import random
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

        body_str = request_template.replace("{{prompt}}", prompt).replace("{{model}}", model)
        body = json.loads(body_str) if method == "POST" else None

        async with aiohttp.ClientSession() as session:
            kwargs = {"headers": headers}
            if method == "POST":
                kwargs["json"] = body

            async with session.request(method, endpoint, **kwargs) as resp:
                resp.raise_for_status()
                data = await resp.json()

            if cfg.get("async_mode", False):
                return await self._handle_async(session, data, cfg, headers)
            else:
                return await self._handle_sync(session, data, cfg)

    async def _handle_sync(self, session: aiohttp.ClientSession, data: dict, cfg: dict) -> ImageResult:
        response_path = cfg.get("response_path", "data.0.url")
        image_type = cfg.get("image_type", "url")
        val = self._navigate(data, response_path)
        return await self._resolve_image(session, val, image_type)

    async def _handle_async(self, session: aiohttp.ClientSession, data: dict, cfg: dict, headers: dict) -> ImageResult:
        task_id_path = cfg.get("task_id_path", "data.task_id")
        task_id = self._navigate(data, task_id_path)
        if not task_id:
            raise ValueError(f"Async submit: task_id not found at '{task_id_path}'")

        poll_endpoint = cfg.get("poll_endpoint", "")
        if not poll_endpoint:
            ep = endpoint.rstrip("/")
            parts = ep.split("/")
            if len(parts) > 1:
                poll_endpoint = "/".join(parts[:-1]) + "/task-result"
        if not poll_endpoint:
            raise ValueError("Custom provider async: poll_endpoint could not be determined, please set it in config")

        poll_method = cfg.get("poll_method", "GET").upper()
        poll_field = cfg.get("poll_field", "task_id")
        poll_position = cfg.get("poll_field_position", "query")
        poll_interval = float(cfg.get("poll_interval", 2.0))
        max_polls = int(cfg.get("max_polls", 150))
        completed = cfg.get("poll_completed_values", ["completed", "success", "succeeded"])
        failed_vals = cfg.get("poll_failed_values", ["failed", "error"])
        status_path = cfg.get("poll_status_path", "data.status")
        result_path = cfg.get("poll_result_path", "data.0.url")
        result_type = cfg.get("poll_result_type", "url")

        for attempt in range(max_polls):
            jitter = random.uniform(0.8, 1.2)
            await asyncio.sleep(poll_interval * jitter)

            if poll_method == "GET":
                if poll_position == "path":
                    url = f"{poll_endpoint}/{task_id}"
                    poll_body = None
                else:
                    import urllib.parse
                    sep = "&" if "?" in poll_endpoint else "?"
                    url = f"{poll_endpoint}{sep}{poll_field}={urllib.parse.quote(str(task_id))}"
                    poll_body = None
            else:
                url = poll_endpoint
                if poll_position == "path":
                    url = f"{poll_endpoint}/{task_id}"
                    poll_body = None
                elif poll_position == "body":
                    poll_body = {poll_field: task_id}
                else:
                    poll_body = {poll_field: task_id}

            async with session.request(poll_method, url, json=poll_body, headers=headers) as resp:
                resp.raise_for_status()
                poll_data = await resp.json()

            status = self._navigate(poll_data, status_path) if status_path else ""
            if status in completed:
                val = self._navigate(poll_data, result_path)
                return await self._resolve_image(session, val, result_type)
            elif status in failed_vals:
                raise ValueError(f"Async task failed (status='{status}'): {json.dumps(poll_data, ensure_ascii=False)}")

        raise TimeoutError(f"Async task did not complete after {max_polls * poll_interval:.0f}s")

    def _navigate(self, data: dict | list, path: str):
        parts = path.split(".")
        val = data
        for p in parts:
            if isinstance(val, list) and p.isdigit():
                val = val[int(p)]
            elif isinstance(val, dict):
                val = val.get(p, "")
            else:
                return ""
        return val

    async def _resolve_image(self, session: aiohttp.ClientSession, val, image_type: str) -> ImageResult:
        if image_type == "base64":
            raw = val
            if "," in raw:
                raw = raw.split(",", 1)[1]
            import base64 as b64
            img_bytes = b64.b64decode(raw)
            return ImageResult(images=[img_bytes], media_type="image/png")
        else:
            async with session.get(val) as img_resp:
                img_resp.raise_for_status()
                img_bytes = await img_resp.read()
                return ImageResult(
                    images=[img_bytes],
                    media_type=img_resp.content_type or "image/png",
                )
