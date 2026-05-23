import { SessionManager } from './session/SessionManager';
import { TestPlanner } from './orchestrator/Planner';
import { ExecutionStateMachine } from './orchestrator/StateMachine';
import { TestPlan } from './types';

async function runPhase2SmokeTest() {
  console.log('--- Starting Phase 2 Smoke Test: Orchestration & Self-Healing ---');
  
  const sessionManager = new SessionManager();
  const planner = new TestPlanner();
  const stateMachine = new ExecutionStateMachine();

  let session;
  try {
    session = await sessionManager.launchSession();
    
    // 1. Generate Plan
    const plan = await planner.generatePlan("Login to example.com and check for text");
    
    // 2. Modify plan to include a brittle step for testing Self-Healing
    // We'll add a step that tries a wrong CSS selector first, then a working XPath fallback.
    const brittleStep = {
      id: "step_brittle",
      description: "Test self-healing with a brittle selector",
      action: "click" as any,
      params: { 
        selector: "#wrong-id-button", // This will fail
        fallbacks: [
          { strategy: "xpath" as any, selector: "//h1" } // This will "heal" by clicking the H1
        ]
      },
      dependsOn: ["step_1"]
    };
    
    // Insert after navigation
    plan.steps.splice(1, 0, brittleStep);

    console.log(`Executing plan with ${plan.steps.length} steps...`);
    
    // 3. Execute Plan
    const results = await stateMachine.executePlan(session, plan);
    
    console.log('\n--- Execution Results ---');
    results.forEach(res => {
      console.log(`Step ${res.stepId}: ${res.success ? 'PASSED' : 'FAILED'}`);
      if (res.actualResult) console.log(`  Result: ${res.actualResult}`);
      if (res.artifacts.length > 0) console.log(`  Artifacts: ${res.artifacts.length} captured`);
    });

  } catch (error) {
    console.error('Smoke Test Failed:', error);
  } finally {
    if (session) {
      await sessionManager.closeSession(session.id);
    }
  }
  
  console.log('--- Phase 2 Smoke Test Completed ---');
}

runPhase2SmokeTest();
