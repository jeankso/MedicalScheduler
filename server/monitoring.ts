
interface PerformanceMetric {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: Date;
  statusCode: number;
  errorMessage?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Manter apenas os últimos 1000 registros

  logRequest(req: any, res: any, duration: number, error?: Error): void {
    const metric: PerformanceMetric = {
      endpoint: req.path,
      method: req.method,
      duration,
      timestamp: new Date(),
      statusCode: res.statusCode,
      errorMessage: error?.message
    };

    this.metrics.push(metric);

    // Manter apenas os últimos registros
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log para requisições muito lentas (> 5 segundos)
    if (duration > 5000) {
      console.warn(`Requisição lenta detectada: ${req.method} ${req.path} - ${duration}ms`);
    }
  }

  getMetrics(hours: number = 24): PerformanceMetric[] {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    return this.metrics.filter(metric => metric.timestamp >= cutoff);
  }

  getAverageResponseTime(endpoint?: string): number {
    let filteredMetrics = this.metrics;
    
    if (endpoint) {
      filteredMetrics = this.metrics.filter(m => m.endpoint === endpoint);
    }

    if (filteredMetrics.length === 0) return 0;

    const total = filteredMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    return total / filteredMetrics.length;
  }

  getErrorRate(hours: number = 24): number {
    const recentMetrics = this.getMetrics(hours);
    if (recentMetrics.length === 0) return 0;

    const errors = recentMetrics.filter(m => m.statusCode >= 400);
    return (errors.length / recentMetrics.length) * 100;
  }

  getSlowestEndpoints(limit: number = 10): Array<{endpoint: string, avgDuration: number}> {
    const endpointStats = new Map<string, {total: number, count: number}>();

    this.metrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      const existing = endpointStats.get(key) || {total: 0, count: 0};
      
      endpointStats.set(key, {
        total: existing.total + metric.duration,
        count: existing.count + 1
      });
    });

    return Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        avgDuration: stats.total / stats.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Middleware para capturar métricas
export function performanceMiddleware(req: any, res: any, next: any): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    performanceMonitor.logRequest(req, res, duration);
  });

  next();
}
