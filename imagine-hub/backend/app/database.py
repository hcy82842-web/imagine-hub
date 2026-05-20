from sqlmodel import SQLModel, create_engine
from app.config import DB_PATH
from app.models.provider import ProviderConfig
from app.models.history import GenerationHistory

engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
