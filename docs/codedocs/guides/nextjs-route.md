---
title: "Next.js Route Handler"
description: "Use @upstash/lock in a Next.js route handler to serialize work across users."
---

This guide shows how the demo app implements a lock in a Next.js `route.ts` handler. The handler derives a lock key (from a custom ID or the caller's IP), acquires a Redis-backed lock, and returns a JSON response indicating whether the lock was acquired.

<Steps>
<Step>
### Create a route handler that acquires a lock
```typescript app/api/acquire-lock/route.ts
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
```
</Step>
<Step>
### Call the route from your client
The demo UI sends requests to `/api/acquire-lock` and displays the response. See the full client example in [Demo UI](./demo-ui).
</Step>
</Steps>

**Why this works**
- A stable `lockKey` ensures all callers contend for the same lock.
- Redis `SET NX PX` guarantees only one caller creates the key within the lease window.
- The response carries the `leaseTime` so the client can show an accurate countdown.

<Callout type="warn">If the caller's IP is not present, the handler returns a 400 response. For environments without `x-forwarded-for`, you should require a custom ID.</Callout>

Related references:
- [Lock API](../api-reference/lock)
- [Lock Lifecycle](../lock-lifecycle)
