# AI-Driven Manual Test Execution via GitHub Copilot

This project implements an advanced architecture for automated, AI-driven test execution using GitHub Copilot and the Model Context Protocol (MCP). It focuses on reliability, security, and integration into modern CI/CD pipelines.

---

## Gap Analysis of the Original Architecture

To improve upon traditional AI testing approaches, we identified the following gaps:

1.  **No Authentication/Secret Management layer** — Lack of a vault or secret injection mechanism for credentials.
2.  **No retry/resilience strategy** — Missing a formal fallback chain (CSS → XPath → ARIA → visual match).
3.  **No test artifact persistence** — Screenshots, logs, and DOM snapshots were not being stored.
4.  **No CI/CD integration path** — Purely chat-driven without webhook or pipeline trigger mechanisms.
5.  **Missing observability** — Lack of structured logging, tracing, or metrics for auditing.
6.  **Single MCP server bottleneck** — Monolithic browser MCP servers create single points of failure.
7.  **No rate limiting or cost controls** — Potential for unbounded LLM calls and ballooning costs.
8.  **No session/state persistence between steps** — Inadequate lifecycle management for browser contexts and tokens.
9.  **Missing accessibility and performance assertions** — Lack of hooks for a11y (axe-core) or performance (Lighthouse).
10. **Local browser process lifecycle is undefined** — No strategy for launching, attaching, or tearing down local browser sessions.

---

## Improved Architecture (Version 2.0)

### 1. Guiding Principles

- **Determinism over magic:** Every LLM decision must be traceable to a logged tool call.
- **Defense in depth:** Sandboxing, network policy, and secret management are mandatory.
- **Pipeline-first:** Core system must be CI/CD triggerable, with chat as a convenience layer.
- **Graceful degradation:** Component failures must produce structured FAILED results, never silent hangs.

### 2. System Architecture — Layer Map

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  TRIGGER LAYER                                                          │
│                                                                         │
│  ┌──────────────────────┐   ┌──────────────────────────────────────┐   │
│  │  GitHub Copilot Chat  │   │  CI/CD Pipeline (GitHub Actions /    │   │
│  │  (VS Code / Web / JB) │   │  Jenkins / GitLab CI Webhook)        │   │
│  └──────────┬───────────┘   └──────────────────┬───────────────────┘   │
│             │  Natural Language + Test Case     │  JSON Payload          │
└─────────────┼──────────────────────────────────┼───────────────────────┘
              │                                  │
              └──────────────┬───────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ORCHESTRATION LAYER (Custom Copilot Agent — Node.js / Python)         │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  API Gateway  (Rate Limiter · Auth Middleware · Request Router)  │   │
