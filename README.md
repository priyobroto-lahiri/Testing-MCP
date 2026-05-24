# 🧪 Testing-MCP: AI-Driven Browser Automation Framework

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Model Context Protocol](https://img.shields.io/badge/Protocol-MCP-blue)](https://modelcontextprotocol.io)
[![Playwright](https://img.shields.io/badge/Engine-Playwright-green)](https://playwright.dev)

**Testing-MCP** is an enterprise-grade automation framework that bridges the gap between Large Language Models (LLMs) and local browser environments. By leveraging the **Model Context Protocol (MCP)**, it allows AI agents (like GitHub Copilot or Claude) to "drive" a browser, execute complex manual test cases, and generate real-time visual reports.

---

## 🏗️ Project Architecture & Tech Stack

The system is built on a decoupled, three-tier architecture designed for resilience and observability.

### **The Stack**
*   **Orchestration**: Node.js & TypeScript
*   **Browser Engine**: [Playwright](https://playwright.dev/) (Chromium, Edge, Firefox)
*   **Communication**: [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) via JSON-RPC over Stdio
*   **Dashboard UI**: React 19 + Vite + Tailwind CSS
*   **Real-time Bridge**: Express.js + Socket.io

### **Project Structure**
```text
testing-mcp/
├── dashboard/               # Live Monitoring Dashboard
│   ├── frontend/            # React Client (Vite)
│   └── backend/             # Express Server & Artifact Bridge
├── src/
│   ├── cli/                 # Command-line interfaces
│   ├── observability/       # Structured logging & tracing
│   ├── orchestrator/        # State machine & Self-healing logic
│   ├── session/             # Browser lifecycle management
│   ├── tools/               # MCP Tool implementations (Browser, Assert, Artifacts)
│   └── types/               # TypeScript definitions
├── artifacts/               # Local store for screenshots & logs (auto-generated)
├── dist/                    # Compiled production code
└── package.json             # Project configuration
```

---

## 🛠️ Tool Capabilities

The framework exposes a suite of specialized tools to the AI, allowing it to perform high-fidelity web interactions.

| Tool | Capability | Technical Detail |
| :--- | :--- | :--- |
| `browser_launch` | **Isolated Session** | Launches a fresh, incognito browser profile. |
| `browser_attach` | **CDP Integration** | Connects to an existing browser on port 9222 (bypasses SSO/MFA). |
| `browser_navigate` | **Navigation** | Directs the browser to a URL with configurable wait states. |
| `browser_interact` | **Action Execution** | Clicks, types, and hovers using smart-wait logic. |
| `browser_get_dom` | **Spatial Awareness** | Returns a compressed JSON tree of interactive elements. |
| `browser_get_title` | **Metadata** | Retrieves the current page title for validation. |
| `capture_artifact` | **Evidence** | Saves PNG screenshots and JSON DOM snapshots locally. |

---

## 🚀 Use Case Examples

### 1. Regression Testing (E-Commerce)
**Prompt**: *"Attach to Edge. Navigate to the staging store, add a 'Blue Hoodie' to the cart, and verify the checkout total is $45.00. Take a screenshot of the final cart."*
*   **Value**: Automates repetitive smoke tests while keeping the user in control of the session.

### 2. Data Entry & Form Filling
**Prompt**: *"Read the latest data from `invoices.json`. For each entry, fill out the vendor portal form and capture a confirmation screenshot with the invoice number as the ID."*
*   **Value**: Eliminates human error in high-volume, tedious data migration tasks.

### 3. Visual & Accessibility Audits
**Prompt**: *"Go to the new login page. Check if the 'Login' button has a valid ARIA label and capture a full-page screenshot to check for layout shifts on mobile viewport."*
*   **Value**: Combines functional testing with compliance and design verification.

---

## 💻 Office Setup & Deployment

### **Installation**
```bash
# Clone and install dependencies
git clone https://github.com/priyobroto-lahiri/Testing-MCP.git
cd Testing-MCP
npm install

# Build the project
npm run build
```

### **Running the Dashboard**
```bash
# Launch the real-time UI and artifact bridge
.\start-dashboard.bat
```
*View live results at: [http://localhost:5173](http://localhost:5173)*

### **Connecting to Cline (VS Code)**

Follow these steps to integrate the Testing-MCP server with your VS Code environment:

#### **Step 1: Install Cline Extension**
1.  Open **VS Code**.
2.  Go to the **Extensions** view (`Ctrl+Shift+X`).
3.  Search for **"Cline"** and click **Install**.

#### **Step 2: API Configuration**
1.  Open the **Cline** panel from the left sidebar.
2.  Click the **Settings (Gear Icon)** in the top right.
3.  **API Provider**: Select **"GitHub Copilot"** (this leverages your existing enterprise subscription).
4.  Ensure you are logged into GitHub within VS Code.

#### **Step 3: Register the MCP Server**
1.  In the same Settings panel, scroll down to **MCP Servers**.
2.  Click **"Configure MCP Servers"** (this opens your `cline_mcp_settings.json` file).
3.  Add the following entry to the `mcpServers` object:
```json
{
  "mcpServers": {
    "testing-mcp": {
      "command": "node",
      "args": ["C:/YOUR_PATH_TO_PROJECT/dist/index.js"],
      "env": {
        "DASHBOARD_PORT": "3001"
      }
    }
  }
}
```
*Replace `C:/YOUR_PATH_TO_PROJECT` with the **absolute path** to your cloned repository.*

#### **Step 4: Verify Connection**
1.  Return to the Cline Chat window.
2.  Look for the **Plug Icon (MCP)** at the bottom of the input field.
3.  Click it to see a list of active servers. **"testing-mcp"** should appear with a green dot.
4.  Hover over it to see the list of available tools like `browser_launch`, `capture_artifact`, etc.

---

## 🛡️ Security & Principles
*   **Privacy First**: No browser data or screenshots are sent to external servers. Only the "instructions" pass through the LLM.
*   **Deterministic**: Every AI action is logged with a timestamp and a unique Step ID.
*   **Self-Healing**: If a CSS selector fails, the system automatically tries XPath and ARIA fallbacks before reporting an error.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
