import { Router, Request, Response } from "express";
import { AIService } from "../services/aiService";
import {
  validateGenerateDiagram,
  validateEnhanceDiagram,
  validateGenerateTitle,
} from "../middleware/validation";
import { asyncHandler } from "../middleware/errorHandler";
import { formatSuccessResponse } from "../utils/helpers";
import {
  GenerateDiagramRequest,
  EnhanceDiagramRequest,
  GenerateTitleRequest,
} from "../types";
import { diagramsCol, usersCol, sessionsCol, UserData, SessionData, ChatMessage } from "../db/schema";
import { v4 as uuidv4 } from "uuid";
import { verifyAuth, attachUser } from "../middleware/auth";
import rateLimit from "express-rate-limit";
import * as admin from "firebase-admin";

// Stricter rate limiting for AI generation (50 requests per 15 minutes)
const generationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: "AI generation limit reached. Please try again in 15 minutes."
  }
});


const router = Router();
const aiService = new AIService();

/**
 * @route   GET /api
 * @desc    Get API information
 */
router.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      version: "1.1",
      name: "Flowcraft API",
      description: "Professional Mermaid diagram generation platform",
      features: [
        "AI-powered diagram generation",
        "Diagram enhancement with context",
        "Automatic title generation",
        "Conversation history support",
        "Multiple AI providers (Groq, Google Gemini)",
        "Type-safe error handling",
        "Persistent storage with Firestore",
      ],
      routes: {
        "POST /api/diagram/generate": "Generate and save a new diagram",
        "POST /api/diagram/enhance": "Enhance and save a diagram",
        "POST /api/diagram/title": "Generate a title for a diagram",
        "GET /api/diagram/:id": "Get a specific diagram by ID",
        "GET /api/diagrams": "Get all saved diagrams",
        "GET /api/health": "Check API health status",
      },
    },
  });
});

/**
 * @route   POST /api/user/sync
 * @desc    Sync user profile data on login
 */
router.post(
  "/user/sync",
  verifyAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { photoURL } = req.body;

    const userRef = usersCol().doc(user.uid);
    const doc = await userRef.get();

    const userData: UserData = {
      name: user.name || user.email.split("@")[0],
      email: user.email,
      uid: user.uid,
      photoURL: photoURL || user.picture,
      lastLoginAt: new Date(),
    };

    if (!doc.exists) {
      userData.createdAt = new Date();
      await userRef.set(userData);
    } else {
      await userRef.update({ 
        ...userData,
        updatedAt: new Date() 
      } as any);
    }

    res.json(formatSuccessResponse(userData, "User profile synced successfully"));
  })
);

/**
 * @route   GET /api/sessions
 */
router.get(
  "/sessions",
  verifyAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const snapshot = await sessionsCol()
      .where("owner_id", "==", user.uid)
      .orderBy("updatedAt", "desc")
      .limit(50)
      .get();
    
    const sessions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(formatSuccessResponse({ sessions }, "Sessions retrieved successfully"));
  })
);

/**
 * @route   POST /api/sessions
 */
router.post(
  "/sessions",
  attachUser,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { title } = req.body;

    const sessionId = uuidv4();
    const sessionData: SessionData = {
      title: title || "New Canvas",
      owner_id: user?.uid || null,
      last_diagram_code: "",
      messages: [],
      diagramType: "auto",
      model: "default",
      diagrams: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await sessionsCol().doc(sessionId).set(sessionData);

    res.status(201).json(formatSuccessResponse({ id: sessionId, ...sessionData }, "Session created successfully"));
  })
);

/**
 * @route   GET /api/session/:id
 */
router.get(
  "/session/:id",
  verifyAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const user = (req as any).user;
    const doc = await sessionsCol().doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    const data = doc.data() as SessionData;
    if (data.owner_id !== user.uid) {
      return res.status(403).json({ success: false, error: "Unauthorized access to session" });
    }

    res.json(formatSuccessResponse({ id: doc.id, ...data }, "Session retrieved successfully"));
  })
);

/**
 * @route   GET /api/session/:id
 * @desc    Get a single session by ID (restores state)
 */
router.get(
  "/session/:id",
  attachUser,
  asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const doc = await sessionsCol().doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }
    
    const data = doc.data() as SessionData;
    const user = (req as any).user;
    
    // If session has an owner, check if the current user is the owner
    if (data.owner_id && (!user || data.owner_id !== user.uid)) {
      return res.status(403).json({ success: false, error: "Unauthorized access to this session" });
    }
    
    res.json(formatSuccessResponse(data));
  })
);

/**
 * @route   DELETE /api/session/:id
 */
router.delete(
  "/session/:id",
  verifyAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const user = (req as any).user;
    const docRef = sessionsCol().doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    if ((doc.data() as SessionData).owner_id !== user.uid) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    await docRef.delete();
    res.json(formatSuccessResponse(null, "Session deleted successfully"));
  })
);

