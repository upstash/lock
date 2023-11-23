import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { Lock } from '@upstash/lock';
import { Redis } from '@upstash/redis';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0];

  if (!ip) {
    return NextResponse.json({}, { status: 400, statusText: 'Unable to get IP Address. Try a custom lock ID instead!' });
  }

  const customId = req.nextUrl.searchParams.get('customId');
  const lockKey = createHash('sha256').update(customId ?? ip).digest('hex');

  const leaseTime = parseInt(req.nextUrl.searchParams.get('leaseTime') ?? '10000');

  const leaseDuration = isNaN(leaseTime) ? 10000 : leaseTime;

  const lock = new Lock({
    id: lockKey,
    lease: leaseTime,
    redis: Redis.fromEnv(),
  })

  if (await lock.acquire()) {
    return NextResponse.json({
      message: 'Lock acquired successfully.',
      lockAcquired: true,
      leaseTime: leaseDuration,
      lockKey,
    });
  }

  return NextResponse.json({
    message: 'Failed to acquire lock.',
    lockAcquired: false,
    leaseTime: leaseDuration,
    lockKey,
  });
}
