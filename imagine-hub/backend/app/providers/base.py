from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class ImageResult:
    image_data: bytes
    media_type: str = "image/png"

class BaseProvider(ABC):
    def __init__(self, base_url: str, api_key: str = ""):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    @abstractmethod
    async def list_models(self) -> list[str]:
        ...

    @abstractmethod
    async def generate(self, prompt: str, model: str, params: dict | None = None) -> ImageResult:
        ...
