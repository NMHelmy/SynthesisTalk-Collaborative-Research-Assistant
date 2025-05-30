from fastapi import APIRouter, UploadFile, File, HTTPException
import os
from pathlib import Path
from typing import Optional
from uuid import uuid4
from PyPDF2 import PdfReader
import docx
from fastapi import Query

router = APIRouter()

UPLOAD_DIR = Path("uploads")
EXTRACTED_DIR = Path("extracted")
UPLOAD_DIR.mkdir(exist_ok=True)
EXTRACTED_DIR.mkdir(exist_ok=True)




def extract_text(file_path: Path, content_type: str) -> str:
    if content_type == "application/pdf":
        reader = PdfReader(str(file_path))
        return "\n".join(page.extract_text() for page in reader.pages if page.extract_text())
    elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        doc = docx.Document(str(file_path))
        return "\n".join(para.text for para in doc.paragraphs if para.text.strip())
    elif file_path.suffix == ".txt":
        return file_path.read_text(encoding="utf-8")
    raise ValueError("Unsupported file type")

@router.get("/extract/{filename}")
async def extract_existing_file(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    try:
        if filename.endswith(".pdf"):
            content_type = "application/pdf"
        elif filename.endswith(".docx"):
            content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif filename.endswith(".txt"):
            content_type = "text/plain"
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")

        text = extract_text(file_path, content_type)
        return {"filename": filename, "text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@router.get("/api/extract/{filename}")
def extract_existing_file(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    # Guess content type by extension
    ext = file_path.suffix.lower()
    content_type = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".txt": "text/plain"
    }.get(ext)

    if not content_type:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    extracted_text = extract_text(file_path, content_type)
    if not extracted_text:
        raise HTTPException(status_code=500, detail="Failed to extract text")

    return {
        "filename": filename,
        "text": extracted_text,
        "message": "Text extracted successfully"
    }

@router.post("/api/extract")
async def upload_and_extract(file: UploadFile = File(...)):
    file_ext = os.path.splitext(file.filename)[1].lower()
    allowed = {".pdf", ".docx", ".txt"}
    if file_ext not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    safe_filename = file.filename.replace("/", "_").replace("\\", "_")  # sanitize
    file_path = UPLOAD_DIR / safe_filename

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    extracted_text = extract_text(file_path, file.content_type)
    if not extracted_text:
        raise HTTPException(status_code=500, detail="Failed to extract text")

    # Save extracted content to separate file
    extracted_file = EXTRACTED_DIR / f"{safe_filename}.txt"
    extracted_file.write_text(extracted_text, encoding="utf-8")

    return {
        "filename": file.filename,
        "extracted_file": extracted_file.name,
        "message": "Text extracted and saved successfully",
        "text": extracted_text   
    }
