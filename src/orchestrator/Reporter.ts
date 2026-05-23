import { TestPlan, StepResult, TestReport, StepArtifact } from '../types';

export class ReportGenerator {
  /**
   * Synthesizes a TestReport from a TestPlan and StepResults.
   */
  public generateReport(plan: TestPlan, startTime: Date, results: StepResult[]): TestReport {
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    
    const totalSteps = plan.steps.length;
    const passedSteps = results.filter(r => r.success).length;
    const failedSteps = results.filter(r => !r.success).length;

    return {
      planId: plan.id,
      goal: plan.goal,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs,
      totalSteps,
      passedSteps,
      failedSteps,
      results
    };
  }

  /**
   * Converts a TestReport to a Markdown summary.
   */
  public toMarkdown(report: TestReport): string {
    const status = report.failedSteps === 0 ? '✅ PASSED' : '❌ FAILED';
    
    let md = `# Test Execution Report: ${report.planId}\n\n`;
    md += `## Status: ${status}\n\n`;
    md += `### Summary\n`;
    md += `- **Goal:** ${report.goal}\n`;
    md += `- **Start Time:** ${report.startTime}\n`;
    md += `- **End Time:** ${report.endTime}\n`;
    md += `- **Duration:** ${(report.durationMs / 1000).toFixed(2)}s\n`;
    md += `- **Total Steps:** ${report.totalSteps}\n`;
    md += `- **Passed:** ${report.passedSteps}\n`;
    md += `- **Failed:** ${report.failedSteps}\n\n`;

    md += `### Step Details\n\n`;
    md += `| Step ID | Status | Message / Error | Artifacts |\n`;
    md += `|---------|--------|-----------------|-----------|\n`;

    for (const result of report.results) {
      const stepStatus = result.success ? '✅' : '❌';
      const message = result.success 
        ? (result.actualResult || 'Success') 
        : `Error: ${result.error || 'Unknown error'}`;
      
      const artifacts = result.artifacts.map(a => `[${a.type}](${a.path})`).join(', ') || '-';
      
      md += `| ${result.stepId} | ${stepStatus} | ${message.replace(/\|/g, '\\|')} | ${artifacts} |\n`;
    }

    return md;
  }

  /**
   * Converts a TestReport to a CI-compatible JUnit XML string.
   */
  public toJUnit(report: TestReport): string {
    const durationSec = (report.durationMs / 1000).toFixed(3);
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<testsuites>\n`;
    xml += `  <testsuite name="${this.escapeXml(report.planId)}" tests="${report.totalSteps}" failures="${report.failedSteps}" errors="0" time="${durationSec}" timestamp="${report.startTime}">\n`;

    for (const result of report.results) {
      const name = this.escapeXml(result.stepId);
      xml += `    <testcase name="${name}" classname="${this.escapeXml(report.planId)}" time="0">\n`;
      
      if (!result.success) {
        const message = this.escapeXml(result.error || 'Unknown error');
        xml += `      <failure message="${message}">${message}</failure>\n`;
      }

      if (result.artifacts.length > 0) {
        xml += `      <system-out>\n`;
        xml += `Artifacts:\n`;
        for (const artifact of result.artifacts) {
          xml += `${artifact.type}: ${artifact.path}\n`;
        }
        xml += `      </system-out>\n`;
      }

      xml += `    </testcase>\n`;
    }

    xml += `  </testsuite>\n`;
    xml += `</testsuites>`;

    return xml;
  }

  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&"']/g, (m) => {
      switch (m) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '"': return '&quot;';
        case "'": return '&apos;';
        default: return m;
      }
    });
  }
}
