export const dynamic = 'force-dynamic';

export async function GET() {
  const gameServerUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL?.trim();
  return Response.json({
    status: 'healthy',
    service: 'mafia-imposter-web',
    timestamp: new Date().toISOString(),
    realtime: gameServerUrl
      ? { status: 'configured', origin: gameServerUrl }
      : { status: 'local', notes: 'Uses the combined local server when no public origin is configured' },
  });
}
