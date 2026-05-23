import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { SessionManager } from "./session/SessionManager.js";
import { BrowserTools } from "./tools/BrowserTools.js";
import { AssertionTools } from "./tools/AssertionTools.js";
import { ArtifactTools } from "./tools/ArtifactTools.js";

const sessionManager = new SessionManager();
const browserTools = new BrowserTools();
const assertionTools = new AssertionTools();
const artifactTools = new ArtifactTools();

const server = new Server(
  {
    name: "testing-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "browser_launch",
        description: "Launch a fresh isolated browser context (Mode A)",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "browser_attach",
        description: "Attach to an existing browser via CDP port (Mode B)",
        inputSchema: {
          type: "object",
          properties: {
            cdpUrl: { type: "string", description: "CDP URL (default: http://localhost:9222)" },
          },
        },
      },
      {
        name: "browser_navigate",
        description: "Navigate to a URL",
        inputSchema: {
          type: "object",
          properties: {
            sessionId: { type: "string" },
            url: { type: "string" },
            waitUntil: { type: "string", enum: ["load", "domcontentloaded", "networkidle"] },
          },
          required: ["sessionId", "url"],
        },
      },
      {
        name: "browser_interact",
        description: "Interact with an element (click, type, hover)",
        inputSchema: {
          type: "object",
          properties: {
            sessionId: { type: "string" },
            action: { type: "string", enum: ["click", "type", "hover"] },
            selector: { type: "string" },
            value: { type: "string", description: "Value for type action" },
          },
          required: ["sessionId", "action", "selector"],
        },
      },
      {
        name: "browser_get_dom",
        description: "Get compressed JSON tree of interactive elements",
        inputSchema: {
          type: "object",
          properties: {
            sessionId: { type: "string" },
          },
          required: ["sessionId"],
        },
      },
      {
        name: "assert_text",
        description: "Assert text is present on the page or element",
        inputSchema: {
          type: "object",
          properties: {
            sessionId: { type: "string" },
            text: { type: "string" },
            selector: { type: "string" },
          },
          required: ["sessionId", "text"],
        },
      },
      {
        name: "capture_artifact",
        description: "Capture and save a screenshot or DOM snapshot",
        inputSchema: {
          type: "object",
          properties: {
            sessionId: { type: "string" },
            stepId: { type: "string" },
            type: { type: "string", enum: ["screenshot", "dom"] },
          },
          required: ["sessionId", "stepId", "type"],
        },
      },
      {
        name: "browser_close",
        description: "Close or detach a browser session",
        inputSchema: {
          type: "object",
          properties: {
            sessionId: { type: "string" },
          },
          required: ["sessionId"],
        },
      },
    ],
  };
});

/**
 * Handle tool calls.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "browser_launch": {
        const session = await sessionManager.launchSession();
        return { content: [{ type: "text", text: `Launched session: ${session.id}` }] };
      }

      case "browser_attach": {
        const session = await sessionManager.attachSession(args?.cdpUrl as string);
        return { content: [{ type: "text", text: `Attached to session: ${session.id}` }] };
      }

      case "browser_navigate": {
        const session = sessionManager.getSession(args?.sessionId as string);
        if (!session) throw new Error("Session not found");
        const result = await browserTools.navigate(session, args?.url as string, args?.waitUntil as any);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }

      case "browser_interact": {
        const session = sessionManager.getSession(args?.sessionId as string);
        if (!session) throw new Error("Session not found");
        let result;
        if (args?.action === "click") result = await browserTools.click(session, args?.selector as string);
        else if (args?.action === "type") result = await browserTools.type(session, args?.selector as string, args?.value as string);
        else if (args?.action === "hover") result = await browserTools.hover(session, args?.selector as string);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }

      case "browser_get_dom": {
        const session = sessionManager.getSession(args?.sessionId as string);
        if (!session) throw new Error("Session not found");
        const result = await browserTools.getDOM(session);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }

      case "assert_text": {
        const session = sessionManager.getSession(args?.sessionId as string);
        if (!session) throw new Error("Session not found");
        const result = await assertionTools.assertText(session, args?.text as string, args?.selector as string);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }

      case "capture_artifact": {
        const session = sessionManager.getSession(args?.sessionId as string);
        if (!session) throw new Error("Session not found");
        let content: Buffer | string;
        if (args?.type === "screenshot") {
          content = await assertionTools.visualScreenshot(session);
        } else {
          const dom = await browserTools.getDOM(session);
          content = JSON.stringify(dom.data);
        }
        const artifact = await artifactTools.saveArtifact(args?.stepId as string, args?.type as any, content);
        return { content: [{ type: "text", text: `Artifact saved: ${artifact.path}` }] };
      }

      case "browser_close": {
        await sessionManager.closeSession(args?.sessionId as string);
        return { content: [{ type: "text", text: `Closed session: ${args?.sessionId}` }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: "text", text: error.message }],
    };
  }
});

/**
 * Start the server.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Testing MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
