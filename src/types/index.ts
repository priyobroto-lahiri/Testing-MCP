import { Browser, BrowserContext, Page } from 'playwright';

export interface BrowserSession {
  id: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  mode: 'LAUNCH' | 'ATTACH';
  cdpUrl?: string;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export interface SelectorStrategy {
  strategy: 'css' | 'xpath' | 'aria' | 'text';
  selector: string;
}

export interface StepArtifact {
  stepId: string;
  timestamp: string;
  type: 'screenshot' | 'dom' | 'network';
  path: string;
}

export interface TestStep {
  id: string;
  description: string;
  action: 'navigate' | 'click' | 'type' | 'hover' | 'assert';
  params: Record<string, any>;
  expectedResult?: string;
  dependsOn?: string[]; // IDs of steps that must complete first
}

export interface TestPlan {
  id: string;
  goal: string;
  steps: TestStep[];
}

export interface StepResult {
  stepId: string;
  success: boolean;
  actualResult?: string;
  error?: string;
  artifacts: StepArtifact[];
  healingAttempted?: boolean;
}

export interface HealingContext {
  stepId: string;
  action: 'click' | 'type' | 'hover' | 'navigate' | 'assert';
  params: Record<string, any>;
  failedSelector: string;
  failedStrategy: string;
  attemptedStrategies: SelectorStrategy[];
}

export interface TestReport {
  planId: string;
  goal: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  results: StepResult[];
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, any>;
}

export interface SecretStore {
  getSecret(key: string): Promise<string | undefined>;
}
