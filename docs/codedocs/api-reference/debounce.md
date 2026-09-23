---
title: "Debounce"
description: "API reference for the Debounce class implemented in src/debounce.ts."
---

The `Debounce` class provides a distributed debounce across instances using a shared Redis counter. It is implemented in `src/debounce.ts`. In this repository, it is not re-exported from `src/index.ts`, so verify your package exports before importing from the root.

## Constructor
```typescript
new Debounce(config: DebounceConfig)
```

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | `string` | — | Unique Redis key for the debounce window. |
| `redis` | `Redis` | — | Upstash Redis client instance. |
| `wait` | `number` | `1000` | Window size in milliseconds. |
| `callback` | `(...args: any[]) => any` | — | Function to run after the debounce window. |

**Example**
```typescript filename="debounce-ctor.ts"
import { Debounce } from "@upstash/lock";
import { Redis } from "@upstash/redis";

const debounced = new Debounce({
  id: "events:search",
  redis: Redis.fromEnv(),
  wait: 1000,
  callback: (query: string) => {
    console.log("search", query);
  },
});
```

## Methods

### `call`
Triggers the debounce flow. The callback runs only if this call is still the most recent after `wait` milliseconds.

```typescript
call(...args: any[]): Promise<void>
```

**Example**
```typescript filename="debounce-call.ts"
await debounced.call("upstash");
await debounced.call("lock");
```

## Behavior Notes
`call()` always waits the full `wait` duration before deciding whether to execute the callback. If you need immediate execution on the first call and suppression of subsequent calls, you should wrap the callback with your own “leading edge” logic. The implementation is intentionally minimal and uses Redis `INCR` and `GET` only, which keeps the number of round-trips low but provides no visibility into how many calls were suppressed. Also note that the last invocation wins: the arguments used to execute the callback are the ones provided by the most recent call that survives the window.

**Example: passing multiple arguments**
```typescript filename="debounce-multi-args.ts"
await debounced.call({ id: "evt_1" }, "webhook");
```

## Usage Pattern
```typescript filename="debounce-pattern.ts"
import { Debounce } from "@upstash/lock";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const debounced = new Debounce({
  id: "webhooks:ingest",
  redis,
  wait: 2000,
  callback: async (payload: { id: string }) => {
    await ingestWebhook(payload);
  },
});

export async function handleWebhook(payload: { id: string }) {
  await debounced.call(payload);
}
```

Related pages: [Distributed Debounce](../distributed-debounce), [Types](../types).
