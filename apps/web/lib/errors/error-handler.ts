/**
 * Unified Error Handling System
 * 
 * Provides centralized error handling with error codes, messages, and logging.
 * Ensures sensitive information is not logged.
 * 
 * Requirements: 1.8, 2.5, 14.9
 */

import { createLogger } from '@/lib/provider-binding/logger';

const logger = createLogger('ErrorHandler');

// Error codes for different error types
export enum ErrorCode {
  // Authentication errors (1xxx)
  AUTH_FAILED = 'AUTH_1001',
  AUTH_SESSION_EXPIRED = 'AUTH_1002',
  AUTH_INVALID_CREDENTIALS = 'AUTH_1003',
  AUTH_PROVIDER_ERROR = 'AUTH_1004',
  
  // Provider binding errors (2xxx)
  PROVIDER_OAUTH_FAILED = 'PROVIDER_2001',
  PROVIDER_TOKEN_EXPIRED = 'PROVIDER_2002',
  PROVIDER_TOKEN_REFRESH_FAILED = 'PROVIDER_2003',
  PROVIDER_CONNECTION_NOT_FOUND = 'PROVIDER_2004',
  PROVIDER_API_ERROR = 'PROVIDER_2005',
  
  // Room errors (3xxx)
  ROOM_NOT_FOUND = 'ROOM_3001',
  ROOM_ACCESS_DENIED = 'ROOM_3002',
  ROOM_CREATION_FAILED = 'ROOM_3003',
  ROOM_JOIN_FAILED = 'ROOM_3004',
  ROOM_INVALID_PASSWORD = 'ROOM_3005',
  
  // Message errors (4xxx)
  MESSAGE_SEND_FAILED = 'MESSAGE_4001',
  MESSAGE_DELETE_FAILED = 'MESSAGE_4002',
  MESSAGE_NOT_FOUND = 'MESSAGE_4003',
  
  // Companion errors (5xxx)
  COMPANION_NOT_FOUND = 'COMPANION_5001',
  COMPANION_SUMMON_FAILED = 'COMPANION_5002',
  COMPANION_REQUEST_FAILED = 'COMPANION_5003',
  COMPANION_APPROVAL_FAILED = 'COMPANION_5004',
  COMPANION_EXECUTION_FAILED = 'COMPANION_5005',
  COMPANION_API_ERROR = 'COMPANION_5006',
  
  // Network errors (6xxx)
  NETWORK_ERROR = 'NETWORK_6001',
  NETWORK_TIMEOUT = 'NETWORK_6002',
  REALTIME_CONNECTION_FAILED = 'NETWORK_6003',
  
  // Validation errors (7xxx)
  VALIDATION_ERROR = 'VALIDATION_7001',
  INVALID_INPUT = 'VALIDATION_7002',
  
  // Generic errors (9xxx)
  UNKNOWN_ERROR = 'ERROR_9999',
}

