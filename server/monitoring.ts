// Advanced Monitoring & Safety System for Multithreading Operations
import { EventEmitter } from 'events';

export class ThreadingMonitor extends EventEmitter {
  private activeOperations: Map<string, { startTime: number; type: string; count: number }> = new Map();
  private performanceMetrics: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageResponseTime: number;
    peakConcurrency: number;
    currentConcurrency: number;
    memoryUsage: { used: number; total: number };
    lastUpdated: Date;
  } = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    averageResponseTime: 0,
    peakConcurrency: 0,
    currentConcurrency: 0,
    memoryUsage: { used: 0, total: 0 },
    lastUpdated: new Date()
  };

  private maxConcurrency = 50; // Safety limit
  private responseTimeThreshold = 10000; // 10 seconds
  private memoryThreshold = 0.85; // 85% memory usage threshold

  /**
   * Start monitoring an operation
   */
  startOperation(operationId: string, type: string, count: number = 1): boolean {
    // Check if we're at capacity
    if (this.performanceMetrics.currentConcurrency >= this.maxConcurrency) {
      console.warn(`🚨 THREADING LIMIT: Rejecting operation ${operationId}. Current: ${this.performanceMetrics.currentConcurrency}, Max: ${this.maxConcurrency}`);
      return false;
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memoryUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
    if (memoryUsagePercent > this.memoryThreshold) {
      console.warn(`🚨 MEMORY WARNING: ${(memoryUsagePercent * 100).toFixed(1)}% memory usage. Operation ${operationId} delayed.`);
      return false;
    }

    this.activeOperations.set(operationId, {
      startTime: Date.now(),
      type,
      count
    });

    this.performanceMetrics.currentConcurrency++;
    this.performanceMetrics.totalOperations++;

    if (this.performanceMetrics.currentConcurrency > this.performanceMetrics.peakConcurrency) {
      this.performanceMetrics.peakConcurrency = this.performanceMetrics.currentConcurrency;
    }

    console.log(`📊 THREADING START: ${operationId} (${type}) - Current: ${this.performanceMetrics.currentConcurrency}/${this.maxConcurrency}`);
    return true;
  }

  /**
   * Complete an operation (success)
   */
  completeOperation(operationId: string, itemsProcessed: number = 0): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;

    const duration = Date.now() - operation.startTime;
    this.activeOperations.delete(operationId);

    this.performanceMetrics.currentConcurrency--;
    this.performanceMetrics.successfulOperations++;
    this.updateAverageResponseTime(duration);

    console.log(`✅ THREADING SUCCESS: ${operationId} completed in ${duration}ms (${itemsProcessed} items) - Current: ${this.performanceMetrics.currentConcurrency}`);

    // Check for slow operations
    if (duration > this.responseTimeThreshold) {
      console.warn(`⚠️ SLOW OPERATION: ${operationId} took ${duration}ms (threshold: ${this.responseTimeThreshold}ms)`);
    }

    this.emit('operationComplete', { operationId, duration, itemsProcessed, type: operation.type });
  }

  /**
   * Fail an operation
   */
  failOperation(operationId: string, error: string): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;

    const duration = Date.now() - operation.startTime;
    this.activeOperations.delete(operationId);

    this.performanceMetrics.currentConcurrency--;
    this.performanceMetrics.failedOperations++;
    this.updateAverageResponseTime(duration);

    console.error(`❌ THREADING FAILURE: ${operationId} failed after ${duration}ms - Error: ${error} - Current: ${this.performanceMetrics.currentConcurrency}`);

    this.emit('operationFailed', { operationId, duration, error, type: operation.type });
  }

  /**
   * Get current system health
   */
  getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    metrics: typeof this.performanceMetrics;
    activeOperations: Array<{ id: string; type: string; duration: number; count: number }>;
    recommendations: string[];
  } {
    const now = Date.now();
    const activeOps = Array.from(this.activeOperations.entries()).map(([id, op]) => ({
      id,
      type: op.type,
      duration: now - op.startTime,
      count: op.count
    }));

    // Update memory usage
    const memUsage = process.memoryUsage();
    this.performanceMetrics.memoryUsage = {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal
    };
    this.performanceMetrics.lastUpdated = new Date();

    // Determine system status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    const recommendations: string[] = [];

    // Check concurrency
    const concurrencyRatio = this.performanceMetrics.currentConcurrency / this.maxConcurrency;
    if (concurrencyRatio > 0.8) {
      status = 'warning';
      recommendations.push('High concurrency detected. Consider reducing batch sizes.');
    }

    // Check memory usage
    const memoryRatio = memUsage.heapUsed / memUsage.heapTotal;
    if (memoryRatio > this.memoryThreshold) {
      status = 'critical';
      recommendations.push('High memory usage. Reduce concurrent operations immediately.');
    }

    // Check error rate
    const errorRate = this.performanceMetrics.failedOperations / Math.max(this.performanceMetrics.totalOperations, 1);
    if (errorRate > 0.1) {
      status = 'warning';
      recommendations.push('High error rate detected. Check external service connectivity.');
    }

    // Check for stuck operations
    const stuckOps = activeOps.filter(op => op.duration > this.responseTimeThreshold);
    if (stuckOps.length > 0) {
      status = 'warning';
      recommendations.push(`${stuckOps.length} operations are running longer than expected.`);
    }

    return {
      status,
      metrics: this.performanceMetrics,
      activeOperations: activeOps,
      recommendations
    };
  }

  /**
   * Auto-cleanup stuck operations
   */
  cleanupStuckOperations(): number {
    const now = Date.now();
    let cleanedUp = 0;

    for (const [id, operation] of this.activeOperations.entries()) {
      const duration = now - operation.startTime;
      if (duration > this.responseTimeThreshold * 2) { // 2x threshold
        console.warn(`🧹 CLEANUP: Removing stuck operation ${id} (${duration}ms)`);
        this.failOperation(id, 'Operation timeout - auto cleanup');
        cleanedUp++;
      }
    }

    return cleanedUp;
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(newTime: number): void {
    const totalOps = this.performanceMetrics.successfulOperations + this.performanceMetrics.failedOperations;
    this.performanceMetrics.averageResponseTime = 
      ((this.performanceMetrics.averageResponseTime * (totalOps - 1)) + newTime) / totalOps;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): string {
    const health = this.getSystemHealth();
    const memoryPercent = ((health.metrics.memoryUsage.used / health.metrics.memoryUsage.total) * 100).toFixed(1);
    const errorRate = ((health.metrics.failedOperations / Math.max(health.metrics.totalOperations, 1)) * 100).toFixed(1);

    return `
📊 THREADING MONITOR SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Status: ${health.status.toUpperCase()}
⚡ Current Operations: ${health.metrics.currentConcurrency}/${this.maxConcurrency}
🏆 Peak Concurrency: ${health.metrics.peakConcurrency}
📈 Total Operations: ${health.metrics.totalOperations}
✅ Success Rate: ${(100 - parseFloat(errorRate)).toFixed(1)}%
⏱️  Avg Response: ${health.metrics.averageResponseTime.toFixed(0)}ms
💾 Memory Usage: ${memoryPercent}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${health.recommendations.length > 0 ? '⚠️  RECOMMENDATIONS:\n' + health.recommendations.map(r => `• ${r}`).join('\n') : '✅ All systems optimal'}
    `.trim();
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.performanceMetrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageResponseTime: 0,
      peakConcurrency: 0,
      currentConcurrency: this.performanceMetrics.currentConcurrency, // Keep current
      memoryUsage: { used: 0, total: 0 },
      lastUpdated: new Date()
    };
    console.log('📊 THREADING MONITOR: Metrics reset');
  }
}

// Global instance
export const threadingMonitor = new ThreadingMonitor();

// Auto-cleanup every 5 minutes
setInterval(() => {
  const cleaned = threadingMonitor.cleanupStuckOperations();
  if (cleaned > 0) {
    console.log(`🧹 AUTO-CLEANUP: Removed ${cleaned} stuck operations`);
  }
}, 5 * 60 * 1000);

// Performance summary every 10 minutes
setInterval(() => {
  console.log(threadingMonitor.getPerformanceSummary());
}, 10 * 60 * 1000);