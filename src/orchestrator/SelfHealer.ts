import { BrowserSession, ActionResult, HealingContext, SelectorStrategy } from '../types';
import { BrowserTools } from '../tools/BrowserTools';
import { AssertionTools } from '../tools/AssertionTools';

export class SelfHealer {
  private browserTools: BrowserTools;
  private assertionTools: AssertionTools;

  constructor() {
    this.browserTools = new BrowserTools();
    this.assertionTools = new AssertionTools();
  }

  /**
   * Attempts to heal a failed interaction by trying alternative selector strategies.
   * Fallback Chain: CSS -> XPath -> ARIA -> Text
   */
  async attemptHealing(session: BrowserSession, context: HealingContext): Promise<ActionResult> {
    console.error(`[SelfHealer] Attempting to heal step ${context.stepId}. Failed selector: ${context.failedSelector} (${context.failedStrategy})`);

    const strategiesToTry = this.sortStrategies(context.attemptedStrategies, context.failedSelector, context.failedStrategy);

    if (strategiesToTry.length === 0) {
      console.error(`[SelfHealer] No alternative strategies provided for step ${context.stepId}. Analyzing DOM for context...`);
      // We still get the DOM as requested, even if we don't use it yet for auto-discovery
      await this.browserTools.getDOM(session);
      return {
        success: false,
        error: `No alternative strategies provided for healing step ${context.stepId}`,
      };
    }

    for (const strategy of strategiesToTry) {
      console.error(`[SelfHealer] Trying fallback strategy: ${strategy.strategy} = ${strategy.selector}`);
      
      let result: ActionResult;
      
      try {
        switch (context.action) {
          case 'click':
            result = await this.browserTools.click(session, strategy.selector);
            break;
          case 'type':
            result = await this.browserTools.type(session, strategy.selector, context.params.value);
            break;
          case 'hover':
            result = await this.browserTools.hover(session, strategy.selector);
            break;
          case 'assert':
            // For assertions, we need to know which assertion to run.
            // Assuming params contains the assertion type and its specific parameters.
            if (context.params.type === 'text') {
              result = await this.assertionTools.assertText(session, context.params.text, strategy.selector);
            } else if (context.params.type === 'state') {
              result = await this.assertionTools.assertElementState(session, strategy.selector, context.params.state);
            } else {
              result = { success: false, error: `Unsupported assertion type for healing: ${context.params.type}` };
            }
            break;
          default:
            result = { success: false, error: `Unsupported action for healing: ${context.action}` };
        }
      } catch (err: any) {
        result = { success: false, error: err.message };
      }

      if (result.success) {
        console.error(`[SelfHealer] Healing successful using ${strategy.strategy} strategy!`);
        return {
          ...result,
          message: `Healed using ${strategy.strategy} strategy. Original failed: ${context.failedSelector}. New: ${strategy.selector}`,
        };
      } else {
        console.error(`[SelfHealer] Fallback strategy ${strategy.strategy} failed: ${result.error || result.message}`);
      }
    }

    return {
      success: false,
      error: `All ${strategiesToTry.length} fallback strategies failed for step ${context.stepId}`,
    };
  }

  /**
   * Sorts strategies according to the fallback chain: CSS -> XPath -> ARIA -> Text
   * and excludes the failed strategy.
   */
  private sortStrategies(strategies: SelectorStrategy[], failedSelector: string, failedStrategy: string): SelectorStrategy[] {
    const order = { 'css': 1, 'xpath': 2, 'aria': 3, 'text': 4 };

    return strategies
      .filter(s => !(s.selector === failedSelector && s.strategy === failedStrategy))
      .sort((a, b) => {
        const orderA = order[a.strategy as keyof typeof order] || 99;
        const orderB = order[b.strategy as keyof typeof order] || 99;
        return orderA - orderB;
      });
  }
}
