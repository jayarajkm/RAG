
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import * as ragApi from "../../services/ragApi";
import type { Source } from "../../services/ragApi";
import { clearSession } from "../documents/document.slice";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

interface ChatState {
  messages: ChatMessage[];
  status: "idle" | "loading" | "failed";
  error: string | null;
}

const initialState: ChatState = {
  messages: [],
  status: "idle",
  error: null,
};

export const sendQuestion = createAsyncThunk(
  "chat/sendQuestion",
  async (
    payload: { sessionId: string; question: string },
    { rejectWithValue }
  ) => {
    try {
      return await ragApi.askQuestion(
        payload.sessionId,
        payload.question
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Could not get an answer."
      );
    }
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState,

  reducers: {
    addWelcomeMessage(state, action: PayloadAction<string>) {
      state.messages.push({
        id: crypto.randomUUID(),
        role: "assistant",
        content: action.payload,
      });
    },

    clearChatError(state) {
      state.error = null;
    },

    resetChat() {
      return initialState;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(sendQuestion.pending, (state, action) => {
        state.status = "loading";
        state.error = null;

        state.messages.push({
          id: action.meta.requestId + "-user",
          role: "user",
          content: action.meta.arg.question,
        });
      })
      .addCase(sendQuestion.fulfilled, (state, action) => {
        state.status = "idle";

        state.messages.push({
          id: action.meta.requestId + "-assistant",
          role: "assistant",
          content: action.payload.answer,
          sources: action.payload.sources,
        });
      })
      .addCase(sendQuestion.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          "Could not get an answer.";
      })
      .addCase(clearSession.fulfilled, () => initialState);
  },
});

export const {
  addWelcomeMessage,
  clearChatError,
  resetChat,
} = chatSlice.actions;

export default chatSlice.reducer;
