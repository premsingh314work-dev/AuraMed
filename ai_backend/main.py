import os
import shutil
import tempfile
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

from ocr_engine import process_document
from ai_service import (
    analyze_report_text,
    answer_report_question,
    summarize_report_comparison,
    AIServiceError,
)

app = FastAPI(title="AI Medical Report Explainer API")

# Configure CORS to allow the Express gateway to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this to Express backend in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    question: str
    report_data: Dict[str, Any]
    chat_history: List[Dict[str, Any]]
    
class CompareSummaryRequest(BaseModel):
    reports: List[Dict[str, Any]]
    
@app.get("/")
def read_root():
    return {"status": "AI Backend is running"}

@app.post("/analyze")
async def analyze_report(file: UploadFile = File(...)):
    """Receives a report file (PDF or Image), processes content, and returns structured AI explanation."""
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()

    if ext not in [".pdf", ".png", ".jpg", ".jpeg"]:
        raise HTTPException(status_code=400, detail="Only PDF and Image files (PNG, JPG, JPEG) are supported.")

    # Save to a temporary file
    suffix = ext
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        temp_file_path = tmp.name

    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Process document (extract text or image bytes)
        print(f"Processing document {filename}...")
        doc_data = process_document(temp_file_path)

        if doc_data["type"] == "text":
            print(f"Extracted {len(doc_data['data'])} text characters. Proceeding to AI analysis...")
            raw_text = doc_data["data"]
        else:
            print("Document processed as scanned image/PDF. Proceeding to Vision AI analysis...")
            raw_text = "[Scanned Document - Processed via Vision AI]"

        # Analyze using Groq / Mock
        analysis = analyze_report_text(doc_data)
        
        # Return analysis along with raw text
        return {
            "fileName": filename,
            "rawText": raw_text,
            "analysis": analysis
        }

    except AIServiceError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"Error processing report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")
        
    finally:
        # Cleanup temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.post("/chat")
async def chat_with_report(req: ChatRequest):
    """Answer questions about a specific report using GROQ/Mock AI."""
    try:
        answer = answer_report_question(req.question, req.report_data, req.chat_history)
        return {"answer": answer}
    except AIServiceError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Unexpected AI backend error")



@app.post("/compare-summary")
async def compare_summary(req: CompareSummaryRequest):
    """Generate a concise AI summary comparing 2–3 medical reports."""

    if not 2 <= len(req.reports) <= 3:
        raise HTTPException(
            status_code=400,
            detail="Provide between 2 and 3 reports for comparison.",
        )

    try:
        summary = summarize_report_comparison(req.reports)
        return summary

    except AIServiceError as e:
        # Log the actual error server-side, return a generic message.
        print(f"Comparison summary AI error: {e}")

        raise HTTPException(
            status_code=503,
            detail="Could not generate the comparison summary.",
        ) from e

    except Exception as e:
        print(f"Unexpected comparison summary error: {e}")

        raise HTTPException(
            status_code=500,
            detail="Unexpected AI backend error.",
        ) from e


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
