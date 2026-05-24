import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { BrowserSession } from '../types';
import * as crypto from 'crypto';

export class SessionManager {
  private sessions: Map<string, BrowserSession> = new Map();

  /**
   * Mode A: Launch a fresh isolated browser context.
   * Allows selecting browser via BROWSER env var (default: msedge).
   */
  async launchSession(): Promise<BrowserSession> {
    try {
      const isHeadless = process.env.HEADLESS === 'true' || !!process.env.CI;
      const selectedBrowser = process.env.BROWSER || 'msedge';
      
      console.error(`[SessionManager] Launching ${selectedBrowser}...`);
      
      const browser = await chromium.launch({ 
        headless: isHeadless,
        channel: selectedBrowser as any
      }); 
      const context = await browser.newContext();
      const page = await context.newPage();
      const id = crypto.randomUUID();

      const session: BrowserSession = {
        id,
        browser,
        context,
        page,
        mode: 'LAUNCH',
      };

      this.sessions.set(id, session);
      console.error(`[SessionManager] Launched new session: ${id}`);
      return session;
    } catch (error) {
      console.error('[SessionManager] Failed to launch session:', error);
      throw error;
    }
  }

  /**
   * Mode B: Attach to an existing browser via CDP port.
   */
  async attachSession(cdpUrl: string = 'http://localhost:9222'): Promise<BrowserSession> {
    try {
      const browser = await chromium.connectOverCDP(cdpUrl);
      
      // When connecting via CDP, there might already be contexts and pages
      let context = browser.contexts()[0];
      if (!context) {
        context = await browser.newContext();
      }
      
      let page = context.pages()[0];
      if (!page) {
        page = await context.newPage();
      }

      const id = crypto.randomUUID();
      const session: BrowserSession = {
        id,
        browser,
        context,
        page,
        mode: 'ATTACH',
        cdpUrl,
      };

      this.sessions.set(id, session);
      console.error(`[SessionManager] Attached to session: ${id} via ${cdpUrl}`);
      return session;
    } catch (error) {
      console.error(`[SessionManager] Failed to attach to session at ${cdpUrl}:`, error);
      throw error;
    }
  }

  /**
   * Properly closes or detaches the session.
   */
  async closeSession(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) {
      console.warn(`[SessionManager] Session not found: ${id}`);
      return;
    }

    try {
      if (session.mode === 'LAUNCH') {
        await session.browser.close();
        console.error(`[SessionManager] Closed session: ${id}`);
      } else {
        // For ATTACH mode, we detach
        await session.browser.close(); // connectOverCDP browser.close() actually detaches
        console.error(`[SessionManager] Detached from session: ${id}`);
      }
    } catch (error) {
      console.error(`[SessionManager] Error closing session ${id}:`, error);
    } finally {
      this.sessions.delete(id);
    }
  }

  /**
   * Gets a session by ID.
   */
  getSession(id: string): BrowserSession | undefined {
    return this.sessions.get(id);
  }

  /**
   * Health-check for a session.
   */
  async isSessionAlive(id: string): Promise<boolean> {
    const session = this.sessions.get(id);
    if (!session) return false;

    try {
      return session.browser.isConnected() && !session.page.isClosed();
    } catch {
      return false;
    }
  }

  /**
   * List all active sessions.
   */
  listSessions(): BrowserSession[] {
    return Array.from(this.sessions.values());
  }
}
