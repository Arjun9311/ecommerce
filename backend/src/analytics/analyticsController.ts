import { Request, Response } from 'express';
import { AnalyticsService } from './analyticsService.js';
import { checkValkeyHealth } from '../valkey/client.js';

export async function getDashboardStatsController(req: Request, res: Response): Promise<void> {
  try {
    const stats = await AnalyticsService.getDashboardStats();
    res.status(200).json(stats);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

export async function getPrometheusMetricsController(req: Request, res: Response): Promise<void> {
  try {
    // Generate text/plain Prometheus metrics
    const stats = await AnalyticsService.getDashboardStats();
    const valkeyHealth = await checkValkeyHealth();

    let metricsStr = '';
    metricsStr += `# HELP valkey_commerce_visitors Today's unique visitors\n`;
    metricsStr += `# TYPE valkey_commerce_visitors gauge\n`;
    metricsStr += `valkey_commerce_visitors ${stats.uniqueVisitors}\n\n`;

    metricsStr += `# HELP valkey_commerce_orders Today's orders count\n`;
    metricsStr += `# TYPE valkey_commerce_orders gauge\n`;
    metricsStr += `valkey_commerce_orders ${stats.ordersCount}\n\n`;

    metricsStr += `# HELP valkey_commerce_revenue Today's sales revenue in paise\n`;
    metricsStr += `# TYPE valkey_commerce_revenue gauge\n`;
    metricsStr += `valkey_commerce_revenue ${stats.revenue}\n\n`;

    metricsStr += `# HELP valkey_latency_ms Valkey connection latency in ms\n`;
    metricsStr += `# TYPE valkey_latency_ms gauge\n`;
    metricsStr += `valkey_latency_ms ${valkeyHealth.latencyMs}\n`;

    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.status(200).send(metricsStr);
  } catch (error: any) {
    res.status(500).send(error.message);
  }
}
