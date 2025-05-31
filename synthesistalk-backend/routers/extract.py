from fastapi import APIRouter, UploadFile, File, HTTPException
import os
from pathlib import Path
from urllib.parse import unquote
import docx
import fitz  # PyMuPDF
from pdf2image import convert_from_path
import pytesseract

router = APIRouter()

UPLOAD_DIR = Path("uploads")
EXTRACTED_DIR = Path("extracted")
UPLOAD_DIR.mkdir(exist_ok=True)
EXTRACTED_DIR.mkdir(exist_ok=True)

def extract_text(file_path: Path, content_type: str) -> str:
    if content_type == "application/pdf":
        try:
            # First try PyMuPDF
            doc = fitz.open(str(file_path))
            text = "\n".join([page.get_text() for page in doc])
            doc.close()
            if text.strip():
                print("✅ Extracted text using fitz.")
                return text
            else:
                # Fallback to OCR
                print("⚠️ No selectable text found — using OCR fallback.")
                images = convert_from_path(str(file_path))
                ocr_text = "\n".join([pytesseract.image_to_string(img) for img in images])
                return ocr_text
        except Exception as e:
            raise ValueError(f"PDF extraction failed: {e}")
    
    elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        doc = docx.Document(str(file_path))
        return "\n".join(para.text for para in doc.paragraphs if para.text.strip())

    elif file_path.suffix == ".txt":
        return file_path.read_text(encoding="utf-8")

    raise ValueError("Unsupported file type")

@router.get("/extract/{filename}")
def extract_existing_file(filename: str):
    filename = unquote(filename)
    file_path = UPLOAD_DIR / filename

    print("🔍 Requested filename:", filename)
    print("📁 Full path being searched:", file_path.resolve())
    print("📁 File exists:", file_path.exists())

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    ext = file_path.suffix.lower()
    content_type = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".txt": "text/plain"
    }.get(ext)

    if not content_type:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    try:
        extracted_text = extract_text(file_path, content_type)
        print("📄 Extracted Text Preview:\n", extracted_text[:1000])
    except Exception as e:
        print("❌ Extraction error:", e)
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

    if not extracted_text.strip():
        raise HTTPException(status_code=500, detail="No extractable text found.")

    return {
        "filename": filename,
        "text": extracted_text[:5000],
        "message": "Text extracted successfully"
    }

@router.post("/extract")
async def upload_and_extract(file: UploadFile = File(...)):
    file_ext = os.path.splitext(file.filename)[1].lower()
    allowed = {".pdf", ".docx", ".txt"}
    if file_ext not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    safe_filename = file.filename.replace("/", "_").replace("\\", "_")
    file_path = UPLOAD_DIR / safe_filename

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    try:
        extracted_text = extract_text(file_path, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

    if not extracted_text.strip():
        raise HTTPException(status_code=500, detail="No extractable text found.")

    extracted_file = EXTRACTED_DIR / f"{safe_filename}.txt"
    extracted_file.write_text(extracted_text, encoding="utf-8")

    return {
        "filename": file.filename,
        "extracted_file": extracted_file.name,
        "message": "Text extracted and saved successfully",
        "text": extracted_text[:5000]
    }
