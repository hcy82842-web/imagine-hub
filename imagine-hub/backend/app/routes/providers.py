from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select
from datetime import datetime
from app.database import engine
from app.models.provider import ProviderConfig
from app.models.schemas import ProviderCreate, ProviderUpdate, ProviderResponse

router = APIRouter(prefix="/api/providers", tags=["providers"])

@router.get("", response_model=list[ProviderResponse])
def list_providers():
    with Session(engine) as session:
        providers = session.exec(select(ProviderConfig)).all()
        return providers

@router.post("", response_model=ProviderResponse, status_code=201)
def create_provider(data: ProviderCreate):
    with Session(engine) as session:
        provider = ProviderConfig(
            name=data.name,
            provider_type=data.provider_type,
            base_url=data.base_url,
            api_key=data.api_key,
            config=data.config,
            created_at=datetime.now().isoformat(),
        )
        session.add(provider)
        session.commit()
        session.refresh(provider)
        return provider

@router.get("/{provider_id}", response_model=ProviderResponse)
def get_provider(provider_id: int):
    with Session(engine) as session:
        provider = session.get(ProviderConfig, provider_id)
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        return provider

@router.put("/{provider_id}", response_model=ProviderResponse)
def update_provider(provider_id: int, data: ProviderUpdate):
    with Session(engine) as session:
        provider = session.get(ProviderConfig, provider_id)
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(provider, key, value)
        session.add(provider)
        session.commit()
        session.refresh(provider)
        return provider

@router.delete("/{provider_id}", status_code=204)
def delete_provider(provider_id: int):
    with Session(engine) as session:
        provider = session.get(ProviderConfig, provider_id)
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        session.delete(provider)
        session.commit()
