/**
 * Secure Logging Utilities
 * 
 * Prevents token leakage in logs by sanitizing sensitive data.
 * All provider binding operations should use these logging functions.
 */

/**
 * Sensitive field names that should be redacted
 */
const SENSITIVE_FIELDS = [
  'access_token',
  'accessToken',
  'refresh_token',
  'refreshToken',
  'access_token_encrypted',
  'refresh_token_encrypted',
  'password',
  'secret',
  'api_key',
  'apiKey',
  'code_verifier',
  'codeVerifier',
];

/**
 * Redact sensitive values in an object
 * 
 * @param obj - Object to sanitize
 * @returns Sanitized copy of object
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Check if field name is sensitive (exact match, case-insensitive)
    const keyLower = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(
      field => keyLower === field.toLowerCase()
    );
    
    if (isSensitive) {
      // Redact sensitive fields
      if (typeof value === 'string' && value.length > 0) {
        // Show first 4 chars for debugging
        const prefix = value.length >= 4 ? value.substring(0, 4) : value.substring(0, 1);
        sanitized[key] = `${prefix}...[REDACTED]`;
      } else {
        sanitized[key] = '[REDACTED]';
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Log a message with automatic sanitization
 * 
 * @param level - Log level
 * @param message - Log message
 * @param data - Additional data (will be sanitized)
 */
export function log(
  level: LogLevel,
  message: string,
  data?: any
): void {
  const timestamp = new Date().toISOString();
  const sanitizedData = data ? sanitizeObject(data) : undefined;
  
  const logEntry = {
    timestamp,
    level,
    message,
    ...(sanitizedData && { data: sanitizedData }),
  };
  
  // In production, send to logging service
  // For now, use console
  switch (level) {
    case LogLevel.DEBUG:
      // Always log debug in tests, only in development otherwise
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        console.debug(JSON.stringify(logEntry));
      }
      break;
    case LogLevel.INFO:
      console.info(JSON.stringify(logEntry));
      break;
    case LogLevel.WARN:
      console.warn(JSON.stringify(logEntry));
      break;
    case LogLevel.ERROR:
      console.error(JSON.stringify(logEntry));
      break;
  }
}

/**
 * Log debug message (only in development)
 */
export function logDebug(message: string, data?: any): void {
  log(LogLevel.DEBUG, message, data);
}

/**
 * Log info message
 */
export function logInfo(message: string, data?: any): void {
  log(LogLevel.INFO, message, data);
}

/**
 * Log warning message
 */
export function logWarn(message: string, data?: any): void {
  log(LogLevel.WARN, message, data);
}

/**
 * Log error message
 */
export function logError(message: string, error?: any, data?: any): void {
  const errorData = {
    ...(error && {
      error: {
        message: error.message,
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    }),
    ...data,
  };
  
  log(LogLevel.ERROR, message, errorData);
}

/**
 * Create a logger for a specific module
 * 
 * @param moduleName - Name of the module
 * @returns Logger functions with module prefix
 */
export function createLogger(moduleName: string) {
  return {
    debug: (message: string, data?: any) => 
      logDebug(`[${moduleName}] ${message}`, data),
    info: (message: string, data?: any) => 
      logInfo(`[${moduleName}] ${message}`, data),
    warn: (message: string, data?: any) => 
      logWarn(`[${moduleName}] ${message}`, data),
    error: (message: string, error?: any, data?: any) => 
      logError(`[${moduleName}] ${message}`, error, data),
  };
}

/**
 * Example usage:
 * 
 * const logger = createLogger('ProviderBinding');
 * 
 * logger.info('Starting OAuth flow', { provider: 'openai' });
 * // Logs: {"timestamp":"...","level":"INFO","message":"[ProviderBinding] Starting OAuth flow","data":{"provider":"openai"}}
 * 
 * logger.error('Token refresh failed', error, { connectionId: 'abc123' });
 * // Logs error without exposing tokens
 * 
 * // Tokens are automatically redacted:
 * logger.debug('Token response', { access_token: 'secret123', expires_in: 3600 });
 * // Logs: {"data":{"access_token":"secr...[REDACTED]","expires_in":3600}}
 */
