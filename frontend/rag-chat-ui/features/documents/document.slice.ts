
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import * as ragApi from "../../services/ragApi";

interface DocumentState {
  sessionId: string | null;
  documents: string[];
  chunksCreated: number;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  clearing: boolean;
}

const initialState: DocumentState = {
  sessionId: null,
  documents: [],
  chunksCreated: 0,
  status: "idle",
  error: null,
  clearing: false,
};

export const uploadDocuments = createAsyncThunk(
  "documents/upload",
  async (files: File[], { rejectWithValue }) => {
    try {
      return await ragApi.uploadDocuments(files);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Document upload failed."
      );
    }
  }
);

export const clearSession = createAsyncThunk(
  "documents/clearSession",
  async (sessionId: string | null, { rejectWithValue }) => {
    try {
      if (sessionId) {
        await ragApi.deleteSession(sessionId);
      }

      return true;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Could not clear session."
      );
    }
  }
);

const documentSlice = createSlice({
  name: "documents",
  initialState,
  reducers: {
    clearDocumentError(state) {
      state.error = null;
    },

    resetDocumentState() {
      return initialState;
    },

    setSessionId(state, action: PayloadAction<string | null>) {
      state.sessionId = action.payload;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(uploadDocuments.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(uploadDocuments.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.sessionId = action.payload.session_id;
        state.documents = action.payload.documents;
        state.chunksCreated = action.payload.chunks_created;
        state.error = null;
      })
      .addCase(uploadDocuments.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          "Document upload failed.";
      })
      .addCase(clearSession.pending, (state) => {
        state.clearing = true;
        state.error = null;
      })
      .addCase(clearSession.fulfilled, () => initialState)
      .addCase(clearSession.rejected, (state, action) => {
        state.clearing = false;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          "Could not clear session.";
      });
  },
});

export const {
  clearDocumentError,
  resetDocumentState,
  setSessionId,
} = documentSlice.actions;

export default documentSlice.reducer;
