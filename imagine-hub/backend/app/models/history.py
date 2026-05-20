from sqlmodel import SQLModel, Field
from typing import Optional

class GenerationHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    prompt: str
    provider_id: int
    provider_name: str = Field(default="")
    model_name: str
    params: str = Field(default="{}")
    image_path: str = Field(default="")
    created_at: str = Field(default="")
