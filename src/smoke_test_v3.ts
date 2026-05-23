import { SessionManager } from './session/SessionManager';
import { TestPlanner } from './orchestrator/Planner';
import { ExecutionStateMachine } from './orchestrator/StateMachine';
import { ReportGenerator } from './orchestrator/Reporter';
import { SecretManager } from './security/SecretManager';
import { logger } from './observability/Logger';
import * as fs from 'fs';
import * as path from 'path';

async function runPhase3SmokeTest() {
  logger.info('--- Starting Phase 3 Smoke Test: DX, Security & Observability ---');
  
  const sessionManager = new SessionManager();
  const planner = new TestPlanner();
  const stateMachine = new ExecutionStateMachine();
  const reportGenerator = new ReportGenerator();
  const secretManager = new SecretManager();

  let session;
  const startTime = new Date();

  try {
    // 1. Test Secret Management
    const fakeSecret = await secretManager.getSecret('NON_EXISTENT_KEY');
    logger.debug('Secret lookup test', { key: 'NON_EXISTENT_KEY', found: !!fakeSecret });
    
    // 2. Launch Session
    session = await sessionManager.launchSession();
    
    // 3. Generate Plan
    const plan = await planner.generatePlan("Smoke test for reporting");
    
    // 4. Execute Plan
    const results = await stateMachine.executePlan(session, plan);
    
    // 5. Generate Reports
    const report = reportGenerator.generateReport(plan, startTime, results);
    const markdown = reportGenerator.toMarkdown(report);
    const junit = reportGenerator.toJUnit(report);
    
    // Save reports to artifacts
    const artifactsDir = path.resolve(process.cwd(), './artifacts');
    if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir);
    
    fs.writeFileSync(path.join(artifactsDir, 'report.md'), markdown);
    fs.writeFileSync(path.join(artifactsDir, 'junit.xml'), junit);
    
    logger.info('Reports generated and saved to ./artifacts', {
      markdownPath: './artifacts/report.md',
      junitPath: './artifacts/junit.xml',
      passed: report.passedSteps,
      failed: report.failedSteps
    });

  } catch (error: any) {
    logger.error('Phase 3 Smoke Test Failed', { error: error.message });
  } finally {
    if (session) {
      await sessionManager.closeSession(session.id);
    }
  }
  
  logger.info('--- Phase 3 Smoke Test Completed ---');
}

runPhase3SmokeTest();
