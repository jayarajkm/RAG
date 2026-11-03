# RAG Document Assistant

A full-stack document question-answering app. Upload PDF, DOCX, or TXT files, then ask questions grounded in their contents. The backend retrieves relevant text chunks and sends those excerpts to a Groq-hosted language model to generate an answer with source references.

## Features

- Upload one or more PDF, DOCX, or TXT documents (up to 10 MB per file).
- Extract and split document text into overlapping chunks.
- Find relevant chunks with semantic similarity search.
- Generate answers through the Groq API and return source filenames, chunk IDs, and relevance scores.
- Keep each upload in a temporary session that expires after one hour of inactivity.
- Clear a session when finished. Uploaded files and embeddings are held in backend memory and are not written to disk.

## Technology

### Backend

- Python and FastAPI for the HTTP API
- Uvicorn for local development serving
- Sentence Transformers (`all-MiniLM-L6-v2`) and PyTorch for embeddings
- Cosine similarity for retrieving the four most relevant chunks
- PyPDF and python-docx for PDF and DOCX text extraction
- Groq API for answer generation
- python-dotenv for local environment configuration

### Frontend

- React 19 and TypeScript
- Vite for development and production builds
- Redux Toolkit and React Redux for application state
- Tailwind CSS 4 for styling

> ChromaDB is currently listed in the backend dependencies, but this version stores embeddings in temporary in-memory sessions rather than using a persistent vector database.

## Requirements

- Python 3.10 or later
- Node.js and npm (use a version supported by the installed Vite release)
- A Groq API key

## Setup

### 1. Configure and start the backend

From the repository root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

Open `backend/.env` and replace the placeholder with your Groq API key. The default model is `openai/gpt-oss-20b`; set `GROQ_MODEL` there if you want to use another model available to your Groq account. Keep `.env` private and do not commit it.

Start the API from the `backend` directory with the virtual environment active:

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The first run may download the Sentence Transformers model. The API health check is at <http://127.0.0.1:8000/api/health>, and interactive API documentation is at <http://127.0.0.1:8000/docs>.

### 2. Start the frontend

In a second terminal, from the repository root:

```bash
cd frontend/rag-chat-ui
npm ci
npm run dev
```

Open the local URL printed by Vite (typically <http://localhost:5173>). The frontend currently sends API requests to `http://127.0.0.1:8000`; the backend CORS configuration allows the local Vite development origins.

## How it works

1. The upload endpoint validates the file types and size, extracts text, and creates overlapping chunks (1,000 characters with 150 characters of overlap).
2. The backend embeds the chunks using `all-MiniLM-L6-v2` and keeps the documents, chunks, and embeddings in a temporary session.
3. For each question, it embeds the question, ranks chunks by cosine similarity, and selects up to four relevant chunks.
4. Those excerpts and the question are sent to the configured Groq model. The response includes the answer and source details.
5. The session is removed when explicitly cleared, after one hour without activity, or when the backend process stops.

**Privacy note:** Uploaded files are not saved to disk by this app, but retrieved document excerpts are sent to Groq to generate answers. Do not upload sensitive material unless that use is appropriate for your data and Groq account settings.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check whether the backend is running. |
| `POST` | `/api/documents/upload` | Upload one or more files as multipart form data under the `files` field. Returns a session ID and chunk count. |
| `POST` | `/api/chat` | Ask a question with JSON containing `session_id` and `question`. Returns an answer and source chunks. |
| `DELETE` | `/api/sessions/{session_id}` | Clear a session and its in-memory embeddings. |

## Frontend checks

Run these from `frontend/rag-chat-ui`:

```bash
npm run build
npm run lint
```

## Project layout

```text
backend/
  main.py             FastAPI routes and request validation
  rag_services.py     Text extraction, chunking, retrieval, and Groq calls
  requirements.txt    Python dependencies
  .env.example        Environment variable template
frontend/
  rag-chat-ui/        React, TypeScript, and Vite application
.gitignore            Local secrets and Python artifact exclusions
```