/**
 * @route   POST /api/session/:id/claim
 * @desc    Claim an anonymous session for an authenticated user
 */
router.post(
  "/session/:id/claim",
  verifyAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const user = (req as any).user;
    const docRef = sessionsCol().doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    const data = doc.data() as SessionData;
    
    // Only allow claiming if session has no owner or is already owned by this user
    if (data.owner_id && data.owner_id !== user.uid) {
      return res.status(403).json({ success: false, error: "Session already owned by another user" });
    }

    await docRef.update({
      owner_id: user.uid,
      updatedAt: new Date()
    });

    // Also claim all individual diagrams associated with this session
    try {
      const associatedDiagrams = await diagramsCol()
        .where("sessionId", "==", id)
        .where("owner_id", "==", null)
        .get();
      
      if (!associatedDiagrams.empty) {
        const batch = admin.firestore().batch();
        associatedDiagrams.docs.forEach(diagDoc => {
          batch.update(diagDoc.ref, { 
            owner_id: user.uid,
            owner_name: user.email 
          });
        });
        await batch.commit();
        console.log(`✅ Claimed ${associatedDiagrams.size} diagrams for user ${user.uid}`);
      }
    } catch (claimError) {
      console.error("Failed to claim associated diagrams:", claimError);
      // We don't fail the whole request if this fails
    }

    res.json(formatSuccessResponse(null, "Session and associated diagrams claimed successfully"));
  })
);

/**
 * @route   PATCH /api/session/:id
 * @desc    Update session details (e.g., title)
 */
router.patch(
  "/session/:id",
  attachUser,
  asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const { title, last_diagram_code, messages } = req.body;
    const docRef = sessionsCol().doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    const data = doc.data() as SessionData;
    const user = (req as any).user;

    // If session has an owner, check if the current user is the owner
    if (data.owner_id && (!user || data.owner_id !== user.uid)) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const updates: any = { updatedAt: new Date() };
    if (title) updates.title = title;
    if (last_diagram_code !== undefined) updates.last_diagram_code = last_diagram_code;
    if (messages) updates.messages = messages;

    await docRef.update(updates);
    res.json(formatSuccessResponse(null, "Session updated successfully"));
  })
);

/**
 * @route   GET /api/health
 */
router.get("/health", (req: Request, res: Response) => {
  res.json(
    formatSuccessResponse(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      "API is running"
    )
  );
});

/**
 * @route   GET /api/diagrams
 */
router.get(
  "/diagrams",
  verifyAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const snapshot = await diagramsCol()
      .where("owner_id", "==", user.uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    
    const diagrams = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(formatSuccessResponse({ diagrams }, "Diagrams retrieved successfully"));
  })
);

/**
 * @route   GET /api/diagram/:id
 */
router.get(
  "/diagram/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const doc = await diagramsCol().doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: "Diagram not found"
      });
    }

    res.json(formatSuccessResponse(
      { id: doc.id, ...doc.data() },
      "Diagram retrieved successfully"
    ));
  })
);

/**
 * @route   POST /api/diagram/generate
 */
router.post(
  "/diagram/generate",
  generationLimiter,
  attachUser,
  validateGenerateDiagram,
  asyncHandler(async (req: Request, res: Response) => {
    const { prompt, model, diagramType, conversationHistory, sessionId } =
      req.body as GenerateDiagramRequest & { sessionId?: string };

    console.log(`\n📝 Generating diagram... Using model: ${model || "default (gemini-2.0-flash)"}`);

    const result = await aiService.generateDiagram(
      prompt,
      model,
      diagramType,
      conversationHistory
    );

    const diagramId = uuidv4();
    const now = new Date();
    
    // Update session if sessionId is provided
    if (sessionId) {
      const sessionRef = sessionsCol().doc(sessionId);
      const sessionDoc = await sessionRef.get();
      
      if (sessionDoc.exists) {
        const sessionData = sessionDoc.data() as SessionData;
        const currentUser = (req as any).user;

        // Update if session is anonymous OR owned by current user
        if (!sessionData.owner_id || (currentUser && sessionData.owner_id === currentUser.uid)) {
          const newMessage: ChatMessage = {
            role: "user",
            content: prompt,
            timestamp: now
          };
          const assistantMessage: ChatMessage = {
            role: "assistant",
            content: `${result.title}\n\n${result.explanation}\n\n\`\`\`mermaid\n${result.diagram}\n\`\`\``,
            timestamp: now
          };

          const updateData: any = {
            messages: admin.firestore.FieldValue.arrayUnion(newMessage, assistantMessage),
            last_diagram_code: result.diagram,
            diagrams: admin.firestore.FieldValue.arrayUnion({
              id: diagramId,
              title: result.title,
              code: result.diagram,
              createdAt: now
            }),
            updatedAt: now
          };

          // Automatically set title if it's currently generic
          if (!sessionData.title || sessionData.title === "New Canvas" || sessionData.title === "Untitled Diagram") {
            updateData.title = result.title;
          }

          // If user is logged in but session was anonymous, claim it now
          if (currentUser && !sessionData.owner_id) {
            updateData.owner_id = currentUser.uid;
          }

          await sessionRef.update(updateData);
        }
      }
    }
    const diagramData = {
      title: result.title,
      explanation: result.explanation,
      code: result.diagram,
      prompt: prompt,
      model: model || "default",
      diagramType: diagramType || "auto",
      sessionId: sessionId || null,
      owner_name: (req as any).user?.email || "anonymous",
      owner_id: (req as any).user?.uid || null,

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await diagramsCol().doc(diagramId).set(diagramData);
      console.log("✅ Diagram generated and saved successfully");
    } catch (saveError: any) {
      console.warn(`⚠️ Failed to save diagram to database: ${saveError.message}`);
      console.log("✅ Diagram generated (save skipped)");
    }

    res.status(201).json(
      formatSuccessResponse(
        {
          id: diagramId,
          diagram: result.diagram,
          title: result.title,
          explanation: result.explanation,
        },
        "Diagram generated and saved successfully"
      )
    );
  })
);

