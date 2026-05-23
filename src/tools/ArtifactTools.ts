import * as fs from 'fs';
import * as path from 'path';
import { StepArtifact } from '../types';

export class ArtifactTools {
  private baseDir: string;

  constructor(baseDir: string = './artifacts') {
    // Determine the root of the project to ensure artifacts are saved correctly
    this.baseDir = path.resolve(process.cwd(), baseDir);
    this.ensureDir();
  }

  /**
   * Ensures the artifacts directory exists
   */
  private ensureDir() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Saves an artifact to the local filesystem
   * @param stepId The ID of the step generating this artifact
   * @param type The type of artifact ('screenshot', 'dom', 'network')
   * @param content The content to save (Buffer for binary, string for text)
   * @returns A StepArtifact object with metadata and path
   */
  async saveArtifact(
    stepId: string,
    type: StepArtifact['type'],
    content: Buffer | string
  ): Promise<StepArtifact> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = this.getExtension(type);
    const fileName = `${stepId}_${timestamp}.${extension}`;
    const filePath = path.join(this.baseDir, fileName);

    if (Buffer.isBuffer(content)) {
      await fs.promises.writeFile(filePath, content);
    } else {
      await fs.promises.writeFile(filePath, content, 'utf8');
    }

    // Return relative path or absolute path? 
    // Usually absolute is safer for internal use, but relative might be better for reports.
    // Given the prompt says "local ./artifacts directory", let's return the absolute path for now.
    return {
      stepId,
      timestamp: new Date().toISOString(),
      type,
      path: filePath
    };
  }

  private getExtension(type: StepArtifact['type']): string {
    switch (type) {
      case 'screenshot': return 'png';
      case 'dom': return 'html';
      case 'network': return 'json';
      default: return 'txt';
    }
  }

  /**
   * Lists all artifacts in the directory
   */
  async listArtifacts(): Promise<string[]> {
    if (!fs.existsSync(this.baseDir)) return [];
    return fs.promises.readdir(this.baseDir);
  }

  /**
   * Deletes all artifacts
   */
  async clearArtifacts(): Promise<void> {
    if (fs.existsSync(this.baseDir)) {
      const files = await fs.promises.readdir(this.baseDir);
      for (const file of files) {
        await fs.promises.unlink(path.join(this.baseDir, file));
      }
    }
  }
}
