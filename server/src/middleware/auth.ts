import { Request, Response, NextFunction } from "express";
import * as admin from "firebase-admin";
import { AppError, ErrorCode } from "../types";

/**
 * Middleware to verify Firebase ID tokens
 */
export const verifyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // In development or for anonymous access, we might want to skip this
      // But for "completing the setup", we should enforce it for protected routes
      return next(new AppError(
        ErrorCode.AUTHENTICATION_ERROR,

        "No authentication token provided",
        401
      ));
    }

    const token = authHeader.split("Bearer ")[1];
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Attach user info to the request object
      (req as any).user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture
      };
      
      next();
    } catch (error: any) {
      console.error("Firebase Auth Error:", error.message);
      return next(new AppError(
        ErrorCode.AUTHENTICATION_ERROR,

        "Invalid or expired authentication token",
        401,
        error
      ));
    }
  } catch (error: any) {
    next(error);
  }
};

/**
 * Optional middleware to just attach user if token exists, 
 * but don't fail if it doesn't.
 */
export const attachUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      (req as any).user = {
        uid: decodedToken.uid,
        email: decodedToken.email
      };
    } catch (e) {
      // Ignore invalid tokens in optional auth
    }
  }
  next();
};
