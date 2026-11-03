
import { configureStore } from "@reduxjs/toolkit";
import documentReducer from "../../features/documents/document.slice";
import chatReducer from "../../features/chat/chat.slice";

export const store = configureStore({
  reducer: {
    documents: documentReducer,
    chat: chatReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
