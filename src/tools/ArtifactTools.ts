import * as fs from 'fs';
import * as path from 'path';
import { StepArtifact } from '../types';

export class ArtifactTools {
  private artifactsDir: string;

  constructor() {
    this.artifactsDir = path.resolve(process.cwd(), 'artifacts');
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true });
    }
  }

  /**
   * Saves a screenshot locally and returns the relative path.
   */
  async saveScreenshot(stepId: string, content: Buffer): Promise<string> {
    const fileName = `screenshot_${stepId}_${Date.now()}.png`;
    const filePath = path.join(this.artifactsDir, fileName);
    
    await fs.promises.writeFile(filePath, content);
    return fileName; // Return just the name for the static file server
  }

  /**
   * Saves a DOM snapshot locally.
   */
  async saveDomSnapshot(stepId: string, content: string): Promise<string> {
    const fileName = `dom_${stepId}_${Date.now()}.json`;
    const filePath = path.join(this.artifactsDir, fileName);
    
    await fs.promises.writeFile(filePath, content);
    return fileName;
  }

  /**
   * Appends execution data to the local JSON log.
   */
  async logExecutionStep(data: any): Promise<void> {
    const logPath = path.resolve(process.cwd(), 'execution_log.json');
    let logs = [];
    
    if (fs.existsSync(logPath)) {
      const content = await fs.promises.readFile(logPath, 'utf8');
      logs = JSON.parse(content || '[]');
    }
    
    logs.push({
      ...data,
      timestamp: new Date().toISOString()
    });
    
    await fs.promises.writeFile(logPath, JSON.stringify(logs, null, 2));
  }
}
