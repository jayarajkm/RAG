
from typing import Annotated

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from groq import APIError

from rag_services import (
    ask_question,
    create_session,
    delete_session,
)

app = FastAPI(title="Session-Based RAG Document Assistant")
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    session_id: str
    question: str = Field(min_length=1, max_length=4000)


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}


@app.post("/api/documents/upload")
async def upload_documents(
    files: Annotated[list[UploadFile], File(...)],
):
    if not files:
        raise HTTPException(
            status_code=400,
            detail="Upload at least one document.",
        )

    try:
        uploaded = []

        for file in files:
            filename = file.filename or "unnamed"

            # Validate the file extension before reading its contents.
            if not filename.lower().endswith(
                (".pdf", ".docx", ".txt")
            ):
                raise ValueError(
                    f"Unsupported file type: {filename}"
                )

            # Read into memory; never write the original file to disk.
            content = await file.read()

            uploaded.append((filename, content))

        return create_session(uploaded)

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    finally:
        for file in files:
            await file.close()


@app.post("/api/chat")
def chat(request: ChatRequest):
    try:
        return ask_question(
            request.session_id,
            request.question,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except APIError as exc:
        raise HTTPException(
            status_code=502,
            detail="The LLM service failed to generate an answer.",
        ) from exc


@app.delete("/api/sessions/{session_id}")
def clear_session(session_id: str):
    if not delete_session(session_id):
        raise HTTPException(
            status_code=404,
            detail="Session not found or already expired.",
        )

    return {"message": "Session cleared successfully."}
