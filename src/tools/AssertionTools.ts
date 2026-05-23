import { BrowserSession, ActionResult } from '../types';

export class AssertionTools {
  /**
   * Asserts that text is present on the page or within a specific element
   */
  async assertText(
    session: BrowserSession,
    text: string,
    selector?: string
  ): Promise<ActionResult> {
    try {
      if (selector) {
        const locator = session.page.locator(selector);
        const isVisible = await locator.isVisible();
        if (!isVisible) {
          return { success: false, error: `Element "${selector}" is not visible` };
        }
        const content = await locator.textContent();
        if (content?.includes(text)) {
          return { success: true, message: `Text "${text}" found in element "${selector}"` };
        }
        return { success: false, error: `Text "${text}" NOT found in element "${selector}"` };
      } else {
        const content = await session.page.content();
        if (content.includes(text)) {
          return { success: true, message: `Text "${text}" found on page` };
        }
        return { success: false, error: `Text "${text}" NOT found on page` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Asserts the state of an element (visible, hidden, enabled, disabled, editable)
   */
  async assertElementState(
    session: BrowserSession,
    selector: string,
    state: 'visible' | 'hidden' | 'enabled' | 'disabled' | 'editable'
  ): Promise<ActionResult> {
    try {
      const locator = session.page.locator(selector);
      let isMatch = false;

      switch (state) {
        case 'visible':
          isMatch = await locator.isVisible();
          break;
        case 'hidden':
          isMatch = await locator.isHidden();
          break;
        case 'enabled':
          isMatch = await locator.isEnabled();
          break;
        case 'disabled':
          isMatch = await locator.isDisabled();
          break;
        case 'editable':
          isMatch = await locator.isEditable();
          break;
      }

      if (isMatch) {
        return { success: true, message: `Element "${selector}" is ${state}` };
      } else {
        return { success: false, error: `Element "${selector}" is NOT ${state}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Captures a screenshot for visual assertion
   * Returns the screenshot as a Buffer
   */
  async visualScreenshot(
    session: BrowserSession,
    options: { selector?: string; fullPage?: boolean } = {}
  ): Promise<Buffer> {
    if (options.selector) {
      return await session.page.locator(options.selector).screenshot();
    }
    return await session.page.screenshot({ fullPage: options.fullPage });
  }

  /**
   * Performs an accessibility audit using axe-core
   * Placeholder for now as axe-playwright is not installed
   */
  async a11yAudit(session: BrowserSession): Promise<ActionResult> {
    return {
      success: false,
      error: "a11y_audit is not yet implemented. Please install 'axe-playwright' and 'axe-core' to enable this feature."
    };
  }
}
