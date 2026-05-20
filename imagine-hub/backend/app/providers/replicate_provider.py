import asyncio
import aiohttp
from .base import BaseProvider, ImageResult

POLL_INTERVAL = 1.5
MAX_POLLS = 60

class ReplicateProvider(BaseProvider):
    async def list_models(self) -> list[str]:
        return [
            "black-forest-labs/flux-schnell",
            "black-forest-labs/flux-dev",
            "stability-ai/sdxl",
            "stability-ai/stable-diffusion-3",
            "playgroundai/playground-v2.5-1024px-aesthetic",
            "recraft-ai/recraft-v3",
        ]

    async def generate(self, prompt: str, model: str, params: dict | None = None) -> ImageResult:
        p = params or {}
        n = p.get("n", 1)
        body = {
            "input": {
                "prompt": prompt,
                "num_outputs": n,
                "num_inference_steps": p.get("steps", 25),
                "guidance_scale": p.get("guidance_scale", 7.5),
            }
        }
        if p.get("size"):
            body["input"]["aspect_ratio"] = p["size"]

        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Prefer": "wait",
            }
            async with session.post(
                f"{self.base_url}/v1/models/{model}/predictions",
                json=body,
                headers=headers,
            ) as resp:
                resp.raise_for_status()
                prediction = await resp.json()

            prediction_id = prediction.get("id")
            if not prediction_id:
                raise ValueError("No prediction ID returned")

            for _ in range(MAX_POLLS):
                async with session.get(
                    f"{self.base_url}/v1/predictions/{prediction_id}",
                    headers=headers,
                ) as resp:
                    resp.raise_for_status()
                    prediction = await resp.json()
                    status = prediction.get("status")
                    if status == "succeeded":
                        output = prediction.get("output")
                        urls = output if isinstance(output, list) else [output]
                        media_type = "image/png"
                        image_bytes_list: list[bytes] = []
                        for url in urls:
                            async with session.get(url) as img_resp:
                                img_resp.raise_for_status()
                                image_bytes_list.append(await img_resp.read())
                                media_type = img_resp.content_type or "image/png"
                        return ImageResult(
                            images=image_bytes_list,
                            media_type=media_type,
                        )
                    elif status == "failed":
                        raise ValueError(f"Replicate prediction failed: {prediction.get('error', 'unknown')}")
                    await asyncio.sleep(POLL_INTERVAL)

            raise TimeoutError("Replicate prediction timed out")
