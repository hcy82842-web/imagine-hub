import json
import aiohttp


DEFAULT_TRANSFORM_SYSTEM_PROMPT = (
    "You are an AI prompt transformation assistant for image generation. "
    "The user provides a description (typically in Chinese). "
    "Your job is to transform it into an optimized English prompt "
    "for the target image generation model, and generate a complementary negative prompt.\n\n"
    "Target model: {{model_id}}\n\n"
    "Output ONLY valid JSON with exactly two fields:\n"
    '1. "prompt": A detailed English prompt optimized for {{model_id}} '
    "(include subject, style, lighting, composition, quality keywords)\n"
    '2. "negative_prompt": A comprehensive negative prompt addressing '
    "common weaknesses of {{model_id}} (artifacts, anatomy issues, quality defects)\n\n"
    "Consider:\n"
    "- What does {{model_id}} excel at? Emphasize those aspects.\n"
    "- What are {{model_id}}'s weaknesses? Cover them in negative_prompt.\n\n"
    "Example:\n"
    '{"prompt": "A majestic dragon soaring above a neon-lit cyberpunk city, '
    "cinematic lighting, volumetric fog, 8K, intricate detail\",\n"
    '"negative_prompt": "blurry, low quality, distorted hands, bad anatomy, '
    'extra limbs, watermark, text, signature"}\n\n'
    "Do not include any text before or after the JSON."
)


class PromptTransformer:
    def __init__(self, base_url: str, api_key: str, model: str, system_prompt: str = ""):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.system_prompt = system_prompt or DEFAULT_TRANSFORM_SYSTEM_PROMPT

    async def transform(self, prompt: str, model_id: str) -> tuple[str, str]:
        system_prompt = self.system_prompt.replace("{{model_id}}", model_id)
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        body = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 1024,
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=body, headers=headers,
                                     timeout=aiohttp.ClientTimeout(total=30)) as resp:
                resp.raise_for_status()
                data = await resp.json()
                content = data["choices"][0]["message"]["content"].strip()
                result = json.loads(content)
                return result["prompt"], result.get("negative_prompt", "")
