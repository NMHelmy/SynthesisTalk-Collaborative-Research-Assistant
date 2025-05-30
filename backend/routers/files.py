# routers/files.py 
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import json

router = APIRouter()

DATA_PATH = "data/files.json"

class FileEntry(BaseModel):
    filename: str
    content: str

@router.get("/files")
def list_files():
    if not os.path.exists(DATA_PATH):
        return {"files": []}
    try:
        with open(DATA_PATH, "r") as f:
            content = json.load(f)
        # Validate structure
        if isinstance(content, list) and all("filename" in f for f in content):
            return {"files": content}
        else:
            return {"files": []}
    except json.JSONDecodeError:
        return {"files": []}

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

@router.delete("/files/{filename}")
def delete_file(filename: str):
    if not os.path.exists(DATA_PATH):
        raise HTTPException(status_code=404, detail="No files to delete.")
    with open(DATA_PATH, "r") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Corrupted file store.")
    filtered = [f for f in data if f["filename"] != filename]
    if len(filtered) == len(data):
        raise HTTPException(status_code=404, detail="File not found.")
    with open(DATA_PATH, "w") as f:
        json.dump(filtered, f, indent=2)
    return {"message": f"Deleted {filename}"}

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
