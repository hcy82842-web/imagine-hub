from .base import BaseProvider, ImageResult
from .openai_compat import OpenAICompatProvider
from .sd_webui import SDWebUIProvider
from .custom import CustomProvider
from .replicate_provider import ReplicateProvider

PROVIDER_MAP: dict[str, type[BaseProvider]] = {
    "openai_compat": OpenAICompatProvider,
    "sd_webui": SDWebUIProvider,
    "custom": CustomProvider,
    "replicate": ReplicateProvider,
}

PARAM_SCHEMAS: dict[str, list[dict]] = {
    "openai_compat": [
        {"key": "size", "label": "Size", "type": "select", "default": "1024x1024",
         "options": ["256x256", "512x512", "1024x1024", "1024x1792", "1792x1024"]},
        {"key": "quality", "label": "Quality", "type": "select", "default": "standard",
         "options": ["standard", "hd"]},
        {"key": "n", "label": "Number of images", "type": "number", "default": 1, "min": 1, "max": 10},
    ],
    "sd_webui": [
        {"key": "width", "label": "Width", "type": "number", "default": 512, "min": 64, "max": 2048, "step": 64},
        {"key": "height", "label": "Height", "type": "number", "default": 512, "min": 64, "max": 2048, "step": 64},
        {"key": "steps", "label": "Steps", "type": "number", "default": 20, "min": 1, "max": 150},
        {"key": "cfg_scale", "label": "CFG Scale", "type": "number", "default": 7, "min": 1, "max": 30, "step": 0.5},
        {"key": "sampler_name", "label": "Sampler", "type": "select", "default": "Euler a",
         "options": ["Euler a", "Euler", "DPM++ 2M Karras", "DPM++ 2S a Karras",
                     "DDIM", "UniPC", "LMS", "Heun"]},
        {"key": "negative_prompt", "label": "Negative Prompt", "type": "text", "default": ""},
    ],
    "replicate": [
        {"key": "size", "label": "Aspect Ratio", "type": "select", "default": "1024x1024",
         "options": ["1024x1024", "1360x768", "768x1360", "1536x640", "640x1536"]},
        {"key": "steps", "label": "Steps", "type": "number", "default": 25, "min": 1, "max": 50},
        {"key": "guidance_scale", "label": "Guidance Scale", "type": "number", "default": 7.5, "min": 1, "max": 20, "step": 0.5},
        {"key": "n", "label": "Number of images", "type": "number", "default": 1, "min": 1, "max": 4},
    ],
    "custom": [
        {"key": "endpoint", "label": "Full Endpoint URL", "type": "text", "default": ""},
        {"key": "method", "label": "HTTP Method", "type": "select", "default": "POST",
         "options": ["POST", "GET"]},
        {"key": "headers", "label": "Headers (JSON)", "type": "text", "default": '{"Content-Type": "application/json"}'},
        {"key": "request_template", "label": "Request Body Template", "type": "text",
         "default": '{"prompt": "{{prompt}}", "model": "{{model}}"}'},
        {"key": "response_path", "label": "Response Path", "type": "text", "default": "data.0.url"},
        {"key": "image_type", "label": "Image Source", "type": "select", "default": "url",
         "options": ["url", "base64"]},
    ],
}

def get_provider(provider_type: str, base_url: str, api_key: str, config: str = "{}") -> BaseProvider:
    if provider_type == "custom":
        return CustomProvider(base_url=base_url, api_key=api_key, config=config)
    cls = PROVIDER_MAP.get(provider_type)
    if not cls:
        raise ValueError(f"Unknown provider type: {provider_type}")
    return cls(base_url=base_url, api_key=api_key)

def get_param_schema(provider_type: str) -> list[dict]:
    return PARAM_SCHEMAS.get(provider_type, [])