// Error messages mapping
const errorMessages: Record<ErrorCode, string> = {
  // Authentication
  [ErrorCode.AUTH_FAILED]: '登录失败，请重试',
  [ErrorCode.AUTH_SESSION_EXPIRED]: '会话已过期，请重新登录',
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: '用户名或密码错误',
  [ErrorCode.AUTH_PROVIDER_ERROR]: '第三方登录失败，请稍后重试',
  
  // Provider binding
  [ErrorCode.PROVIDER_OAUTH_FAILED]: 'OAuth 授权失败，请重试',
  [ErrorCode.PROVIDER_TOKEN_EXPIRED]: 'Token 已过期，正在刷新...',
  [ErrorCode.PROVIDER_TOKEN_REFRESH_FAILED]: 'Token 刷新失败，请重新授权',
  [ErrorCode.PROVIDER_CONNECTION_NOT_FOUND]: '未找到 Provider 连接',
  [ErrorCode.PROVIDER_API_ERROR]: 'AI 服务调用失败',
  
  // Room
  [ErrorCode.ROOM_NOT_FOUND]: 'Room 不存在',
  [ErrorCode.ROOM_ACCESS_DENIED]: '无权访问此 Room',
  [ErrorCode.ROOM_CREATION_FAILED]: 'Room 创建失败',
  [ErrorCode.ROOM_JOIN_FAILED]: '加入 Room 失败',
  [ErrorCode.ROOM_INVALID_PASSWORD]: '密码错误',
  
  // Message
  [ErrorCode.MESSAGE_SEND_FAILED]: '消息发送失败',
  [ErrorCode.MESSAGE_DELETE_FAILED]: '消息删除失败',
  [ErrorCode.MESSAGE_NOT_FOUND]: '消息不存在',
  
  // Companion
  [ErrorCode.COMPANION_NOT_FOUND]: 'Companion 不存在',
  [ErrorCode.COMPANION_SUMMON_FAILED]: 'Companion 召唤失败',
  [ErrorCode.COMPANION_REQUEST_FAILED]: 'Companion 请求失败',
  [ErrorCode.COMPANION_APPROVAL_FAILED]: 'Companion 批准失败',
  [ErrorCode.COMPANION_EXECUTION_FAILED]: 'Companion 执行失败',
  [ErrorCode.COMPANION_API_ERROR]: 'Companion API 调用失败',
  
  // Network
  [ErrorCode.NETWORK_ERROR]: '网络连接失败',
  [ErrorCode.NETWORK_TIMEOUT]: '请求超时',
  [ErrorCode.REALTIME_CONNECTION_FAILED]: '实时连接失败',
  
  // Validation
  [ErrorCode.VALIDATION_ERROR]: '输入验证失败',
  [ErrorCode.INVALID_INPUT]: '输入格式不正确',
  
  // Generic
  [ErrorCode.UNKNOWN_ERROR]: '发生未知错误',
};

export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details?: string;
  timestamp: string;
  retryable?: boolean;
  action?: string;
}

export class AppError extends Error {
  code: ErrorCode;
  details?: string;
  retryable: boolean;
  action?: string;

  constructor(
    code: ErrorCode,
    details?: string,
    retryable: boolean = false,
    action?: string
  ) {
    super(errorMessages[code]);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
    this.action = action;
  }

  toResponse(): ErrorResponse {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: new Date().toISOString(),
      retryable: this.retryable,
      action: this.action,
    };
  }
}

/**
 * Handle errors and convert to ErrorResponse
 * Sanitizes sensitive information before logging
 */
export function handleError(error: unknown): ErrorResponse {
  if (error instanceof AppError) {
    // Log error without sensitive details
    logger.error('Application error', {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      // Do NOT log details if they might contain sensitive info
    });
    
    return error.toResponse();
  }

  // Handle network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    logger.error('Network error', { message: error.message });
    return new AppError(
      ErrorCode.NETWORK_ERROR,
      undefined,
      true,
      '请检查网络连接后重试'
    ).toResponse();
  }

  // Handle unknown errors
  logger.error('Unknown error', {
    message: error instanceof Error ? error.message : 'Unknown',
    type: typeof error,
  });

  return new AppError(
    ErrorCode.UNKNOWN_ERROR,
    undefined,
    false,
    '请刷新页面或联系支持'
  ).toResponse();
}

/**
 * Create error from HTTP response
 */
export async function createErrorFromResponse(response: Response): Promise<AppError> {
  let errorData: any;
  
  try {
    errorData = await response.json();
  } catch {
    errorData = { message: response.statusText };
  }

  // Map HTTP status codes to error codes
  let code: ErrorCode;
  let retryable = false;

  switch (response.status) {
    case 401:
      code = ErrorCode.AUTH_SESSION_EXPIRED;
      break;
    case 403:
      code = ErrorCode.ROOM_ACCESS_DENIED;
      break;
    case 404:
      code = ErrorCode.ROOM_NOT_FOUND;
      break;
    case 408:
    case 504:
      code = ErrorCode.NETWORK_TIMEOUT;
      retryable = true;
      break;
    case 500:
    case 502:
    case 503:
      code = ErrorCode.UNKNOWN_ERROR;
      retryable = true;
      break;
    default:
      code = ErrorCode.UNKNOWN_ERROR;
  }

  return new AppError(code, errorData.message, retryable);
}
