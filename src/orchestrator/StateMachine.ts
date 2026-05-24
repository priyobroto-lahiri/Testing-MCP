import { BrowserSession, TestPlan, TestStep, StepResult, StepArtifact, ActionResult, HealingContext, SelectorStrategy } from '../types';
import { BrowserTools } from '../tools/BrowserTools';
import { AssertionTools } from '../tools/AssertionTools';
import { ArtifactTools } from '../tools/ArtifactTools';
import { SelfHealer } from './SelfHealer';
import { logger } from '../observability/Logger';
import * as axios from 'axios';

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
  private currentSessionId?: string;

  getState(): ExecutionState {
    return this.state;
  }

  private transition(newState: ExecutionState) {
    logger.info(`State transition: ${this.state} -> ${newState}`);
    this.state = newState;
    this.notifyDashboard({ type: 'STATE_TRANSITION', payload: { from: this.state, to: newState } });
  }

  private async notifyDashboard(event: any) {
    try {
      await axios.default.post('http://localhost:3001/api/event', event);
    } catch (err) {
      // Ignore if dashboard backend is not running
    }
  }

  /**
   * Executes a TestPlan against a BrowserSession
   */
  async executePlan(session: BrowserSession, plan: TestPlan): Promise<StepResult[]> {
    this.transition(ExecutionState.PLANNING);
    this.results = [];
    this.currentSessionId = `session_${Date.now()}`;

    this.notifyDashboard({ type: 'SESSION_STARTED', payload: { sessionId: this.currentSessionId, goal: plan.goal, timestamp: new Date().toISOString() } });

    const executedStepIds = new Set<string>();
    const stepsToExecute = [...plan.steps];

    this.transition(ExecutionState.EXECUTING);

    while (stepsToExecute.length > 0) {
      const readyStepIndex = stepsToExecute.findIndex(step => 
        !step.dependsOn || step.dependsOn.length === 0 || step.dependsOn.every(depId => executedStepIds.has(depId))
      );

      if (readyStepIndex === -1) {
        logger.error('Deadlock detected in TestPlan dependencies');
        throw new Error('Deadlock detected in TestPlan dependencies');
      }

      const step = stepsToExecute.splice(readyStepIndex, 1)[0];
      const result = await this.executeStep(session, step);
      this.results.push(result);
      executedStepIds.add(step.id);

      if (!result.success) break;
    }

    this.notifyDashboard({ type: 'SESSION_COMPLETED', payload: { sessionId: this.currentSessionId, success: this.results.every(r => r.success), timestamp: new Date().toISOString() } });
    this.transition(ExecutionState.REPORTING);
    return this.results;
  }

  /**
   * Executes a single TestStep
   */
  private async executeStep(session: BrowserSession, step: TestStep): Promise<StepResult> {
    logger.logStep(step.id, step.action, 'started', { description: step.description });
    this.notifyDashboard({ type: 'STEP_STARTED', payload: { stepId: step.id, action: step.action, description: step.description, sessionId: this.currentSessionId, timestamp: new Date().toISOString() } });

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
          actionResult = await this.assertionTools.assertText(session, step.params.text, step.params.selector);
          this.state = prevState;
          break;
        }
        default:
          actionResult = { success: false, error: `Unknown action: ${step.action}` };
      }
    } catch (error: any) {
      actionResult = { success: false, error: error.message };
    }

    if (!actionResult.success) {
      await this.triggerSelfHealer(session, step, actionResult);
    }

    // Capture artifacts locally
    let screenshotName: string | undefined;
    try {
      const screenshot = await session.page.screenshot();
      screenshotName = await this.artifactTools.saveScreenshot(step.id, screenshot);
      artifacts.push({ stepId: step.id, timestamp: new Date().toISOString(), type: 'screenshot', path: screenshotName });
    } catch (err) {
      logger.error('Failed to capture local screenshot', { error: err });
    }

    const stepData = {
      sessionId: this.currentSessionId,
      stepId: step.id,
      action: step.action,
      status: actionResult.success ? 'COMPLETED' : 'FAILED',
      screenshot: screenshotName,
      error: actionResult.error,
      timestamp: new Date().toISOString()
    };

    // Log to local JSON
    await this.artifactTools.logExecutionStep(stepData);

    this.notifyDashboard({ type: 'STEP_COMPLETED', payload: stepData });

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
