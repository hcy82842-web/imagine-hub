from sqlmodel import SQLModel, Field, Column, JSON
from typing import Optional

class ProviderConfig(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    provider_type: str
    base_url: str
    api_key: str = Field(default="")
    models: str = Field(default="[]")
    config: str = Field(default="{}")
    created_at: str = Field(default="")

    def get_models_list(self) -> list[str]:
        import json
        return json.loads(self.models)

    def set_models_list(self, models_list: list[str]):
        import json
        self.models = json.dumps(models_list)
