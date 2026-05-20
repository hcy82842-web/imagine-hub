import uuid
from datetime import datetime
from app.config import IMAGES_DIR

def save_image(image_data: bytes) -> str:
    date_str = datetime.now().strftime("%Y%m%d")
    dir_path = IMAGES_DIR / date_str
    dir_path.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.png"
    file_path = dir_path / filename
    file_path.write_bytes(image_data)
    return str(file_path.relative_to(IMAGES_DIR.parent))
