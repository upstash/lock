---
title: "Lock"
description: "API reference for the distributed Lock class."
---

The `Lock` class provides a Redis-backed, best-effort distributed lock. It manages acquisition with retries, a lease TTL, safe release, and lease extension.

**Constructor**

```typescript src/lock.ts
constructor(config: LockCreateConfig)
```

**Constructor parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `id` | `string` | — | Unique identifier for the lock key in Redis. |
| `redis` | `Redis` | — | Upstash Redis client instance used for locking. |
| `lease` | `number` | `10000` | Lease duration in milliseconds. |
| `retry.attempts` | `number` | `3` | Number of acquisition attempts before giving up. |
| `retry.delay` | `number` | `100` | Delay in milliseconds between acquisition attempts. |

**Constructor example**

```typescript src/lock.test.ts
const uniqueId = getUniqueLockId();
const lock = new Lock({
  id: uniqueId,
  redis: Redis.fromEnv(),
  lease: 5000,
  retry: {
    attempts: 1,
    delay: 100,
  },
});
```

**Methods**

`acquire(acquireConfig?: LockAcquireConfig): Promise<boolean>`

```typescript src/lock.ts
public async acquire(acquireConfig?: LockAcquireConfig): Promise<boolean>
```

Attempts to acquire the lock. Returns `true` when the lock is acquired, `false` otherwise.

Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `acquireConfig.lease` | `number` | — | Optional override for the lease duration (ms). |
| `acquireConfig.retry.attempts` | `number` | — | Optional override for retry attempts. |
| `acquireConfig.retry.delay` | `number` | — | Optional override for retry delay (ms). |
| `acquireConfig.uuid` | `string` | — | Optional UUID to use for ownership instead of generating one. |

Return type: `Promise<boolean>`

Example

```typescript src/lock.test.ts
expect(await lock.acquire()).toBe(true);
```

`release(): Promise<boolean>`

```typescript src/lock.ts
public async release(): Promise<boolean>
```

Safely releases the lock using a UUID check. Returns `true` if the lock was released.

Return type: `Promise<boolean>`

Example

```typescript src/lock.test.ts
const released = await lock.release();
expect(released).toBe(true);
```

`extend(amt: number): Promise<boolean>`

```typescript src/lock.ts
public async extend(amt: number): Promise<boolean>
```

Extends the lease by `amt` milliseconds if the UUID still matches.

Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `amt` | `number` | — | Number of milliseconds to extend the lease. |

Return type: `Promise<boolean>`

Example

```typescript src/lock.test.ts
const extended = await lock.extend(10000);
expect(extended).toBe(true);
```

`getStatus(): PromiseLockStatus>`

```typescript src/lock.ts
async getStatus(): PromiseLockStatus>
```

Returns `"ACQUIRED"` when the UUID still matches the Redis key, otherwise `"FREE"`.

Return type: `PromiseLockStatus>`

Example

```typescript src/lock.test.ts
expect(await lock.getStatus()).toBe("FREE");
```

Related references:
- [Lock Lifecycle](../lock-lifecycle)
- [Lease and Retry](../lease-and-retry)
