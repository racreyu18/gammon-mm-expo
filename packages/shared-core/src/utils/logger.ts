export interface LogLevel {
  ERROR: 0;
  WARN: 1;
  INFO: 2;
  DEBUG: 3;
}

export const LOG_LEVELS: LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const;

export type LogLevelValue = LogLevel[keyof LogLevel];

export interface LogEntry {
  level: LogLevelValue;
  message: string;
  timestamp: number;
  data?: any;
  error?: Error;
}

export interface LoggerConfig {
  level: LogLevelValue;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStoredLogs: number;
  prefix?: string;
}

const DEFAULT_CONFIG: LoggerConfig = {
  level: LOG_LEVELS.INFO,
  enableConsole: true,
  enableStorage: false,
  maxStoredLogs: 1000,
  prefix: '[Gammon-MM]',
};

class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private shouldLog(level: LogLevelValue): boolean {
    return level <= this.config.level;
  }

  private formatMessage(level: LogLevelValue, message: string): string {
    const levelName = Object.keys(LOG_LEVELS)[level] || 'UNKNOWN';
    const timestamp = new Date().toISOString();
    const prefix = this.config.prefix ? `${this.config.prefix} ` : '';
    return `${prefix}[${timestamp}] ${levelName}: ${message}`;
  }

  private log(level: LogLevelValue, message: string, data?: any, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      data,
      error,
    };

    // Store log entry if enabled
    if (this.config.enableStorage) {
      this.logs.push(logEntry);
      
      // Trim logs if exceeding max
      if (this.logs.length > this.config.maxStoredLogs) {
        this.logs = this.logs.slice(-this.config.maxStoredLogs);
      }
    }

    // Console output if enabled
    if (this.config.enableConsole) {
      const formattedMessage = this.formatMessage(level, message);
      
      switch (level) {
        case LOG_LEVELS.ERROR:
          if (error) {
            console.error(formattedMessage, error, data);
          } else {
            console.error(formattedMessage, data);
          }
          break;
        case LOG_LEVELS.WARN:
          console.warn(formattedMessage, data);
          break;
        case LOG_LEVELS.INFO:
          console.info(formattedMessage, data);
          break;
        case LOG_LEVELS.DEBUG:
          console.debug(formattedMessage, data);
          break;
        default:
          console.log(formattedMessage, data);
      }
    }
  }

  error(message: string, error?: Error | any, data?: any): void {
    if (error instanceof Error) {
      this.log(LOG_LEVELS.ERROR, message, data, error);
    } else {
      this.log(LOG_LEVELS.ERROR, message, error);
    }
  }

  warn(message: string, data?: any): void {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  debug(message: string, data?: any): void {
    this.log(LOG_LEVELS.DEBUG, message, data);
  }

  // Get stored logs
  getLogs(level?: LogLevelValue): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  // Clear stored logs
  clearLogs(): void {
    this.logs = [];
  }

  // Update configuration
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get current configuration
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  // Export logs as JSON string
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create default logger instance
export const logger = new Logger();

// Export Logger class for custom instances
export { Logger };

// Utility functions
export function createLogger(config: Partial<LoggerConfig> = {}): Logger {
  return new Logger(config);
}

export function setLogLevel(level: LogLevelValue): void {
  logger.updateConfig({ level });
}

export function enableConsoleLogging(enabled: boolean): void {
  logger.updateConfig({ enableConsole: enabled });
}

export function enableStorageLogging(enabled: boolean): void {
  logger.updateConfig({ enableStorage: enabled });
}