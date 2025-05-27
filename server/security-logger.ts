// Advanced Security Logger & Request Filter
import { Request, Response, NextFunction } from 'express';

export class SecurityLogger {
  private sensitivePatterns = [
    // API Keys & Tokens
    /api[_-]?key[s]?[\s=:]+[a-zA-Z0-9_-]{10,}/gi,
    /token[\s=:]+[a-zA-Z0-9_.-]{10,}/gi,
    /secret[\s=:]+[a-zA-Z0-9_.-]{10,}/gi,
    /password[\s=:]+.{3,}/gi,
    
    // Database & Connection Strings
    /DATABASE_URL[\s=:]+.+/gi,
    /postgres:\/\/.+/gi,
    /mysql:\/\/.+/gi,
    /mongodb:\/\/.+/gi,
    
    // Payment & Financial
    /sk_[a-zA-Z0-9_-]+/gi, // Stripe secret keys
    /pk_[a-zA-Z0-9_-]+/gi, // Stripe public keys
    /midtrans[\s=:]+.+/gi,
    /snap[_-]?token[\s=:]+.+/gi,
    
    // User Credentials
    /email[\s=:]+[^\s]+@[^\s]+/gi,
    /phone[\s=:]+[\d\+\-\s]{8,}/gi,
    
    // Internal IDs that shouldn't be exposed
    /bot[_-]?token[\s=:]+[0-9]{8,}:[a-zA-Z0-9_-]{30,}/gi,
    /telegram[_-]?token[\s=:]+[0-9]{8,}:[a-zA-Z0-9_-]{30,}/gi,
  ];

  private suspiciousPatterns = [
    // SQL Injection attempts
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b)[\s\S]*(\bFROM\b|\bWHERE\b|\bINTO\b)/gi,
    
    // XSS attempts
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    
    // Path traversal
    /\.\.\/|\.\.\\|\.\.\%2f|\.\.\%5c/gi,
    
