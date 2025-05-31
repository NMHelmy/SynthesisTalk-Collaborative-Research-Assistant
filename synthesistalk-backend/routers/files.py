# routers/files.py 
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import json
from starlette.responses import FileResponse
from urllib.parse import unquote

router = APIRouter()

DATA_PATH = "data/files.json"
UPLOAD_FOLDER = "uploads"

class FileEntry(BaseModel):
    filename: str
    content: str

@router.get("/files")
async def list_files():
    if not os.path.exists(DATA_PATH):
        return {"files": []}
    with open(DATA_PATH, "r") as f:
        files = json.load(f)
    return {"files": files}

@router.delete("/files/{filename}")
async def delete_file(filename: str):
    decoded_filename = unquote(filename)
    file_path = os.path.join(UPLOAD_FOLDER, decoded_filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    os.remove(file_path)

    # Also remove from files.json
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, "r") as f:
            data = json.load(f)
        data = [f for f in data if f["filename"] != decoded_filename]
        with open(DATA_PATH, "w") as f:
            json.dump(data, f, indent=2)

    return {"message": f"{decoded_filename} deleted"}

@router.post("/files")
def save_file(entry: FileEntry):
    os.makedirs("data", exist_ok=True)
    data = []
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, "r") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = []
    # Avoid duplicates
    if any(d["filename"] == entry.filename for d in data):
        raise HTTPException(status_code=400, detail="File already exists.")
    data.append({"filename": entry.filename, "content": entry.content})
    with open(DATA_PATH, "w") as f:
        json.dump(data, f, indent=2)
    return {"message": f"Saved {entry.filename}"}
from urllib.parse import unquote  # Add this at the top

@router.put("/files/{filename}")
def update_file(filename: str, entry: FileEntry):
    if not os.path.exists(DATA_PATH):
        raise HTTPException(status_code=404, detail="No files found.")
    with open(DATA_PATH, "r") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Corrupted file store.")
    updated = False
    for file in data:
        if file["filename"] == filename:
            file["content"] = entry.content
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail="File not found.")
    with open(DATA_PATH, "w") as f:
        json.dump(data, f, indent=2)
    return {"message": f"Updated {filename}"}
