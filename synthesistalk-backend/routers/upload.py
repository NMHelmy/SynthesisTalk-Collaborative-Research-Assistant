# upload.py
from fastapi import APIRouter, UploadFile, File
import os
import json

router = APIRouter()
DATA_PATH = "data/files.json"

@router.post("/upload")
async def upload_files(files: list[UploadFile] = File(...)):
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("data", exist_ok=True)

    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, "r") as f:
            existing = json.load(f)
    else:
        existing = []

    uploaded = []

    for file in files:
        contents = await file.read()
        save_path = os.path.join("uploads", file.filename)
        print("Saved file to:", save_path)

        with open(save_path, "wb") as f:
            f.write(contents)

        entry = {
            "filename": file.filename,
            "content": contents.decode("utf-8", errors="ignore")
        }

        if not any(e["filename"] == entry["filename"] for e in existing):
            existing.append(entry)
            uploaded.append(file.filename)

    with open(DATA_PATH, "w") as f:
        json.dump(existing, f, indent=2)

    return {"message": f"Uploaded files: {uploaded}"}
