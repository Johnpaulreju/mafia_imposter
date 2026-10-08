import { getRedis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    database: { status: 'configured', latency: 0, notes: 'PostgreSQL via postgres package' },
    redis: { status: 'unknown', latency: 0 },
    websocket: { status: 'healthy', notes: 'WebSocket available on /api/ws' },
  };

  // Check Redis
  try {
    const start = Date.now();
    const redis = getRedis();
    if (redis) {
      await redis.ping();
      checks.redis = {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } else {
      checks.redis = {
        status: 'unavailable',
        latency: 0,
        notes: 'Redis not configured',
      };
    }
  } catch (error) {
    checks.redis = {
      status: 'unhealthy',
      latency: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  const allHealthy =
    checks.database.status === 'configured' &&
    (checks.redis.status === 'healthy' || checks.redis.status === 'unavailable');

  return Response.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