│  └──────────────────────────────┬──────────────────────────────────┘   │
│                                 │                                       │
│  ┌──────────────────────────────▼──────────────────────────────────┐   │
│  │  Intent Parser & Planner (LLM Pass 1)                           │   │
│  │  - Ingests full test case                                       │   │
│  │  - Emits ordered Step Graph (DAG) with tool assignments         │   │
│  │  - Flags ambiguous steps for clarification before execution     │   │
│  └──────────────────────────────┬──────────────────────────────────┘   │
│                                 │                                       │
│  ┌──────────────────────────────▼──────────────────────────────────┐   │
│  │  Execution State Machine                                        │   │
│  │  States: IDLE → PLANNING → EXECUTING → ASSERTING →             │   │
│  │          HEALING → REPORTING → DONE / FAILED                   │   │
│  │                                                                 │   │
│  │  - Tracks: current_step, retry_count, selector_history,        │   │
│  │    screenshot_refs, cumulative_pass_fail                        │   │
│  │  - Max retries per step: configurable (default 3)              │   │
│  │  - Timeout per step: configurable (default 30s)                │   │
└──────────────┬──────────────────────────────────┘   │
│                                 │                                       │
│  ┌──────────────────────────────▼──────────────────────────────────┐   │
│  │  Self-Healing Selector Engine                                   │   │
│  │  Fallback Chain (in order):                                     │   │
│  │    1. Primary CSS selector (from DOM snapshot)                  │   │
│  │    2. XPath (structural)                                        │   │
│  │    3. ARIA role + accessible name                               │   │
│  │    4. Visible text content match                                │   │
│  │    5. Visual bounding-box match (via screenshot crop + embed)   │   │
│  │  On exhaustion → mark step FAILED, log all attempted selectors  │   │
│  └──────────────────────────────┬──────────────────────────────────┘   │
│                                 │                                       │
│  ┌──────────────────────────────▼──────────────────────────────────┐   │
│  │  Secret & Credential Manager                                    │   │
│  │  - Injects test credentials from Local Keychain / .env /        │   │
│  │    environment variables at runtime                             │   │
│  │  - Never logs or surfaces secrets in test reports               │   │
│  └──────────────────────────────┬──────────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │  JSON-RPC 2.0 over stdio / SSE
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  INTEGRATION LAYER (MCP Server Ecosystem)                              │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Local Session Manager                                          │   │
│  │  - Mode A: Launch fresh isolated browser context                │   │
│  │  - Mode B: Attach to existing browser via CDP port (9222)       │   │
│  │  - Health-checks connection; manages session lifecycle          │   │
│  └───────┬──────────────────────────┬──────────────────────────────┘   │
│          │                          │                                   │
│  ┌───────▼──────────┐   ┌──────────▼────────────┐                     │
│  │ Browser          │   │ Assertion MCP Server   │                     │
│  │ Automation MCP   │   │                        │                     │
│  │ Server           │   │ Tools:                 │                     │
│  │                  │   │ - visual_screenshot     │                     │
│  │ Tools:           │   │ - assert_text_present   │                     │
│  │ - navigate       │   │ - assert_url_matches    │                     │
│  │ - click          │   │ - assert_element_state  │                     │
│  │ - type           │   │ - a11y_audit (axe-core) │                     │
│  │ - hover          │   │ - perf_snapshot (CDP)   │                     │
│  │ - select         │   └──────────┬─────────────┘                     │
│  │ - get_dom        │              │                                   │
│  │ - get_network_log│   ┌──────────▼─────────────┐                     │
│  │ - set_viewport   │   │ Artifact Store MCP      │                     │
│  └───────┬──────────┘   │ Server                  │                     │
│          │              │                         │                     │
│          │              │ - store_screenshot       │                     │
│          │              │ - store_log              │                     │
│          │              │ - store_har              │                     │
│          │              │ - retrieve_artifact      │                     │
│          │              │ Backends:               │                     │
│          │              │   Local FS / S3 /       │                     │
│          │              │   GitHub Artifacts      │                     │
│          │              └─────────────────────────┘                     │
└──────────┼──────────────────────────────────────────────────────────────┘
           │  CDP / WebSocket
           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  EXECUTION & RUNTIME LAYER                                             │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Playwright (Recommended) / Puppeteer Node Runtime              │   │
