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
import { diagramsCol } from "../db/schema";
import { v4 as uuidv4 } from "uuid";
import { verifyAuth, attachUser } from "../middleware/auth";
import rateLimit from "express-rate-limit";

// Stricter rate limiting for AI generation (20 requests per 15 minutes)
const generationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
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
    const { prompt, model, diagramType, conversationHistory } =
      req.body as GenerateDiagramRequest;

    console.log("\n📝 Generating diagram...");

    const result = await aiService.generateDiagram(
      prompt,
      model,
      diagramType,
      conversationHistory
    );

    const diagramId = uuidv4();
    const diagramData = {
      title: result.title,
      code: result.diagram,
      prompt: prompt,
      model: model || "default",
      diagramType: diagramType || "auto",
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
    const { diagram, prompt, model, diagramType, conversationHistory } =
      req.body as EnhanceDiagramRequest;

    console.log("\n🔧 Enhancing diagram...");

    const result = await aiService.enhanceDiagram(
      diagram,
      prompt,
      model,
      diagramType,
      conversationHistory
    );

    const diagramId = uuidv4();
    const diagramData = {
      title: result.title,
      code: result.diagram,
      parentDiagram: diagram.substring(0, 50) + "...", 
      prompt: prompt,
      model: model || "default",
      diagramType: diagramType || "auto",
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
