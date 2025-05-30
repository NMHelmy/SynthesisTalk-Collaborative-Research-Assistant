from fastapi import APIRouter, UploadFile, File
import os
import json

router = APIRouter()  # ✅ THIS LINE DEFINES `router`

DATA_PATH = "data/files.json"

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()
    os.makedirs("uploads", exist_ok=True)
    save_path = os.path.join("uploads", file.filename)

    with open(save_path, "wb") as f:
        f.write(contents)

    # Save metadata to files.json
    os.makedirs("data", exist_ok=True)
    entry = {"filename": file.filename, "content": contents.decode("utf-8", errors="ignore")}

    existing = []
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, "r") as f:
            existing = json.load(f)

    if not any(e["filename"] == entry["filename"] for e in existing):
        existing.append(entry)
        with open(DATA_PATH, "w") as f:
            json.dump(existing, f, indent=2)

    return {"message": f"Uploaded and saved {file.filename}"}
