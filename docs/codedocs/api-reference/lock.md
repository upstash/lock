---
title: "Lock"
description: "API reference for the Lock class in @upstash/lock."
---

The `Lock` class provides a best-effort distributed lock backed by Upstash Redis. It is defined in `src/lock.ts` and re-exported from `src/index.ts`.

## Constructor
```typescript
new Lock(config: LockCreateConfig)
```

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | `string` | — | Unique Redis key for the lock. Use a stable, namespaced identifier. |
| `redis` | `Redis` | — | Upstash Redis client instance. |
| `lease` | `number` | `10000` | Lease duration in milliseconds. |
| `retry.attempts` | `number` | `3` | Number of acquire attempts before giving up. |
| `retry.delay` | `number` | `100` | Delay between attempts in milliseconds. |

**Example**
```typescript filename="lock-ctor.ts"
import { Lock } from "@upstash/lock";
import { Redis } from "@upstash/redis";

const lock = new Lock({
  id: "jobs:cleanup",
  redis: Redis.fromEnv(),
  lease: 5_000,
  retry: { attempts: 2, delay: 250 },
});
```

## Methods

### `acquire`
Attempts to acquire the lock. Returns `true` on success, `false` otherwise.

```typescript
acquire(config?: LockAcquireConfig): Promise<boolean>
```

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `config.lease` | `number \| undefined` | — | Overrides the instance lease for this acquisition. |
| `config.retry.attempts` | `number \| undefined` | — | Overrides retry attempts for this acquisition. |
| `config.retry.delay` | `number \| undefined` | — | Overrides retry delay for this acquisition. |
| `config.uuid` | `string \| undefined` | — | UUID to use instead of `crypto.randomUUID()`. |

**Example**
```typescript filename="lock-acquire.ts"
const acquired = await lock.acquire({
  lease: 15_000,
  retry: { attempts: 5, delay: 200 },
});
```

### `release`
Safely releases the lock if the UUID matches the stored Redis value. Returns `true` if the key was deleted.

```typescript
release(): Promise<boolean>
```

**Example**
```typescript filename="lock-release.ts"
try {
  await doWork();
} finally {
  await lock.release();
}
```

### `extend`
Extends the current lease by the given amount in milliseconds. Returns `true` if the TTL was updated.

```typescript
extend(amt: number): Promise<boolean>
```

**Example**
```typescript filename="lock-extend.ts"
const ok = await lock.extend(10_000);
if (!ok) {
  throw new Error("lost lock");
}
```

### `getStatus`
Returns `"ACQUIRED"` if the lock’s UUID matches Redis, otherwise `"FREE"`.

```typescript
getStatus(): Promise<LockStatus>
```

**Example**
```typescript filename="lock-status.ts"
const status = await lock.getStatus();
if (status === "FREE") {
  console.log("not held");
}
```

### `id`
Read-only property returning the Redis key for this lock.

```typescript
const key: string = lock.id;
```

## Usage Pattern
```typescript filename="lock-pattern.ts"
import { Lock } from "@upstash/lock";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function runOnce() {
  const lock = new Lock({ id: "jobs:daily", redis, lease: 10_000 });

  if (!(await lock.acquire())) return;

  try {
    await doWork();
  } finally {
    await lock.release();
  }
}
```

Related pages: [Lock Lifecycle](../lock-lifecycle), [Lease and Retry](../lease-and-retry), [Types](../types).
