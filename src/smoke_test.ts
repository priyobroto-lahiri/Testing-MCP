import { SessionManager } from './session/SessionManager';
import { BrowserTools } from './tools/BrowserTools';
import { AssertionTools } from './tools/AssertionTools';
import { ArtifactTools } from './tools/ArtifactTools';

async function runSmokeTest() {
  console.log('--- Starting Phase 1 Smoke Test ---');
  
  const sessionManager = new SessionManager();
  const browserTools = new BrowserTools();
  const assertionTools = new AssertionTools();
  const artifactTools = new ArtifactTools();

  let session;
  try {
    // 1. Launch Session (Mode A)
    console.log('Testing Mode A: Launching fresh browser...');
    session = await sessionManager.launchSession();
    
    // 2. Navigate
    console.log(`Navigating to example.com...`);
    await browserTools.navigate(session, 'https://example.com');
    
    // 3. Assert Text
    const assertion = await assertionTools.assertText(session, 'Example Domain');
    console.log('Assertion Result:', assertion.success ? 'PASSED' : 'FAILED', assertion.message || assertion.error);
    
    // 4. Get DOM
    console.log('Getting compressed DOM...');
    const dom = await browserTools.getDOM(session);
    console.log('DOM Tree Size:', JSON.stringify(dom.data).length, 'bytes');
    
    // 5. Save Artifact
    console.log('Capturing and saving screenshot...');
    const screenshot = await assertionTools.visualScreenshot(session);
    const screenshotPath = await artifactTools.saveScreenshot('smoke-test-step-1', screenshot);
    console.log('Screenshot saved to:', screenshotPath);

    // 6. Network Log
    const network = await browserTools.getNetworkLog(session);
    console.log('Network Logs (4xx/5xx):', network.data.length);

  } catch (error) {
    console.error('Smoke Test Failed:', error);
  } finally {
    if (session) {
      console.log('Closing session...');
      await sessionManager.closeSession(session.id);
    }
  }
  
  console.log('--- Smoke Test Completed ---');
}

runSmokeTest();