/**
 * @route   POST /api/diagram/enhance
 */
router.post(
  "/diagram/enhance",
  generationLimiter,
  attachUser,
  validateEnhanceDiagram,
  asyncHandler(async (req: Request, res: Response) => {
    const { diagram, prompt, model, diagramType, conversationHistory, sessionId } =
      req.body as EnhanceDiagramRequest & { sessionId?: string };

    console.log(`\n🔧 Enhancing diagram... Using model: ${model || "default (gemini-2.0-flash)"}`);

    const result = await aiService.enhanceDiagram(
      diagram,
      prompt,
      model,
      diagramType,
      conversationHistory
    );

    const diagramId = uuidv4();
    const now = new Date();

    // Update session if sessionId is provided
    if (sessionId) {
      const sessionRef = sessionsCol().doc(sessionId);
      const sessionDoc = await sessionRef.get();
      
      if (sessionDoc.exists) {
        const sessionData = sessionDoc.data() as SessionData;
        const currentUser = (req as any).user;

        // Update if session is anonymous OR owned by current user
        if (!sessionData.owner_id || (currentUser && sessionData.owner_id === currentUser.uid)) {
          const newMessage: ChatMessage = {
            role: "user",
            content: prompt,
            timestamp: now
          };
          const assistantMessage: ChatMessage = {
            role: "assistant",
            content: `${result.title}\n\n${result.explanation}\n\n\`\`\`mermaid\n${result.diagram}\n\`\`\``,
            timestamp: now
          };

          const updateData: any = {
            messages: admin.firestore.FieldValue.arrayUnion(newMessage, assistantMessage),
            last_diagram_code: result.diagram,
            diagrams: admin.firestore.FieldValue.arrayUnion({
              id: diagramId,
              title: result.title,
              code: result.diagram,
              createdAt: now
            }),
            updatedAt: now
          };

          // If user is logged in but session was anonymous, claim it now
          if (currentUser && !sessionData.owner_id) {
            updateData.owner_id = currentUser.uid;
          }

          await sessionRef.update(updateData);
        }
      }
    }
    const diagramData = {
      title: result.title,
      explanation: result.explanation,
      code: result.diagram,
      parentDiagram: diagram.substring(0, 50) + "...", 
      prompt: prompt,
      model: model || "default",
      diagramType: diagramType || "auto",
      sessionId: sessionId || null,
      owner_name: (req as any).user?.email || "anonymous",
      owner_id: (req as any).user?.uid || null,

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await diagramsCol().doc(diagramId).set(diagramData);
      console.log("✅ Diagram enhanced and saved successfully");
    } catch (saveError: any) {
      console.warn(`⚠️ Failed to save enhanced diagram to database: ${saveError.message}`);
      console.log("✅ Diagram enhanced (save skipped)");
    }

    res.status(201).json(
      formatSuccessResponse(
        {
          id: diagramId,
          diagram: result.diagram,
          title: result.title,
          explanation: result.explanation,
        },
        "Diagram enhanced and saved successfully"
      )
    );
  })
);

/**
 * @route   POST /api/diagram/title
 */
router.post(
  "/diagram/title",
  validateGenerateTitle,
  asyncHandler(async (req: Request, res: Response) => {
    const { diagram, model } = req.body as GenerateTitleRequest;

    console.log("\n📋 Generating title...");

    const title = await aiService.generateTitle(diagram, model);

    console.log(`✅ Title generated: ${title}\n`);

    res.json(
      formatSuccessResponse(
        {
          title,
        },
        "Title generated successfully"
      )
    );
  })
);

export default router;