    // Command injection
    /[;&|`$]/g,
    
    // Common attack patterns
    /eval\s*\(/gi,
    /exec\s*\(/gi,
    /system\s*\(/gi,
  ];

  private blockedUserAgents = [
    /nikto/i,
    /sqlmap/i,
    /nmap/i,
    /masscan/i,
    /zap/i,
    /burp/i,
    /crawl/i,
    /spider/i,
    /bot/i, // Generic bot blocker (you can customize this)
  ];

  /**
   * Sanitize sensitive data from logs
   */
  sanitizeForLog(data: any): string {
    let sanitized = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Replace sensitive patterns with masked values
    this.sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    // Mask partial credit cards, phone numbers, etc.
    sanitized = sanitized.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '****-****-****-****');
    sanitized = sanitized.replace(/\b\d{3}-?\d{3}-?\d{4}\b/g, 'XXX-XXX-XXXX');
    
    return sanitized;
  }

  // Whitelist of safe API endpoints
  private safeEndpoints = [
    /^\/api\/user/,
    /^\/api\/smm\/orders/,
    /^\/api\/smm\/services/,
    /^\/api\/smm\/providers/,
    /^\/api\/telegram\/bots/,
    /^\/api\/upgrade/,
    /^\/api\/payment/,
    /^\/$/,
    /^\/login/,
    /^\/register/,
    /^\/dashboard/,
    /^\/digitalproduct/,
    /^\/@fs\//,  // Vite dev server files
    /^\/node_modules/,  // Development dependencies
    /^\/src\//,  // Source files
    /^\/public\//,  // Static assets
  ];

  /**
   * Check for suspicious requests
   */
  detectSuspiciousActivity(req: Request): {
    isSuspicious: boolean;
    threats: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  } {
    const threats: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check URL for suspicious patterns
    const fullUrl = req.originalUrl || req.url;
    
    // Skip security checks for whitelisted endpoints and query parameters
    const urlWithoutQuery = fullUrl.split('?')[0];
    const isSafeEndpoint = this.safeEndpoints.some(pattern => pattern.test(urlWithoutQuery)) || 
                          this.safeEndpoints.some(pattern => pattern.test(fullUrl));
    if (isSafeEndpoint) {
      return { isSuspicious: false, threats: [], riskLevel: 'low' };
    }
    
    this.suspiciousPatterns.forEach((pattern, index) => {
      if (pattern.test(fullUrl)) {
        threats.push(`Suspicious URL pattern detected: ${this.getPatternName(index)}`);
        riskLevel = 'high';
      }
    });

    // Check request body
    if (req.body) {
      const bodyStr = JSON.stringify(req.body);
      this.suspiciousPatterns.forEach((pattern, index) => {
        if (pattern.test(bodyStr)) {
          threats.push(`Suspicious payload detected: ${this.getPatternName(index)}`);
          riskLevel = 'critical';
        }
      });
    }

    // Check User-Agent
    const userAgent = req.headers['user-agent'] || '';
    this.blockedUserAgents.forEach(pattern => {
      if (pattern.test(userAgent)) {
        threats.push(`Blocked user agent: ${pattern.source}`);
        riskLevel = 'medium';
      }
    });

    // Check for rapid requests (basic rate limiting detection)
    const ip = req.ip || req.connection.remoteAddress;
    if (this.isRapidRequests(ip)) {
      threats.push('Rapid requests detected - possible DoS attempt');
      riskLevel = riskLevel === 'critical' ? 'critical' : 'high';
    }

    return {
      isSuspicious: threats.length > 0,
      threats,
      riskLevel
    };
  }

  private requestCounts = new Map<string, { count: number; lastReset: number }>();

  private isRapidRequests(ip: string | undefined): boolean {
    if (!ip) return false;

    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 100; // Max 100 requests per minute

    const record = this.requestCounts.get(ip);
    
    if (!record || now - record.lastReset > windowMs) {
      this.requestCounts.set(ip, { count: 1, lastReset: now });
      return false;
    }

    record.count++;
    return record.count > maxRequests;
  }

  private getPatternName(index: number): string {
    const names = [
      'SQL Injection', 'XSS Attack', 'Path Traversal', 
      'Command Injection', 'Code Execution'
    ];
    return names[index] || 'Unknown Pattern';
  }

  /**
   * Security middleware for Express
   */
  securityMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      // Detect suspicious activity
      const securityCheck = this.detectSuspiciousActivity(req);
      
      if (securityCheck.isSuspicious) {
        const logData = {
          timestamp: new Date().toISOString(),
          ip: req.ip || req.connection.remoteAddress,
          method: req.method,
          url: this.sanitizeForLog(req.originalUrl || req.url),
          userAgent: this.sanitizeForLog(req.headers['user-agent'] || ''),
          threats: securityCheck.threats,
          riskLevel: securityCheck.riskLevel,
          headers: this.sanitizeForLog(req.headers),
          body: req.body ? this.sanitizeForLog(req.body) : undefined
        };

        console.error(`🚨 SECURITY ALERT [${securityCheck.riskLevel.toUpperCase()}]:`, JSON.stringify(logData, null, 2));

        // Block critical threats
        if (securityCheck.riskLevel === 'critical') {
          return res.status(403).json({ 
            error: 'Request blocked for security reasons',
            requestId: `sec_${Date.now()}`
          });
        }
      }

      // Enhanced logging for all requests (sanitized)
      const originalSend = res.send;
      res.send = function(body) {
        const duration = Date.now() - startTime;
        
        // Only log errors and important operations
        if (res.statusCode >= 400 || req.method !== 'GET') {
          const logData = {
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl || req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'] ? '[SANITIZED]' : undefined,
            // Don't log response body for security
            responseSize: typeof body === 'string' ? body.length : 0
          };

          if (res.statusCode >= 500) {
            console.error('🔥 SERVER ERROR:', JSON.stringify(logData, null, 2));
          } else if (res.statusCode >= 400) {
            console.warn('⚠️  CLIENT ERROR:', JSON.stringify(logData, null, 2));
          } else {
            console.log('📝 REQUEST:', JSON.stringify(logData, null, 2));
          }
        }

        return originalSend.call(this, body);
      };

      next();
    };
  }

  /**
   * Rate limiting per IP
   */
  rateLimitMiddleware(maxRequests: number = 500, windowMs: number = 60000) {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      
      if (this.isRapidRequests(ip)) {
        console.warn(`🚫 RATE LIMIT: IP ${ip} exceeded ${maxRequests} requests per minute`);
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      next();
    };
  }

  /**
   * Clean up old rate limit records
   */
  cleanupRateLimitRecords() {
    const now = Date.now();
    const cutoff = 5 * 60 * 1000; // 5 minutes

    for (const [ip, record] of this.requestCounts.entries()) {
      if (now - record.lastReset > cutoff) {
        this.requestCounts.delete(ip);
      }
    }
  }
}

// Global instance
export const securityLogger = new SecurityLogger();

// Auto-cleanup rate limit records every 5 minutes
setInterval(() => {
  securityLogger.cleanupRateLimitRecords();
}, 5 * 60 * 1000);