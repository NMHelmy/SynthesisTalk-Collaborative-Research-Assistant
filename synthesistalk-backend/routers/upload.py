# upload.py
from fastapi import APIRouter, UploadFile, File
import os
import json

router = APIRouter()
DATA_PATH = "data/files.json"

@router.post("/upload/{user_id}")
async def upload_files(user_id: str, files: list[UploadFile] = File(...)):
    # Save files directly into flat /uploads directory
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("data", exist_ok=True)

    user_data_path = f"data/{user_id}_files.json"
    if os.path.exists(user_data_path):
        with open(user_data_path, "r") as f:
            existing = json.load(f)
    else:
        existing = []

    uploaded = []

    for file in files:
        contents = await file.read()
        save_path = os.path.join("uploads", file.filename)  
        
        with open(save_path, "wb") as f:
            f.write(contents)

        entry = {
            "filename": file.filename,
            "content": contents.decode("utf-8", errors="ignore")
        }

        # Avoid duplicates in user's metadata file
        if not any(e["filename"] == entry["filename"] for e in existing):
            existing.append(entry)
            uploaded.append(file.filename)

    with open(user_data_path, "w") as f:
        json.dump(existing, f, indent=2)

    return {"message": f"Uploaded files: {uploaded}"}
