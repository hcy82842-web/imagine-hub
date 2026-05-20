import base64
from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select
from app.database import engine
from app.models.history import GenerationHistory
from app.models.schemas import HistoryItem
from app.config import DATA_DIR

router = APIRouter(prefix="/api/history", tags=["history"])

@router.get("", response_model=list[HistoryItem])
def list_history():
    with Session(engine) as session:
        records = session.exec(
            select(GenerationHistory).order_by(GenerationHistory.id.desc()).limit(50)
        ).all()
        items = []
        for r in records:
            img_path = DATA_DIR / r.image_path
            img_b64 = ""
            if img_path.exists():
                img_b64 = base64.b64encode(img_path.read_bytes()).decode()
            items.append(HistoryItem(
                id=r.id,
                prompt=r.prompt,
                provider_id=r.provider_id,
                provider_name=r.provider_name,
                model_name=r.model_name,
                params=r.params,
                image_base64=img_b64,
                created_at=r.created_at,
            ))
        return items

@router.delete("/{history_id}")
def delete_history(history_id: int):
    with Session(engine) as session:
        record = session.get(GenerationHistory, history_id)
        if not record:
            raise HTTPException(status_code=404, detail="History not found")
        img_path = DATA_DIR / record.image_path
        if img_path.exists():
            img_path.unlink()
        session.delete(record)
        session.commit()
    return {"ok": True}
