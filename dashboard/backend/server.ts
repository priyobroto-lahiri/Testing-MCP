import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT: number = parseInt(process.env.DASHBOARD_PORT || "3001");

app.use(cors());
app.use(express.json());

// Serve the artifacts folder as static assets
const artifactsDir = path.resolve(process.cwd(), "artifacts");
app.use("/artifacts", express.static(artifactsDir));

/**
 * Endpoint to receive events from the MCP server.
 * This acts as a bridge to broadcast to React clients.
 */
app.post("/api/event", (req, res) => {
  const event = req.body;
  console.log(`[Dashboard Backend] Received event: ${event.type}`);
  
  // Broadcast to all connected socket clients
  io.emit("execution_event", event);
  
  res.status(200).json({ success: true });
});

/**
 * Fetch the execution log history.
 */
app.get("/api/history", async (req, res) => {
  const logPath = path.resolve(process.cwd(), "execution_log.json");
  try {
    if (fs.existsSync(logPath)) {
      const content = await fs.promises.readFile(logPath, "utf8");
      const logs = JSON.parse(content || "[]");
      res.json(logs);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to read execution log" });
  }
});

io.on("connection", (socket) => {
  console.log(`[Dashboard Backend] Client connected: ${socket.id}`);
  
  socket.on("disconnect", () => {
    console.log(`[Dashboard Backend] Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[Dashboard Backend] Server running at http://localhost:${PORT}`);
  console.log(`[Dashboard Backend] Serving artifacts from: ${artifactsDir}`);
});
