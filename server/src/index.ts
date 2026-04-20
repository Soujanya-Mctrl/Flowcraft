import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { connectToDB } from "./db";
import apiRouter from "./api";

import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middleware/errorHandler";

const cors = require("cors");

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

connectToDB();

// security middlewares
app.use(helmet()); // Set secure HTTP headers

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(",") 
    : ["http://localhost:5173", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};
app.use(cors(corsOptions));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per window
  message: {
    success: false,
    error: "Too many requests, please try again later."
  }
});
app.use(globalLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// root route
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Welcome to Flowcraft API",
    documentation: "/api"
  });
});

app.use("/api", apiRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

