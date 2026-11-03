
import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { useAppDispatch, useAppSelector } from "./app/hooks";
import { clearSession, uploadDocuments } from "../features/documents/document.slice";
import { clearChatError, sendQuestion } from "../features/chat/chat.slice";

export default function App() {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const documentState = useAppSelector((state) => state.documents);
  const chatState = useAppSelector((state) => state.chat);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [question, setQuestion] = useState("");

  const sessionId = documentState.sessionId;
  const messages = chatState.messages ?? [];
  const hasSession = Boolean(sessionId);
  const isUploading = documentState.status === "loading";
  const isChatLoading = chatState.status === "loading";
  const isBusy = isUploading || isChatLoading;

  const openFilePicker = () => fileInputRef.current?.click();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const allowed = [".pdf", ".docx", ".txt"];

    const valid = files.filter((file) => {
      const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      return allowed.includes(extension) && file.size <= 10 * 1024 * 1024;
    });

    setSelectedFiles((previous) => {
      const combined = [...previous, ...valid];
      return combined.filter(
        (file, index, all) =>
          all.findIndex(
            (item) => item.name === file.name && item.size === file.size,
          ) === index,
      );
    });

    event.target.value = "";
  };

  const handleUpload = async () => {
    if (!selectedFiles.length || isUploading) return;

    try {
      if (sessionId) {
        await dispatch(clearSession(sessionId)).unwrap();
      }

      await dispatch(uploadDocuments(selectedFiles)).unwrap();
      setSelectedFiles([]);
      textareaRef.current?.focus();
    } catch (error) {
      console.error("Document upload failed:", error);
    }
  };

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const prompt = question.trim();
    if (!sessionId || !prompt || isChatLoading) return;

    setQuestion("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    dispatch(clearChatError());

    try {
      await dispatch(
        sendQuestion({ sessionId, question: prompt }),
      ).unwrap();
    } catch (error) {
      console.error("Question failed:", error);
    }
  };

  const handleNewChat = async () => {
    if (sessionId) {
      try {
        await dispatch(clearSession(sessionId)).unwrap();
      } catch (error) {
        console.error("Could not clear session:", error);
        return;
      }
    }

    setQuestion("");
    setSelectedFiles([]);
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-[#faf9f6] text-[#30302f]">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="z-20 flex w-[270px] shrink-0 flex-col border-r border-[#e9e7e1] bg-[#f3f2ee] max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:shadow-xl">
          <div className="flex h-[68px] items-center justify-between px-5">
            <button
              type="button"
              onClick={handleNewChat}
              className="text-[19px] font-semibold tracking-tight text-[#292824] hover:text-[#805b42]"
            >
              RDocuMind
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="rounded-lg p-2 text-[#77746d] hover:bg-[#e9e7e0]"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.6">
                <rect x="3.5" y="4" width="17" height="16" rx="3" />
                <path d="M9 4v16" />
              </svg>
            </button>
          </div>

          <div className="px-3 pt-2">
            <button
              type="button"
              onClick={handleNewChat}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#45443f] transition hover:bg-[#e9e7e0]"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New chat
            </button>

            <button
              type="button"
              onClick={openFilePicker}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#45443f] transition hover:bg-[#e9e7e0]"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 16V4m-4 4 4-4 4 4M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
              </svg>
              Add documents
            </button>
          </div>

          <div className="mt-9 px-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#88857c]">
              Workspace
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {hasSession ? (
              <div className="rounded-xl bg-[#e9e7e0] px-3 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  Current conversation
                </div>
                <p className="mt-2 truncate pl-4 text-xs text-[#77746d]">
                  {sessionId}
                </p>
                <p className="mt-2 pl-4 text-xs text-[#77746d]">
                  {messages.filter((m) => m.role === "user").length} questions
                </p>
              </div>
            ) : (
              <p className="px-3 py-2 text-sm leading-6 text-[#88857c]">
                Your conversations will appear here while this session is active.
              </p>
            )}

            {selectedFiles.length > 0 && (
              <div className="mt-5">
                <p className="px-3 pb-2 text-xs font-medium text-[#77746d]">
                  Files ready to upload
                </p>
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-[#898176]" stroke="currentColor" strokeWidth="1.6">
                      <path d="M6 3.75h8l4 4v12.5H6z" />
                      <path d="M14 3.75v4h4M9 13h6M9 16h6" />
                    </svg>
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFiles((all) => all.filter((_, i) => i !== index))}
                      aria-label={`Remove ${file.name}`}
                      className="text-[#88857c] hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="mt-2 w-full rounded-xl bg-[#d97757] px-3 py-2.5 text-sm font-medium text-white transition hover:bg-[#bd6548] disabled:opacity-50"
                >
                  {isUploading ? "Processing files..." : "Process documents"}
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-[#e4e2db] p-4">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dfd5c8] text-sm font-semibold text-[#685343]">
                R
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">RDocuMind Assistant</p>
                <p className="mt-0.5 text-xs text-[#858178]">
                  Private document workspace
                </p>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Main conversation area */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#eeece6] bg-[#faf9f6] px-4 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
                className="rounded-lg p-2 hover:bg-[#efede6]"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
                  <rect x="3.5" y="4" width="17" height="16" rx="3" />
                  <path d="M9 4v16" />
                </svg>
              </button>
            )}
            <div className="min-w-0">
              <p className="mt-0.5 text-xs text-[#89867d]">
                {hasSession ? "Using your uploaded documents" : "Ask questions about your files"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${hasSession ? "bg-emerald-600" : "bg-[#c7c3b9]"}`} />
            <span className="hidden text-xs text-[#77746d] sm:inline">
              {hasSession ? "Session active" : "No active session"}
            </span>
          </div>
        </header>

        {/* Scrollable messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !isUploading ? (
            <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-5 pb-12 pt-10">
              <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eee5dc] text-[#b56e4e]">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 3.5h8l4 4v13H6z" />
                  <path d="M14 3.5v4h4M9 12h6M9 15.5h6" />
                </svg>
              </div>

              <h2 className="max-w-xl text-center text-3xl font-medium leading-tight tracking-tight text-[#302f2a] sm:text-[40px]">
                What would you like to understand?
              </h2>
              <p className="mt-4 max-w-lg text-center text-sm leading-7 text-[#77746d] sm:text-base">
                Bring your documents. Ask questions. Get clear answers with relevant source excerpts.
              </p>

              {!hasSession && (
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="mt-8 flex items-center gap-2 rounded-xl border border-[#dedbd2] bg-white px-5 py-3 text-sm font-medium shadow-sm transition hover:border-[#c9a18b] hover:bg-[#fdfcf9]"
                >
                  <span className="text-lg">+</span>
                  Upload documents
                </button>
              )}

              {hasSession && (
                <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    "Summarize the key points",
                    "What are the important requirements?",
                    "Find dates, deadlines, or figures",
                    "Compare the main ideas",
                  ].map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion}
                      onClick={() => setQuestion(suggestion)}
                      className="rounded-xl border border-[#e7e4dc] bg-white px-4 py-4 text-left text-sm text-[#5c5951] transition hover:border-[#c9a18b] hover:bg-[#fdfcf9]"
                    >
                      {suggestion}
                      <span className="float-right text-[#a09b90]">↗</span>
                    </button>
                  ))}
                </div>
              )}

              {documentState.error && (
                <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {documentState.error}
                </p>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-3xl px-4 pb-8 pt-8 sm:px-8 sm:pt-10">
              {isUploading && (
                <div className="mb-6 rounded-xl border border-[#e7e4dc] bg-white p-4 text-sm text-[#77746d]">
                  Processing your documents. This may take a moment...
                </div>
              )}

              {messages.map((message) => (
                <article key={message.id} className="mb-8">
                  {message.role === "user" ? (
                    <div className="ml-auto max-w-[88%] rounded-3xl rounded-br-lg bg-[#efeee8] px-5 py-3.5 sm:max-w-[80%]">
                      <p className="whitespace-pre-wrap text-[15px] leading-7 text-[#35342f]">
                        {message.content}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-3 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e9dfd3] text-sm font-semibold text-[#a26548]">
                          R
                        </div>
                        <span className="text-sm font-semibold text-[#454139]">
                          RDocuMind
                        </span>
                      </div>

                      <div className="pl-0 text-[15px] leading-8 text-[#393832] sm:pl-[42px]">
                        <p className="whitespace-pre-wrap">{message.content}</p>

                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-6 border-t border-[#e8e5de] pt-4">
                            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#888176]">
                              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.6">
                                <path d="M6 3.5h8l4 4v13H6z" />
                                <path d="M14 3.5v4h4M9 12h6M9 15.5h6" />
                              </svg>
                              Sources ({message.sources.length})
                            </div>

                            <div className="space-y-2">
                              {message.sources.map((source, index) => (
                                <details
                                  key={`${source.document}-${source.chunk_id}-${index}`}
                                  className="group rounded-xl border border-[#e8e5de] bg-white open:bg-[#fdfcf9]"
                                >
                                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f0ede6] text-[#8b7c68]">
                                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M6 3.5h8l4 4v13H6z" />
                                        <path d="M14 3.5v4h4" />
                                      </svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium leading-5 text-[#47443c]">
                                        {source.document}
                                      </p>
                                      <p className="mt-1 text-xs leading-4 text-[#89857b]">
                                        Chunk {source.chunk_id + 1}
                                      </p>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-[#f0eee8] px-2.5 py-1 text-xs text-[#777166]">
                                      {(source.relevance_score * 100).toFixed(1)}%
                                    </span>
                                    <span className="text-xs text-[#8c877c] transition group-open:rotate-180">⌄</span>
                                  </summary>
                                  <div className="border-t border-[#eeece5] px-4 py-3 text-sm leading-6 text-[#666258]">
                                    {source.text}
                                  </div>
                                </details>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              ))}

              {isChatLoading && (
                <div className="mb-8 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e9dfd3] text-sm font-semibold text-[#a26548]">
                    R
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#454139]">RDocuMind</p>
                    <p className="mt-1 animate-pulse text-sm text-[#89857b]">
                      Thinking through your documents...
                    </p>
                  </div>
                </div>
              )}

              {chatState.error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {chatState.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom composer */}
        <div className="shrink-0 bg-gradient-to-t from-[#faf9f6] via-[#faf9f6] to-transparent px-3 pb-3 pt-4 sm:px-6 sm:pb-5">
          <div className="mx-auto max-w-3xl">
            <form
              onSubmit={handleSend}
              className="rounded-2xl border border-[#dedbd2] bg-white shadow-[0_5px_24px_rgba(45,39,29,0.06)] transition focus-within:border-[#c5a28d] focus-within:shadow-[0_5px_28px_rgba(45,39,29,0.09)]"
            >
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(event) => {
                  setQuestion(event.target.value);
                  event.target.style.height = "auto";
                  event.target.style.height = `${Math.min(event.target.scrollHeight, 180)}px`;
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                disabled={!hasSession || isChatLoading}
                rows={2}
                placeholder={
                  hasSession
                    ? "Ask anything about your documents..."
                    : "Upload and process documents to begin..."
                }
                className="block max-h-[180px] min-h-[66px] w-full resize-none bg-transparent px-4 pb-2 pt-4 text-[15px] leading-6 text-[#34332e] outline-none placeholder:text-[#a19d93] disabled:cursor-not-allowed sm:px-5"
              />

              <div className="flex items-center justify-between gap-3 px-3 pb-3 sm:px-4">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={openFilePicker}
                    aria-label="Attach documents"
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-[#77746d] transition hover:bg-[#f0eee8]"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.6">
                      <path d="M12 16V4m-4 4 4-4 4 4M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
                    </svg>
                  </button>
                  <span className="hidden text-xs text-[#9a968c] sm:inline">
                    {hasSession ? "Documents ready" : "Add PDF, DOCX or TXT"}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!hasSession || !question.trim() || isBusy}
                  aria-label="Send message"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d97757] text-white transition hover:bg-[#bd6548] disabled:cursor-not-allowed disabled:bg-[#e8e5de] disabled:text-[#aaa69c]"
                >
                  {isChatLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
                      <path d="M12 19V5m-6 6 6-6 6 6" />
                    </svg>
                  )}
                </button>
              </div>
            </form>

            <p className="mt-3 text-center text-[11px] leading-5 text-[#a09b90]">
              RDocuMind can make mistakes. Verify important details against your original documents.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
