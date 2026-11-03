
const API_BASE = "http://127.0.0.1:8000";

export interface UploadResponse {
  session_id: string;
  documents: string[];
  chunks_created: number;
  message: string;
}

export interface Source {
  document: string;
  chunk_id: number;
  relevance_score: number;
  text: string;
}

export interface ChatResponse {
  session_id: string;
  question: string;
  answer: string;
  sources: Source[];
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.detail || `Request failed with status ${response.status}`
    );
  }

  return data as T;
}

export async function uploadDocuments(
  files: File[]
): Promise<UploadResponse> {
  const formData = new FormData();

  files.forEach((file) => formData.append("files", file));

  const response = await fetch(`${API_BASE}/api/documents/upload`, {
    method: "POST",
    body: formData,
  });

  return parseResponse<UploadResponse>(response);
}

export async function askQuestion(
  sessionId: string,
  question: string
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: sessionId,
      question,
    }),
  });

  return parseResponse<ChatResponse>(response);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" }
  );

  if (response.status === 404) {
    // The session may already have expired or the backend restarted.
    return;
  }

  await parseResponse<{ message: string }>(response);
}
