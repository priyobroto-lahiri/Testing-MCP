import { LogEntry } from '../types';

/**
 * StructuredLogger provides structured JSON logging for auditability and observability.
 * It includes a hook for future OpenTelemetry integration.
 */
export class StructuredLogger {
  private static instance: StructuredLogger;

  private constructor() {}

  /**
   * Get the singleton instance of StructuredLogger
   */
  public static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }

  /**
   * Internal log method to format and output the log entry
   */
  private log(level: LogEntry['level'], message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    // Output to stdout as a JSON string
    console.log(JSON.stringify(entry));

    // Hook for OpenTelemetry or other external observability platforms
    this.exportToOTel(entry);
  }

  /**
   * Log an info level message
   */
  public info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  /**
   * Log a warning level message
   */
  public warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  /**
   * Log an error level message
   */
  public error(message: string, context?: Record<string, any>) {
    this.log('error', message, context);
  }

  /**
   * Log a debug level message
   */
  public debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  /**
   * Specialized helper for logging execution steps in the state machine
   */
  public logStep(stepId: string, action: string, status: 'started' | 'completed' | 'failed' | 'retrying', context?: any) {
    this.info(`Step ${status}: ${action}`, {
      stepId,
      action,
      status,
      ...(typeof context === 'object' ? context : { detail: context }),
    });
  }

  /**
   * Placeholder/hook for exporting log entries to OpenTelemetry
   */
  private exportToOTel(entry: LogEntry) {
    // TODO: Integrate with OpenTelemetry SDK
    // Example: 
    // const span = trace.getSpan(context.active());
    // if (span) {
    //   span.addEvent(entry.message, {
    //     'log.level': entry.level,
    //     ...entry.context
    //   });
    // }
  }
}

// Export a default logger instance
export const logger = StructuredLogger.getInstance();
