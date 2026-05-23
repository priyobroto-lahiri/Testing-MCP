# Stakeholder Guide: AI-Powered Testing Assistant

## Executive Summary
This tool is an **AI-driven testing assistant** designed to eliminate the repetitive parts of manual testing. It uses your existing **GitHub Copilot** subscription to "drive" your local web browser—allowing you to execute complex test cases just by describing them in plain English.

By bridging the gap between AI "thinking" and browser "doing," we reduce test execution time by up to **70%** while increasing accuracy through automated evidence collection.

---

## 🌟 Key Business Benefits

1.  **Zero Additional Cost**: Uses your existing $10/month office Copilot subscription. No expensive OpenAI or Anthropic API keys required for chat-based usage.
2.  **VDI & Office Ready**: Designed specifically for restricted office environments (VDIs). It can "attach" to the browser you already have open and logged in.
3.  **Self-Repairing Tests**: Traditional automation breaks when a button changes color or moves. Our AI "self-heals" by looking at the page layout and finding the right element logically, just like a human would.
4.  **Automatic Evidence**: Every action generates a screenshot and a "brain dump" (DOM snapshot), creating an instant audit trail for QA reports or compliance.

---

## 🛠️ How It Works (The "Hands and Eyes" Model)

Think of this tool as giving the AI **Hands** and **Eyes**:
*   **The Brain**: GitHub Copilot (The AI you already pay for).
*   **The Eyes**: Our tool "scrapes" the page to show the AI what's on your screen.
*   **The Hands**: Our tool clicks, types, and navigates based on the AI's instructions.

---

## 🚀 Quick Start Guide (The "Attach" Method)

This is the preferred method for office users who are already logged into internal portals.

### 1. Prepare your Browser
Close Edge and reopen it using this special command (you can save this as a desktop shortcut):
> `msedge.exe --remote-debugging-port=9222`
*This allows the AI to "see" inside this specific browser window.*

### 2. Connect the Brain
In VS Code, we use a bridge (like the "Cline" extension). 
1.  Open the settings.
2.  Select **"GitHub Copilot"** as your AI provider.
3.  Point the "MCP Server" setting to our project folder.

### 3. Just Talk to it
Open the chat window and give it a mission:
> *"Attach to my browser. Go to the 'Invoices' tab, find the first pending invoice, click 'Approve', and take a screenshot when done."*

---

## 📈 Audit & Reporting
After every "mission," the tool generates a professional report in the `artifacts/` folder:
*   **Markdown Summary**: A human-readable story of what the AI did.
*   **Success/Failure**: Clearly marked steps.
*   **Screenshots**: Visual proof of every interaction.
*   **Network Logs**: Proof that the backend handled the request correctly.

---

## ⚖️ Security & Privacy
*   **Your Data Stays Local**: The actual browser interactions and screenshots happen **only on your machine**. 
*   **Masked Secrets**: The tool is designed to never send passwords or sensitive credentials to the AI in plain text.
*   **Read-Only Audit**: You can see every command the AI sends to your browser in the log window.

---

## 💡 Use Cases for the Team
*   **Regression Testing**: "Ensure the login still works after this morning's update."
*   **Data Entry**: "Fill out this 20-field form using the data from this text file."
*   **Visual Verification**: "Tell me if the new logo is appearing correctly on all 5 sub-pages."
