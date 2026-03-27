---
title: "Debounce"
description: "API reference for the distributed Debounce class."
---

The `Debounce` class provides a Redis-backed, cross-instance debounce. It ensures that a callback runs at most once per wait period for a given `id`.

**Constructor**

```typescript src/debounce.ts
constructor(config: DebounceConfig)
```

**Constructor parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `id` | `string` | — | Unique identifier for the debounce key in Redis. |
| `redis` | `Redis` | — | Upstash Redis client instance used for debounce operations. |
| `wait` | `number` | `1000` | Wait duration in milliseconds. |
| `callback` | `(...args: any[]) => any` | — | Function invoked after the wait period when the call wins. |

**Constructor example**

```typescript src/debounce.test.ts
const uniqueId = getUniqueFunctionId();
const debouncedFunction = new Debounce({
  id: uniqueId,
  redis: Redis.fromEnv(),

  // Wait time of 1 second
  // The debounced function will only be called once per second
  wait: 1000,

  // Callback function to be debounced
  callback: () => {
    // Increment the counter
    count++;
  },
});
```

**Methods**

`call(...args: any[]): Promise<void>`

```typescript src/debounce.ts
public async call(...args: any[]): Promise<void>
```

Calls the debounced function. The callback runs only if the Redis counter is unchanged after the wait period.

Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `...args` | `any[]` | — | Arguments forwarded to the callback. |

Return type: `Promise<void>`

Example

```typescript src/debounce.test.ts
for (const word of words) {
  debouncedFunction.call(word);
}
```

**Async callback example**

```typescript src/debounce.test.ts
const debouncedFunction = new Debounce({
  id: uniqueId,
  redis: Redis.fromEnv(),

  // Wait time of 1 second
  // The debounced function will only be called once per second
  wait: 1000,

  // Callback function to be debounced
  callback: async () => {

    // wait for 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Increment the counter
    count++;
  },
});
```

<Callout type="warn">`call()` always waits `wait` milliseconds before running the callback, even if no other calls happen during the window.</Callout>

Related references:
- [Debounce Concept](../debounce)
- [Lock Lifecycle](../lock-lifecycle)
