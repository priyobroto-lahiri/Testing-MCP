import { BrowserSession, TestPlan, TestStep, StepResult, StepArtifact, ActionResult, HealingContext, SelectorStrategy } from '../types';
import { BrowserTools } from '../tools/BrowserTools';
import { AssertionTools } from '../tools/AssertionTools';
import { ArtifactTools } from '../tools/ArtifactTools';
import { SelfHealer } from './SelfHealer';
import { logger } from '../observability/Logger';

export enum ExecutionState {
  IDLE = 'IDLE',
  PLANNING = 'PLANNING',
  EXECUTING = 'EXECUTING',
  ASSERTING = 'ASSERTING',
  REPORTING = 'REPORTING',
}

export class ExecutionStateMachine {
  private state: ExecutionState = ExecutionState.IDLE;
  private results: StepResult[] = [];
  private browserTools = new BrowserTools();
  private assertionTools = new AssertionTools();
  private artifactTools = new ArtifactTools();
  private selfHealer = new SelfHealer();

  getState(): ExecutionState {
    return this.state;
  }

  private transition(newState: ExecutionState) {
    logger.info(`State transition: ${this.state} -> ${newState}`);
    this.state = newState;
  }

  /**
   * Executes a TestPlan against a BrowserSession
   */
  async executePlan(session: BrowserSession, plan: TestPlan): Promise<StepResult[]> {
    this.transition(ExecutionState.PLANNING);
    this.results = [];

    const executedStepIds = new Set<string>();
    const stepsToExecute = [...plan.steps];

    this.transition(ExecutionState.EXECUTING);

    while (stepsToExecute.length > 0) {
      // Find a step that has no unmet dependencies
      const readyStepIndex = stepsToExecute.findIndex(step => 
        !step.dependsOn || step.dependsOn.length === 0 || step.dependsOn.every(depId => executedStepIds.has(depId))
      );

      if (readyStepIndex === -1) {
        const remainingIds = stepsToExecute.map(s => s.id).join(', ');
        logger.error('Deadlock detected in TestPlan dependencies', { remainingSteps: remainingIds });
        throw new Error(`Deadlock detected in TestPlan dependencies or missing dependency. Remaining steps: ${remainingIds}`);
      }

      // Move step from queue to execution
      const step = stepsToExecute.splice(readyStepIndex, 1)[0];
      
      const result = await this.executeStep(session, step);
      this.results.push(result);
      executedStepIds.add(step.id);

      if (!result.success) {
        logger.warn(`Step failed: ${step.id}. Stopping execution.`, { stepId: step.id, error: result.error });
        break;
      }
    }

    this.transition(ExecutionState.REPORTING);
    return this.results;
  }

  /**
   * Executes a single TestStep
   */
  private async executeStep(session: BrowserSession, step: TestStep): Promise<StepResult> {
    logger.logStep(step.id, step.action, 'started', { description: step.description });
    
    let actionResult: ActionResult;
    const artifacts: StepArtifact[] = [];

    try {
      switch (step.action) {
        case 'navigate':
          actionResult = await this.browserTools.navigate(session, step.params.url, step.params.waitUntil);
          break;
        case 'click':
          actionResult = await this.browserTools.click(session, step.params.selector);
          break;
        case 'type':
          actionResult = await this.browserTools.type(session, step.params.selector, step.params.value);
          break;
        case 'hover':
          actionResult = await this.browserTools.hover(session, step.params.selector);
          break;
        case 'assert': {
          const prevState = this.state;
          this.state = ExecutionState.ASSERTING;
          
          if (step.params.type === 'text' || (!step.params.type && step.params.text)) {
            actionResult = await this.assertionTools.assertText(session, step.params.text, step.params.selector);
          } else if (step.params.type === 'elementState') {
            actionResult = await this.assertionTools.assertElementState(session, step.params.selector, step.params.state);
          } else {
            actionResult = { success: false, error: `Unsupported assertion params: ${JSON.stringify(step.params)}` };
          }
          
          this.state = prevState;
          break;
        }
        default:
          actionResult = { success: false, error: `Unknown action: ${step.action}` };
      }
    } catch (error: any) {
      actionResult = { success: false, error: `Execution error: ${error.message}` };
    }

    // Handle failure: Trigger SelfHealer and capture artifacts
    if (!actionResult.success) {
      logger.logStep(step.id, step.action, 'failed', { error: actionResult.error });
      await this.triggerSelfHealer(session, step, actionResult);
      
      try {
        // Always capture a screenshot on failure
        const screenshot = await session.page.screenshot();
        const screenshotArtifact = await this.artifactTools.saveArtifact(step.id, 'screenshot', screenshot);
        artifacts.push(screenshotArtifact);

        // Capture DOM tree for diagnosis
        const domResult = await this.browserTools.getDOM(session);
        if (domResult.success) {
          const domArtifact = await this.artifactTools.saveArtifact(step.id, 'dom', JSON.stringify(domResult.data, null, 2));
          artifacts.push(domArtifact);
        }

        // Capture network logs (errors)
        const networkResult = await this.browserTools.getNetworkLog(session);
        if (networkResult.success) {
          const networkArtifact = await this.artifactTools.saveArtifact(step.id, 'network', JSON.stringify(networkResult.data, null, 2));
          artifacts.push(networkArtifact);
        }
      } catch (artifactError) {
        logger.error(`Failed to capture artifacts for step ${step.id}`, { error: artifactError });
      }
    } else {
      logger.logStep(step.id, step.action, 'completed');
    }

    return {
      stepId: step.id,
      success: actionResult.success,
      actualResult: actionResult.message || actionResult.error,
      error: actionResult.error,
      artifacts,
    };
  }

  /**
   * Triggers the Self-Healing logic
   */
  private async triggerSelfHealer(session: BrowserSession, step: TestStep, error: ActionResult): Promise<boolean> {
    if (!step.params.selector) return false;

    const context: HealingContext = {
      stepId: step.id,
      action: step.action as any,
      params: step.params,
      failedSelector: step.params.selector,
      failedStrategy: 'css', // Defaulting to CSS for now
      attemptedStrategies: step.params.fallbacks || []
    };

    const healingResult = await this.selfHealer.attemptHealing(session, context);
    
    if (healingResult.success) {
      error.success = true;
      error.message = healingResult.message;
      return true;
    }

    return false;
  }
}
