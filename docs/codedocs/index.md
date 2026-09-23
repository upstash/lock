---
title: "Upstash Lock"
description: "Distributed locking and debouncing utilities backed by Upstash Redis for best-effort mutual exclusion and cross-instance rate control."
---

@upstash/lock provides a small, focused set of primitives for distributed locking and debouncing on top of Upstash Redis.

**The Problem**
- Multiple app instances can run the same expensive work at the same time, wasting resources.
- Coordinating a critical section across serverless or multi-region deployments is hard without a shared state.
- Local in-process locks and debouncers do not work across horizontally scaled deployments.
- You need a best-effort lock with a bounded lease, not heavy-weight consensus.

**The Solution**
The library uses Redis atomic commands and Lua scripts to implement a best-effort lock with an expiring lease and a distributed debounce that collapses bursts across instances.

```typescript filename="app.ts"
import { Lock } from "@upstash/lock";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function runJob() {
  const lock = new Lock({
    id: "jobs:nightly-report",
    redis,
    lease: 15_000,
  });

  if (await lock.acquire()) {
    try {
      await generateReport();
    } finally {
      await lock.release();
    }
  }
}
```

**Installation**
<Tabs items={['npm', 'pnpm', 'yarn', 'bun']}>
<Tab value="npm">
```bash
npm install @upstash/lock @upstash/redis
```
</Tab>
<Tab value="pnpm">
```bash
pnpm add @upstash/lock @upstash/redis
```
</Tab>
<Tab value="yarn">
```bash
yarn add @upstash/lock @upstash/redis
```
</Tab>
<Tab value="bun">
```bash
bun add @upstash/lock @upstash/redis
```
</Tab>
</Tabs>

**Quick Start**
```typescript filename="quickstart.ts"
import { Lock } from "@upstash/lock";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

async function main() {
  const lock = new Lock({ id: "example:lock", redis });
  const acquired = await lock.acquire();

  if (!acquired) {
    console.log("lock-busy");
    return;
  }

  try {
    console.log("lock-acquired");
    // your critical section
  } finally {
    await lock.release();
    console.log("lock-released");
  }
}

main();
```

Expected output:
```
lock-acquired
lock-released
```

**Key Features**
- Best-effort distributed lock with Redis `SET NX PX` semantics.
- Safe release and lease extension via Lua scripts.
- Retry configuration for acquisition attempts and delays.
- Distributed debounce built on a shared Redis counter.
- Minimal surface area that works in serverless and edge runtimes.

<Cards>
  <Card title="Architecture" href="/docs/architecture">How modules interact and how data flows through Redis.</Card>
  <Card title="Core Concepts" href="/docs/lock-lifecycle">Understand the lock lifecycle and lease behavior.</Card>
  <Card title="API Reference" href="/docs/api-reference/lock">Full details of public classes and methods.</Card>
</Cards>
