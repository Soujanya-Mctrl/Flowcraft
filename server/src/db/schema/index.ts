import { getDb } from "../index";

// Firestore Collection Names
export const COLLECTIONS = {
  DIAGRAMS: "diagrams",
  USERS: "users",
  SESSIONS: "sessions",
};

// Types for better type safety
export interface DiagramData {
  id: number | string;
  name: string;
  owner_name: string;
  code?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserData {
  name: string;
  email: string;
  uid?: string;
  photoURL?: string;
  createdAt?: Date;
  lastLoginAt?: Date;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface SessionData {
  title: string;
  owner_id: string | null; // null for anonymous
  last_diagram_code: string;
  messages: ChatMessage[];
  diagramType: string;
  model: string;
  diagrams?: Array<{
    id: string;
    title: string;
    code: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Helpers for Firestore access
export const diagramsCol = () => getDb().collection(COLLECTIONS.DIAGRAMS);
export const usersCol = () => getDb().collection(COLLECTIONS.USERS);
export const sessionsCol = () => getDb().collection(COLLECTIONS.SESSIONS);