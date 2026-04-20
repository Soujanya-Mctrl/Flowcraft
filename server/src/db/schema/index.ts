import { getDb } from "../index";

// Firestore Collection Names
export const COLLECTIONS = {
  DIAGRAMS: "diagrams",
  USERS: "users",
};

// Types for better type safety
export interface DiagramData {
  id: number | string;
  name: string;
  owner_name: string;
  code?: string; // Added code for storage
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserData {
  name: string;
  email: string;
  uid?: string;
  createdAt?: Date;
}

// Helpers for Firestore access if needed
export const diagramsCol = () => getDb().collection(COLLECTIONS.DIAGRAMS);
export const usersCol = () => getDb().collection(COLLECTIONS.USERS);