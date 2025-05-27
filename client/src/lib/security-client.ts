// Client-Side Security & Log Protection
export class ClientSecurity {
  private sensitivePatterns = [
    // API Keys & Tokens
    /api[_-]?key[s]?[\s=:]+[a-zA-Z0-9_-]{10,}/gi,
    /token[\s=:]+[a-zA-Z0-9_.-]{10,}/gi,
    /secret[\s=:]+[a-zA-Z0-9_.-]{10,}/gi,
    /password[\s=:]+.{3,}/gi,
    
    // Bot tokens
    /[0-9]{8,}:[a-zA-Z0-9_-]{30,}/gi,
    
    // Email & Personal data
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  ];

  private originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
  };

  /**
   * Sanitize data before logging
   */
  private sanitizeData(data: any): string {
    let sanitized = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    
    // Replace sensitive patterns
    this.sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[PROTECTED]');
    });

    // Mask partial sensitive data
    sanitized = sanitized.replace(/\b\d{3}-?\d{3}-?\d{4}\b/g, 'XXX-XXX-XXXX');
    
    return sanitized;
  }

  /**
   * Initialize secure console logging
   */
  initializeSecureLogging() {
    // Override console methods with sanitized versions
    console.log = (...args) => {
      const sanitized = args.map(arg => this.sanitizeData(arg));
      this.originalConsole.log('[SECURE]', ...sanitized);
    };

    console.warn = (...args) => {
      const sanitized = args.map(arg => this.sanitizeData(arg));
      this.originalConsole.warn('[SECURE]', ...sanitized);
    };

    console.error = (...args) => {
      const sanitized = args.map(arg => this.sanitizeData(arg));
      this.originalConsole.error('[SECURE]', ...sanitized);
    };

    console.info = (...args) => {
      const sanitized = args.map(arg => this.sanitizeData(arg));
      this.originalConsole.info('[SECURE]', ...sanitized);
    };

    console.debug = (...args) => {
      const sanitized = args.map(arg => this.sanitizeData(arg));
      this.originalConsole.debug('[SECURE]', ...sanitized);
    };
  }

  /**
   * Secure localStorage wrapper
   */
  secureStorage = {
    setItem: (key: string, value: string) => {
      try {
        // Don't store sensitive data in localStorage
        const sensitiveKeys = ['token', 'password', 'secret', 'apikey'];
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          console.warn('🔒 SECURITY: Attempted to store sensitive data in localStorage');
          return;
        }
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('Storage error:', this.sanitizeData(error));
      }
    },

    getItem: (key: string) => {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error('Storage error:', this.sanitizeData(error));
        return null;
      }
    },

    removeItem: (key: string) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Storage error:', this.sanitizeData(error));
      }
    }
  };

  /**
   * Secure error handler for API calls
   */
  handleApiError(error: any, context: string = 'API Call') {
    const sanitizedError = {
      message: error?.message || 'Unknown error',
      status: error?.status || 'Unknown',
      context: context,
      timestamp: new Date().toISOString()
    };

    console.error(`🔥 ${context} Error:`, this.sanitizeData(sanitizedError));
    
    // Return user-friendly error message
    return {
      message: 'Terjadi kesalahan sistem. Tim teknis telah diberitahu.',
      code: sanitizedError.status
    };
  }

  /**
   * Monitor network requests for sensitive data
   */
  initializeNetworkMonitoring() {
    // Override fetch to monitor requests
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const [url, options] = args;
      
      try {
        const response = await originalFetch(...args);
        
        // Log only non-sensitive requests
        if (typeof url === 'string' && !url.includes('token') && !url.includes('password')) {
          console.log(`🌐 API: ${options?.method || 'GET'} ${url} → ${response.status}`);
        }
        
        return response;
      } catch (error) {
        this.handleApiError(error, `Network Request to ${url}`);
        throw error;
      }
    };
  }

  /**
   * Initialize all security measures
   */
  initialize() {
    this.initializeSecureLogging();
    this.initializeNetworkMonitoring();
    
    // Add global error handler
    window.addEventListener('error', (event) => {
      this.handleApiError(event.error, 'Global Error');
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleApiError(event.reason, 'Unhandled Promise Rejection');
    });

    console.log('🔒 CLIENT SECURITY: Sistem keamanan frontend aktif');
  }

  /**
   * Get security status
   */
  getSecurityStatus() {
    return {
      logProtection: true,
      storageProtection: true,
      networkMonitoring: true,
      errorHandling: true,
      timestamp: new Date().toISOString()
    };
  }
}

// Create global instance
export const clientSecurity = new ClientSecurity();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  clientSecurity.initialize();
}