---
title: "Getting Started"
description: "Get up and running with @upstash/lock for distributed locking and debouncing using Upstash Redis."
---

@upstash/lock is a TypeScript library that provides distributed locking (and debouncing) built on Upstash Redis.

**The Problem**
- Multiple instances of an app can accidentally do the same expensive work at the same time.
- Pure in-memory locks do not work across processes or serverless instances.
- Coordinating retries and lease times by hand is easy to get wrong.
- You often need a best-effort "do it once" guarantee without building a full coordinator.

**The Solution**
@upstash/lock stores lock state in Upstash Redis and uses atomic Redis operations to acquire, extend, and release locks across instances.

```typescript README.md
import { Lock } from "@upstash/lock";
import { Redis } from "@upstash/redis";

async function handleOperation() {
  const lock = new Lock({
    id: "unique-lock-id",
    redis: Redis.fromEnv(),
  });

  if (await lock.acquire()) {
    // Perform your critical section that requires mutual exclusion
    await criticalSection();
    await lock.release();
  } else {
    // handle lock acquisition failure
  }
}
```

**Installation**
<Tabs items={["npm", "pnpm", "yarn", "bun"]}>
<Tab value="npm">
```bash
npm install @upstash/lock
```
</Tab>
<Tab value="pnpm">
```bash
pnpm add @upstash/lock
```
</Tab>
<Tab value="yarn">
```bash
yarn add @upstash/lock
```
</Tab>
<Tab value="bun">
```bash
bun add @upstash/lock
```
</Tab>
</Tabs>

**Quick Start**
The snippet below is taken from the library tests and demonstrates a full lifecycle: acquire -> extend -> release.

```typescript src/lock.test.ts
const uniqueId = getUniqueLockId();
const lock = new Lock({
  id: uniqueId,
  redis: Redis.fromEnv(),
});

expect(lock.id).toBe(uniqueId);
expect(await lock.getStatus()).toBe("FREE");
const acquired = await lock.acquire();
expect(acquired).toBe(true);
const extended = await lock.extend(10000);
expect(extended).toBe(true);
const released = await lock.release();
expect(released).toBe(true);
expect(await lock.getStatus()).toBe("FREE");
```

Expected outcome when the lock is available:
- `lock.acquire()` resolves to `true`.
- `lock.extend(10000)` resolves to `true`.
- `lock.release()` resolves to `true`.
- `lock.getStatus()` returns `"FREE"` after release.

**Key Features**
- Distributed locks with Redis-backed leases.
- Atomic release and extension using Redis Lua scripts.
- Retry configuration for acquisition attempts.
- A distributed debounce utility backed by Redis counters.
- Supported environments: any runtime supported by `@upstash/redis`; if `crypto.randomUUID()` is unavailable, provide `uuid` in `lock.acquire(...)`.

<Cards>
  <Card title="Architecture" href="/docs/architecture">How modules fit together and why.</Card>
  <Card title="Core Concepts" href="/docs/lock-lifecycle">Learn the primitives used by locks and debounce.</Card>
  <Card title="API Reference" href="/docs/api-reference/lock">Full method and type documentation.</Card>
</Cards>
