---
title: "Types"
description: "Exported TypeScript types and what they represent in @upstash/lock."
---

This page lists the exported TypeScript types from `src/types.ts` and explains how to use them. These types describe the configuration objects and return values used by the `Lock` and `Debounce` classes.

## Type Definitions
```typescript
import type { Redis } from "@upstash/redis";

export type RetryConfig = {
  attempts: number;
  delay: number;
};

export type LockAcquireConfig = {
  lease?: number;
  retry?: RetryConfig;
  uuid?: string;
};

export type LockConfig = {
  redis: Redis;
  id: string;
  lease: number;
  UUID: string | null;
  retry: RetryConfig;
};

export type LockCreateConfig = {
  id: string;
  redis: Redis;
  lease?: number;
  retry?: RetryConfig;
};

export type LockStatus = "ACQUIRED" | "FREE";

export type DebounceConfig = {
  redis: Redis;
  id: string;
  wait: number;
  callback: (...args: any[]) => any;
};
```

## Explanations

**`RetryConfig`**
Use this to tune acquisition behavior under contention. `attempts` is how many times `acquire()` will try before giving up. `delay` is the pause between attempts in milliseconds. These are wired directly into the retry loop in `src/lock.ts`.

**`LockAcquireConfig`**
This is an optional override for a single acquisition. It lets you change the lease length and retry policy for one call, and it optionally accepts a `uuid` if the runtime does not provide `crypto.randomUUID()`. If `uuid` is omitted and the runtime lacks UUID support, `acquire()` throws an error.

**`LockConfig`**
This is the internal normalized configuration held by the `Lock` instance. It includes the computed lease and retry values, and a `UUID` field which is `null` until a lock is acquired. You typically do not construct this type directly, but it describes the internal state a `Lock` maintains.

**`LockCreateConfig`**
This is the public constructor configuration for `Lock`. It requires a Redis client and key `id`, and optionally overrides the default lease and retry settings. This type is the one you will use most frequently in application code.

**`LockStatus`**
The status returned by `getStatus()` is a simple union of `"ACQUIRED"` and `"FREE"`. It checks whether the local UUID matches the Redis key’s value at the time of the call.

**`DebounceConfig`**
This config defines a debounce window and callback. It is used by `Debounce` to share a counter across instances. The `callback` can be synchronous or async and is called with the arguments provided to `call()`.

Related pages: [Lock](./api-reference/lock), [Debounce](./api-reference/debounce), [Lock Lifecycle](./lock-lifecycle).
