# Project Roadmap: AI-Driven Manual Test Execution

> Estimated Timeline: 6–8 Weeks (1.5 – 2 Months)  
> Team: 2 Senior Engineers (Full-Stack / AI / Browser Automation)

---

## Overview

This roadmap outlines the development of the **Version 2.0 Local-First Architecture**. By pivoting to a local execution model (launching/attaching to local browsers instead of Docker), we have reduced the timeline from 4 months to approximately 2 months by focusing on developer utility and core agent intelligence.

---

## Phase 1: Local Integration & Core MCP Servers
**Weeks 1 – 2**

This phase builds the "Hands and Eyes" of the system, enabling the LLM to control the local environment.

### 1.1 Local Session Manager
*   **Mode A (Launch):** Implement logic to launch fresh, isolated Chromium/Firefox instances via Playwright with unique profiles.
*   **Mode B (Attach):** Build the connection logic for the Chrome DevTools Protocol (CDP) to attach to an existing browser on port 9222.
*   **Lifecycle Management:** Ensure clean detachment and process cleanup on test completion.

### 1.2 Browser Automation MCP
*   **Tool Suite:** Implement `navigate`, `interact` (click, type, hover), and `get_dom`.
*   **Network Awareness:** Build `get_network_log` to capture silent 4xx/5xx API failures during UI interactions.
*   **Compression:** Implement DOM tree compression for context-efficient LLM processing.

### 1.3 Assertion & Artifact Store MCP
*   **Standard Assertions:** Build text-present, URL-match, and element-state assertions.
*   **Artifact Store:** Implement local filesystem persistence for screenshots and DOM snapshots in an `./artifacts` directory.

---

## Phase 2: Orchestration Layer & Intelligence
**Weeks 3 – 6**

This is the "Brain" of the system, converting intent into reliable, self-healing actions.

### 2.1 Intent Parser & Planner
*   **LLM Pass 1:** Build the prompt chain that converts natural language test cases into a deterministic JSON **Step DAG** (Directed Acyclic Graph).
*   **Ambiguity Handling:** Implement logic to flag vague steps and ask the user for clarification before starting execution.

### 2.2 Execution State Machine
*   **The Loop:** Develop the core state machine (IDLE -> PLANNING -> EXECUTING -> ASSERTING -> REPORTING).
*   **Reliability:** Implement step-level timeouts and configurable retries.

### 2.3 Self-Healing Selector Engine
*   **Fallback Chain:** Implement the multi-stage resilience logic (CSS → XPath → ARIA → Visible Text).
*   **Learning:** Log all successful fallbacks to improve future selector generation.

---

## Phase 3: Developer Experience & Security
**Weeks 7 – 8**

Refining the system for developer productivity, security, and auditable reporting.

### 3.1 Local Secret Management
*   **Credential Injection:** Build integration with `.env` files and standard OS Keychains (macOS Keychain / Windows Credential Manager).
*   **Security:** Ensure secrets are never logged in tool calls, reports, or console output.

### 3.2 Observability & Reporting
*   **Structured Logs:** Emit OTel trace spans and structured JSON logs for every tool call.
*   **Rich Reports:** Generate Markdown summaries with embedded artifact links and JUnit XML files for CI integration.

---

## Phase 4: Production Integration
**Weeks 9 – 10**

Scaling the system for team usage and fully automated pipelines.

### 4.1 Live LLM Brain
*   **API Integration:** Replace placeholder logic with actual OpenAI/Anthropic API calls for dynamic plan generation.
*   **Contextual Feedback:** Feed execution results and DOM snapshots back to the LLM to refine subsequent steps.

### 4.2 CI/CD Orchestration
*   **GitHub Actions:** Create reusable workflows to execute tests on PRs, including artifact upload and status reporting.
*   **Headless Scaling:** Optimize the local session manager for high-concurrency headless execution in CI environments.

### 4.3 Visual Healing & CLI
*   **Visual Fallback:** Implement (x, y) coordinate-based interaction fallback using LLM spatial reasoning on screenshots.
*   **CLI Wrapper:** Build a polished CLI (e.g., `test-mcp run --test login.md`) for ease of use.

---

## Phase 5: Live Execution Dashboard (Local-First)
**Weeks 11 – 12**

Providing real-time visual monitoring using local file-based storage.

### 5.1 Local Data Bridge
*   **JSON Logger:** Implement a persistent `execution_log.json` that stores the history of all commands, statuses, and linked screenshot paths.
*   **Express File Server:** Set up an Express server that watches the JSON log for changes and serves the local `artifacts/` folder as static assets.
*   **WebSocket Sync:** Broadcast "delta" updates to the React frontend whenever the JSON log is appended to.

### 5.2 React Dashboard
*   **File-Based Feed:** Build a UI that reads from the local data bridge.
*   **Visual Evidence:** Display the locally stored screenshots directly in the dashboard using the Express static file server.
*   **Tailwind UI:** Maintain a premium, high-impact aesthetic for stakeholder pitches.

---

## Key Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| **"Works on My Machine"** | Medium | Documentation for standard browser profiles and profile isolation (Mode A). |
| **CDP Attach State** | Medium | Orchestrator verifies page state and clears common overlays/modals upon attachment. |
| **LLM Hallucinations** | High | Mandatory "Inspect before interact" rule (always call `get_dom` before mutation). |
| **Cost Control** | Low | Hard caps on max steps per run and token budget per step. |

---

## Success Criteria

1.  **Zero Silent Failures:** Every backend API error is caught via `get_network_log`.
2.  **Resilience:** The self-healing engine correctly fixes at least 80% of brittle CSS selector changes.
3.  **Auditability:** Every single action is traceable to a specific tool call, DOM snapshot, and screenshot.