│  │  - Local process execution; direct OS access                    │   │
│  │  - Auto-waiting on element readiness                            │   │
│  │  - CDP stream for real-time screenshots                         │   │
│  │  - Browser: Chromium (default) / Firefox / WebKit              │   │
│  └──────────────────────────────┬──────────────────────────────────┘   │
│                                 │                                       │
│  ┌──────────────────────────────▼──────────────────────────────────┐   │
│  │  System Under Test (SUT) — Localhost / Staging / Production     │   │
│  │  (Production access managed via user's local network config)    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  OBSERVABILITY LAYER (Cross-Cutting)                                   │
│                                                                         │
│  - Structured JSON logs (per step): timestamp, step_id, tool,         │
│    selector_used, outcome, duration_ms, retry_count                    │
│  - OpenTelemetry trace spans exported to Grafana / Datadog / OTEL      │
│  - Prometheus metrics: pass_rate, avg_step_duration, healing_rate      │
│  - Test Report Output: Markdown + JUnit XML (for CI ingestion)        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Tool Reference Guide

This table provides a non-technical explanation of the tools the AI uses to interact with your system.

| Tool Name | Action | Stakeholder Explanation |
|:---|:---|:---|
| `browser_launch` | **Start Fresh** | Opens a completely new, clean web browser for a new test session. |
| `browser_attach` | **Join Existing** | Connects to the browser you already have open (perfect for office VDIs). |
| `browser_navigate` | **Go to Website** | Directs the browser to a specific web address (URL). |
| `browser_interact` | **Click/Type/Hover** | Performs physical actions like clicking buttons or typing text into boxes. |
| `browser_get_dom` | **Read Page** | "Scrapes" the page so the AI can understand the layout and buttons. |
| `assert_text` | **Verify Text** | Confirms that a specific word or message is visible on the screen. |
| `capture_artifact` | **Take Evidence** | Saves a screenshot or a copy of the page data as proof for the report. |
| `browser_close` | **Finish & Clean** | Safely closes the browser or disconnects once the test is done. |

---

## 4. Revised MCP Tool Schema

### 4.1 `browser_navigate`
- **Params:** `url` (string, required), `wait_until` (enum: `load` | `domcontentloaded` | `networkidle`, default `networkidle`)
- **Returns:** `{ status_code, page_title, final_url, load_time_ms }`

### 4.2 `browser_interact`
- **Params:** `action` (enum: `click` | `type` | `hover` | `clear` | `select` | `focus` | `key_press`), `selector` (string), `value` (string, optional), `selector_strategy` (enum: `css` | `xpath` | `aria` | `text`, default `css`)
- **Returns:** `{ success, resolved_selector, element_snapshot, duration_ms }`

### 4.3 `browser_get_dom`
- **Params:** `scope` (enum: `full` | `interactive_only` | `visible_only`, default `interactive_only`), `include_coordinates` (boolean, default true)
- **Returns:** Compressed JSON tree of interactive elements with bounding boxes and ARIA roles

### 4.4 `browser_get_network_log`
- **Params:** `filter_status` (int[], optional — e.g., `[400, 500]`)
- **Returns:** Array of `{ url, method, status, duration_ms }` — catches silent API failures during UI actions

### 4.5 `assert_visual`
- **Params:** `scope` (enum: `viewport` | `element` | `full_page`), `selector` (string, optional), `baseline_ref` (string, optional — enables pixel-diff regression)
- **Returns:** `{ image_b64, artifact_id, diff_score? }`

### 4.6 `assert_text_present`
- **Params:** `text` (string), `selector` (string, optional), `exact_match` (boolean, default false)
- **Returns:** `{ found, matched_element, surrounding_context }`

### 4.7 `assert_element_state`
- **Params:** `selector` (string), `expected_state` (enum: `visible` | `hidden` | `enabled` | `disabled` | `checked`)
- **Returns:** `{ matches, actual_state }`

### 4.8 `a11y_audit`
- **Params:** `standard` (enum: `wcag2a` | `wcag2aa` | `wcag21aa`, default `wcag2aa`), `selector` (string, optional — scopes audit to a component)
- **Returns:** `{ violations[], passes[], incomplete[] }` (axe-core output)

### 4.9 `perf_snapshot`
- **Params:** none
- **Returns:** `{ lcp_ms, cls_score, fid_ms, ttfb_ms }` via CDP Performance API

---

## 5. Execution Flow

1.  **Input Validation & Rate-limit Check**: [Trigger: Chat Prompt OR CI Webhook]
2.  **Intent Parser — LLM Pass 1**: Produces Step DAG. Flags ambiguous steps for clarification.
3.  **Secret Injection**: Credentials fetched from Local Keychain/.env and injected into step params (never logged).
4.  **Local Browser Session Allocation**: Local Session Manager verifies connection to existing browser (CDP) or launches a fresh instance.
5.  **Per-Step Execution Loop**:
    - Execute tool call via MCP.
    - On element-not-found → Self-Healing Engine (fallback chain).
    - Store screenshot + DOM snapshot to Artifact Store.
6.  **Report Generation**: Markdown report (human-readable) + JUnit XML (CI ingestion). Metrics pushed to Prometheus.
7.  **Session Teardown**: Browser context wiped (if fresh launch); clean detachment from CDP session.

---

## 6. Data Flow: From User Input to Browser Action

This section traces the complete journey of a test case from the user's initial input to the final automated browser action.

1.  **User Input (The Trigger)**
    *   **Action:** A user inputs a natural language test case (e.g., "Log in, search for 'shoes', and verify the first result is a Nike shoe") via **GitHub Copilot Chat** OR a CI pipeline sends a JSON payload containing the test scenario to the **API Gateway Webhook**.
    *   **Data Structure:** Unstructured text or structured JSON test definition.

2.  **Intent Parsing & Planning (The Brain)**
    *   **Action:** The **Orchestration Layer** receives the input. The **Intent Parser (LLM Pass 1)** analyzes the test case and breaks it down into a deterministic **Step DAG** (Directed Acyclic Graph).
    *   **Data Structure:** A JSON array of discrete steps. For example: `[{"step": 1, "action": "navigate", "url": "https://example.com/login"}, {"step": 2, "action": "interact", "type": "type", "selector": "username_field", "value": "USER_CRED"}]`.

3. **Credential Injection (The Local Vault)**
    *   **Action:** The **Secret & Credential Manager** intercepts the DAG. It identifies placeholders (like `USER_CRED`) and fetches the actual secrets from the **Local OS Keychain**, **.env files**, or system environment variables.
    *   **Data Structure:** The DAG is enriched with sensitive values *in memory only*. These values are masked in all subsequent logging.

4.  **Local Browser Session Allocation (The Environment)**
    *   **Action:** The **Local Session Manager** receives the prepared DAG and verifies the connection to a target browser.
        *   **Mode A (Launch):** It launches a fresh, isolated Chromium/Firefox process via Playwright.
        *   **Mode B (Attach):** It connects to an existing browser already running with a remote debugging port (CDP).
    *   **Data Structure:** WebSocket URL or CDP endpoint for the browser session.

5.  **Execution & Tool Routing (The Hands & Eyes)**
    *   **Action:** The **Execution State Machine** begins processing the DAG step-by-step.
        *   It sends an MCP tool request (e.g., `browser_navigate`) to the **Browser Automation MCP Server**.
        *   The MCP Server translates the request into **Playwright/Puppeteer CDP commands**.
        *   The Node.js Runtime executes the action directly on the local browser process.
    *   **Data Structure:** JSON-RPC 2.0 messages bridging the Orchestrator and the local MCP Server.

6.  **Assertion & State Validation (The Verification)**
    *   **Action:** After an action, the State Machine triggers the **Assertion MCP Server**.
        *   It might request a DOM snapshot (`browser_get_dom`), a visual screenshot, or an accessibility audit (`a11y_audit`).
        *   If an action fails (e.g., "button not found"), the **Self-Healing Selector Engine** intervenes, generating new fallback selectors (CSS -> XPath -> ARIA) and retrying the action.

7.  **Artifact Storage & Observability (The Record)**
    *   **Action:** Throughout execution, structured logs are emitted. Screenshots, HAR files (network logs), and DOM snapshots are sent to the **Artifact Store MCP Server**, which saves them to **Local FS, AWS S3, or GitHub Artifacts**.
    *   **Data Structure:** Binary image data, compressed JSON (HAR), and OpenTelemetry trace spans.

8.  **Reporting & Teardown (The Output)**
    *   **Action:** Once all steps complete (or fatally fail), a final Markdown and JUnit XML report is generated. The **Local Session Manager** then closes the spawned browser (Mode A) or cleanly detaches from the CDP port (Mode B) without affecting the user's browser.


---

## 7. Technology Stack & Required Skills

To build and maintain this architecture, the following tools, software, and specialized skills are required:

### 1. Orchestration & Intelligence Layer
*   **Languages:** Node.js (TypeScript) or Python.
*   **Frameworks:** LangChain / LlamaIndex (for LLM orchestration and DAG generation).
*   **LLMs:** GPT-4o, Claude 3.5 Sonnet, or equivalent powerful models capable of complex JSON generation and spatial reasoning.
*   **Skills:** Prompt engineering, building LLM agents, state machine design, handling LLM hallucinations.

### 2. Integration Layer (MCP Servers)
*   **Protocol:** Model Context Protocol (MCP) specification.
*   **Communication:** JSON-RPC 2.0, WebSockets, Server-Sent Events (SSE).
*   **Skills:** API design, asynchronous communication patterns, understanding of the MCP ecosystem.

### 3. Execution & Runtime Layer (Browser Automation)
*   **Frameworks:** Playwright (Highly Recommended) or Puppeteer.
*   **Browser:** Chromium, Firefox, WebKit (Headless).
*   **Tools:** axe-core (for accessibility testing), Lighthouse (for performance profiling).
*   **Skills:** Deep knowledge of DOM manipulation, CDP (Chrome DevTools Protocol), XPath, ARIA roles, visual regression testing techniques.

### 4. Security & Secret Management
*   **Tools:** Local OS Keychain (e.g., macOS Keychain, Windows Credential Manager), `.env` files, OS Environment Variables.
*   **Skills:** Secure local environment variable handling, zero-trust architecture principles applied to local development.

### 5. Observability & CI/CD
*   **Telemetry:** OpenTelemetry (OTel).
*   **Logging/Monitoring:** Grafana, Datadog, Prometheus, ELK Stack.
*   **CI/CD Integration:** GitHub Actions, Jenkins, GitLab CI.
*   **Skills:** Distributed tracing, structured logging (JSON), setting up Prometheus metrics, writing custom GitHub Actions.

---

## 8. System Prompt Template

### SYSTEM INSTRUCTIONS — QA EXECUTION AGENT v2

You are an expert QA Automation Engineer operating a web browser via Model Context Protocol (MCP) tools.

### STRICT EXECUTION RULES

1.  **PLAN BEFORE ACTING**: Read the entire test case. Emit a Step DAG as JSON before calling any browser tool.
2.  **INSPECT BEFORE INTERACTING**: Always call `browser_get_dom` before the first interaction on a new page.
3.  **ASSERT EXPLICITLY**: Every "Expected Result" must map to exactly one assertion tool call.
4.  **HANDLE TRANSITIONS**: After navigation or actions that trigger routing, call `browser_get_dom` again.
5.  **NETWORK AWARENESS**: Call `browser_get_network_log` filtered to 4xx/5xx to catch silent backend failures.
6.  **NEVER SURFACE SECRETS**: Credential values must not appear in logs or reports.
7.  **STRUCTURED REPORTING**: Conclude with a Markdown report including status, step table, artifacts, and failure details.

---

## 9. Security Model (Hardened)

| Control | Implementation |
|---|---|
| Process Isolation | Fresh browser profile/context per run (Mode A) |
| Credential Security | Integration with Local OS Keychain; secrets masked in logs |
| Production Guard | Domain allowlist enforced in Orchestration layer |
| Session Isolation | Incognito mode/ephemeral contexts; cookies wiped on teardown |
| Rate Limiting | API Gateway enforces per-user LLM call budget |
| Audit Trail | Structured step-by-step logs with tool call visibility |
| Cost Controls | Max steps per run; token budget per step |

---

## 10. Key Improvements Over v1

| Dimension | v1 | v2 |
|---|---|---|
| Selector resilience | Vague mention | 5-stage fallback chain with full logging |
| Assertions | Screenshot only | Visual + text + state + a11y + performance |
| CI/CD | Chat-only | Webhook trigger + JUnit XML output |
| Secret handling | Not addressed | OS Keychain / .env integration, never logged |
| Artifact persistence | Not addressed | Artifact Store MCP (FS / S3 / GitHub) |
| Observability | None | Structured logs + OTel traces + Prometheus |
| Browser Lifecycle | Undefined | Local Session Manager (Launch / CDP Attach) |
| Network failures | Not detected | `browser_get_network_log` after every mutation |
        |
| Cost controls | None | Rate limiter + token budget + step cap |
| Ambiguity handling | None | Planner flags ambiguous steps before execution |

---

## 🚀 Office Laptop Setup & Quick Start

Follow these steps to get the Testing MCP project running on a new machine.

### Prerequisites
1. **Node.js**: v18 or higher (\`node -v\` to check).
2. **VS Code**: With the **Cline** extension installed.
3. **GitHub Copilot**: Access enabled in your VS Code / Cline settings.
4. **Browser**: Microsoft Edge or Google Chrome.

### Step 1: Installation & Build
Clone the repository and install all dependencies:
\`\`\`bash
# 1. Install backend dependencies
npm install

# 2. Install frontend dependencies
cd dashboard/frontend
npm install
cd ../..

# 3. Build the project
npm run build
\`\`\`

### Step 2: Start the Dashboard
The execution dashboard gives you real-time visibility into the AI's actions and saves artifacts (screenshots).
\`\`\`bash
# Run this from the root of the project
.\start-dashboard.bat
\`\`\`
*Access the dashboard in your browser at: **http://localhost:5173***

### Step 3: Configure the Browser (Attach Mode)
For office environments, it's best to attach the AI to a browser window where you are already logged in to bypass SSO/MFA.
1. Close all existing browser windows.
2. Launch Edge from the command line or a modified shortcut with debugging enabled:
   \`\`\`bash
   msedge.exe --remote-debugging-port=9222
   \`\`\`

### Step 4: Configure Cline (MCP Server)
1. Open the Cline extension in VS Code.
2. Go to Settings (gear icon) -> MCP Servers.
3. Add a new server configuration pointing to the compiled \`index.js\` file:
   * **Command**: \`node\`
   * **Arguments**: \`["<absolute_path_to_cloned_repo>/dist/index.js"]\`

### Step 5: Test the Setup
Paste this prompt into Cline to verify the connection:
> "Attach to the existing browser on port 9222. Navigate to https://www.google.com, capture a screenshot with stepId 'setup-validation', and get the page title."

---

