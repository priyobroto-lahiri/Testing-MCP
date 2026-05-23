#!/usr/bin/env ts-node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { SessionManager } from '../session/SessionManager';
import { TestPlanner } from '../orchestrator/Planner';
import { ExecutionStateMachine } from '../orchestrator/StateMachine';
import { ReportGenerator } from '../orchestrator/Reporter';

const program = new Command();

// Suppress internal component logs during CLI execution for a "polished" look
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
const originalDebug = console.debug;

const isInternalLog = (args: any[]) => {
  const firstArg = args[0];
  if (typeof firstArg === 'string') {
    return (
      firstArg.startsWith('{"timestamp":') ||
      firstArg.startsWith('[SessionManager]') ||
      firstArg.startsWith('[SelfHealer]') ||
      firstArg.startsWith('[ArtifactTools]') ||
      firstArg.startsWith('Generating plan for:') ||
      firstArg.startsWith('OPENAI_API_KEY not found') ||
      firstArg.startsWith('SecretManager:')
    );
  }
  return false;
};

console.log = (...args: any[]) => {
  if (!isInternalLog(args)) originalLog(...args);
};
console.warn = (...args: any[]) => {
  if (!isInternalLog(args)) originalWarn(...args);
};
console.error = (...args: any[]) => {
  if (!isInternalLog(args)) originalError(...args);
};
console.debug = (...args: any[]) => {
  if (!isInternalLog(args)) originalDebug(...args);
};

program
  .name('testing-mcp')
  .description('AI-Driven Manual Test Execution CLI')
  .version('1.0.0');

program
  .command('run')
  .description('Run a test from a description')
  .argument('<description>', 'Natural language description of the test')
  .action(async (description: string) => {
    const sessionManager = new SessionManager();
    const planner = new TestPlanner();
    const stateMachine = new ExecutionStateMachine();
    const reportGenerator = new ReportGenerator();

    const startTime = new Date();
    let session;

    try {
      console.log(chalk.blue.bold('\n🚀 Starting Test Execution\n'));
      console.log(`${chalk.cyan('Description:')} ${description}`);

      // 1. Launch Browser
      const sessionSpinner = ora('Launching browser...').start();
      try {
        session = await sessionManager.launchSession();
        sessionSpinner.succeed(chalk.green('Browser launched successfully.'));
      } catch (err: any) {
        sessionSpinner.fail(chalk.red(`Failed to launch browser: ${err.message}`));
        throw err;
      }

      // 2. Planning
      const planSpinner = ora('Generating test plan...').start();
      let plan;
      try {
        plan = await planner.generatePlan(description);
        planSpinner.succeed(chalk.green('Test plan generated.'));
        console.log(chalk.dim(`Goal: ${plan.goal}`));
      } catch (err: any) {
        planSpinner.fail(chalk.red(`Failed to generate plan: ${err.message}`));
        throw err;
      }

      // 3. Execution
      const executionSpinner = ora('Executing test steps...').start();
      let results;
      try {
        results = await stateMachine.executePlan(session, plan);
        
        const failed = results.some(r => !r.success);
        if (failed) {
          executionSpinner.fail(chalk.red('Test execution failed.'));
        } else {
          executionSpinner.succeed(chalk.green('Test execution completed.'));
        }

        // 4. Reporting
        const report = reportGenerator.generateReport(plan, startTime, results);
        const markdownReport = reportGenerator.toMarkdown(report);

        // Save Report
        const artifactsDir = path.resolve(process.cwd(), 'artifacts');
        if (!fs.existsSync(artifactsDir)) {
          fs.mkdirSync(artifactsDir, { recursive: true });
        }
        const reportPath = path.join(artifactsDir, 'report.md');
        fs.writeFileSync(reportPath, markdownReport, 'utf8');

        // Output Summary
        console.log(chalk.blue.bold('\n📊 Execution Summary\n'));
        console.log(`${chalk.white('Status:')} ${failed ? chalk.red('FAILED') : chalk.green('PASSED')}`);
        console.log(`${chalk.white('Total Steps:')} ${report.totalSteps}`);
        console.log(`${chalk.white('Passed:')} ${chalk.green(report.passedSteps)}`);
        console.log(`${chalk.white('Failed:')} ${chalk.red(report.failedSteps)}`);
        console.log(`${chalk.white('Duration:')} ${(report.durationMs / 1000).toFixed(2)}s`);
        console.log(`\n${chalk.cyan('Report saved to:')} ${reportPath}`);
      } catch (err: any) {
        executionSpinner.fail(chalk.red(`Execution error: ${err.message}`));
        throw err;
      }

    } catch (error: any) {
      // Top level errors already handled by specific blocks or caught here
      if (!error.message.includes('spinner')) {
         console.error(chalk.red(`\n❌ Error: ${error.message}`));
      }
    } finally {
      if (session) {
        await sessionManager.closeSession(session.id);
      }
      process.exit();
    }
  });

program.parse(process.argv);
