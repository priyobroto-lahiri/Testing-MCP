import { BrowserSession, ActionResult } from '../types';
import { Page } from 'playwright';

const networkLogs = new WeakMap<Page, any[]>();

export class BrowserTools {
  private ensureNetworkListener(page: Page) {
    if (!networkLogs.has(page)) {
      const logs: any[] = [];
      networkLogs.set(page, logs);
      page.on('response', (response) => {
        const status = response.status();
        if (status >= 400) {
          logs.push({
            url: response.url(),
            status,
            method: response.request().method(),
            timestamp: new Date().toISOString(),
          });
        }
      });
    }
  }

  /**
   * Navigates to a URL
   */
  async navigate(
    session: BrowserSession,
    url: string,
    waitUntil: 'load' | 'domcontentloaded' | 'networkidle' | 'commit' = 'load'
  ): Promise<ActionResult> {
    try {
      this.ensureNetworkListener(session.page);
      await session.page.goto(url, { waitUntil });
      return { success: true, message: `Navigated to ${url}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Clicks an element
   */
  async click(session: BrowserSession, selector: string): Promise<ActionResult> {
    try {
      this.ensureNetworkListener(session.page);
      await session.page.click(selector);
      return { success: true, message: `Clicked ${selector}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Types into an element
   */
  async type(session: BrowserSession, selector: string, value: string): Promise<ActionResult> {
    try {
      this.ensureNetworkListener(session.page);
      await session.page.fill(selector, value);
      return { success: true, message: `Typed "${value}" into ${selector}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Hovers over an element
   */
  async hover(session: BrowserSession, selector: string): Promise<ActionResult> {
    try {
      this.ensureNetworkListener(session.page);
      await session.page.hover(selector);
      return { success: true, message: `Hovered over ${selector}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Gets the page title
   */
  async getTitle(session: BrowserSession): Promise<ActionResult> {
    try {
      this.ensureNetworkListener(session.page);
      const title = await session.page.title();
      return { success: true, data: title, message: `Page title is: ${title}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Gets a compressed JSON tree of interactive elements
   */
  async getDOM(session: BrowserSession): Promise<ActionResult> {
    try {
      this.ensureNetworkListener(session.page);
      const domTree = await session.page.evaluate(() => {
        function isInteractive(el: Element, style: CSSStyleDeclaration): boolean {
          const tagName = el.tagName.toLowerCase();
          const role = el.getAttribute('role');
          const interactiveRoles = ['button', 'link', 'checkbox', 'menuitem', 'tab', 'radio', 'textbox', 'searchbox'];
          
          if (['a', 'button', 'input', 'select', 'textarea'].includes(tagName)) return true;
          if (role && interactiveRoles.includes(role)) return true;
          if (el.hasAttribute('onclick') || style.cursor === 'pointer') return true;
          
          return false;
        }

        function getVisibleTree(el: Element): any {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
            return null;
          }

          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            // Check if any children are visible
            const children = Array.from(el.children)
              .map(child => getVisibleTree(child))
              .filter(child => child !== null);
            
            if (children.length === 0) return null;
            
            return {
              tagName: el.tagName.toLowerCase(),
              children: children.length > 0 ? children : undefined
            };
          }

          const interactive = isInteractive(el, style);
          const children = Array.from(el.children)
            .map(child => getVisibleTree(child))
            .filter(child => child !== null);

          if (!interactive && children.length === 0) {
            return null;
          }

          return {
            tagName: el.tagName.toLowerCase(),
            id: el.id || undefined,
            role: el.getAttribute('role') || undefined,
            text: interactive ? el.textContent?.trim().substring(0, 50) : undefined,
            rect: interactive ? {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            } : undefined,
            children: children.length > 0 ? children : undefined
          };
        }

        return getVisibleTree(document.body);
      });

      return {
        success: true,
        data: domTree,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Gets network logs filtered for 4xx/5xx responses
   */
  async getNetworkLog(session: BrowserSession): Promise<ActionResult> {
    try {
      this.ensureNetworkListener(session.page);
      const logs = networkLogs.get(session.page) || [];
      return {
        success: true,
        data: logs
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
