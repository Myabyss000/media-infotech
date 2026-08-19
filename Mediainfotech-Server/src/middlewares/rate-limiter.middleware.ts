import rateLimit from 'express-rate-limit';

/**
 * Global API Rate Limiter
 * Allows up to 500 requests per 5 minutes per IP.
 */
export const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP. Please try again after 5 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Strict Auth Rate Limiter
 * Protects login, password reset, and credential endpoints from brute-force attacks.
 * Allows up to 20 attempts per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * File Upload Rate Limiter
 * Prevents file spamming and DOS attacks on storage disks.
 * Allows up to 60 file uploads per 10 minutes per IP.
 */
export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Upload limit reached. Please wait before uploading more files.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
  },
});
