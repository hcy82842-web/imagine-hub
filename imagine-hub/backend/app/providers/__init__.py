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
        {"key": "size", "label": "Size", "type": "select", "default": "1920x1080",
         "options": [
             "256x256", "512x512", "768x768", "1024x1024", "1536x1536",
             "768x1024", "768x1360", "1024x1360", "1024x1792",
             "1024x768", "1360x768", "1360x1024", "1792x1024",
             "1536x640", "1920x1080",
         ]},
        {"key": "quality", "label": "Quality", "type": "select", "default": "hd",
         "options": ["standard", "hd"]},
        {"key": "n", "label": "Number of images", "type": "number", "default": 1, "min": 1},
    ],
    "sd_webui": [
        {"key": "n", "label": "Number of images", "type": "number", "default": 1, "min": 1},
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
        {"key": "n", "label": "Number of images", "type": "number", "default": 1, "min": 1},
    ],
    "custom": [
        {"key": "endpoint", "label": "Full Endpoint URL", "type": "text", "default": ""},
        {"key": "method", "label": "HTTP Method", "type": "select", "default": "POST",
         "options": ["POST", "GET"]},
        {"key": "headers", "label": "Headers (JSON)", "type": "text", "default": '{"Content-Type": "application/json"}'},
        {"key": "request_template", "label": "Request Body Template", "type": "text",
         "default": '{"prompt": "{{prompt}}", "model": "{{model}}"}'},
        {"key": "response_path", "label": "Response Path (sync)", "type": "text", "default": "data.0.url"},
        {"key": "image_type", "label": "Image Source", "type": "select", "default": "url",
         "options": ["url", "base64"]},
        {"key": "async_mode", "label": "Async Mode", "type": "select", "default": "false",
         "options": ["false", "true"]},
        {"key": "task_id_path", "label": "Task ID Path", "type": "text", "default": "data.task_id"},
        {"key": "poll_endpoint", "label": "Poll Endpoint", "type": "text", "default": ""},
        {"key": "poll_method", "label": "Poll Method", "type": "select", "default": "GET",
         "options": ["GET", "POST"]},
        {"key": "poll_field", "label": "Task ID Field Name", "type": "text", "default": "task_id"},
        {"key": "poll_field_position", "label": "Task ID Position", "type": "select", "default": "query",
         "options": ["query", "path", "body"]},
        {"key": "poll_status_path", "label": "Status Path", "type": "text", "default": "data.status"},
        {"key": "poll_result_path", "label": "Result Path", "type": "text", "default": "data.0.url"},
        {"key": "poll_result_type", "label": "Result Type", "type": "select", "default": "url",
         "options": ["url", "base64"]},
        {"key": "poll_interval", "label": "Poll Interval (s)", "type": "number", "default": 2.0, "min": 0.5, "max": 30, "step": 0.5},
        {"key": "max_polls", "label": "Max Polls", "type": "number", "default": 150, "min": 1, "max": 600},
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
