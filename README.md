<div align="center">
  <h1 align="center">@upstash/lock</h1>
  <h5>Distributed Lock using Upstash Redis</h5>
</div>

<div align="center">
  <a href="https://upstash.com?ref=@upstash/lock">upstash.com</a>
</div>
<br/>


> [!NOTE]  
> **This project is a Community Project.**
>
> The project is maintained and supported by the community. Upstash may contribute but does not officially support or assume responsibility for it.



`@upstash/lock` offers a distributed lock and debounce implementation using Upstash Redis.

### Disclaimer

Please use this lock implementation for efficiency purposes; for example to avoid doing an expensive work more than once or to perform a task _mostly_ once in a best-effort manner.
Do not use it to guarantee correctness of your system; such as leader-election or for the tasks requiring _exactly_ once execution.

Upstash Redis uses async replication between replicas, and a lock can be acquired by multiple clients in case of a crash or network partition. Please read the post [How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html) by Martin Kleppman to learn more about the topic.

### Quick Start

NPM

```bash
npm install @upstash/lock
```

PNPM

```bash
pnpm add @upstash/lock
```

Bun

```bash
bun add @upstash/lock
```

### Locking Demo

To see a demo of the lock in action, visit [https://lock-upstash.vercel.app](https://lock-upstash.vercel.app)

To create the Redis instance, you can use the `Redis.fromEnv()` method to use an Upstash Redis instance from environment variables. More options can be found [here](https://github.com/upstash/upstash-redis#quick-start).

### Lock Example Usage

```typescript
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

### Debounce Example Usage

```typescript
import { Lock } from "@upstash/lock";
import { Redis } from "@upstash/redis";
import { expensiveWork } from "my-app";

const debouncedFunction = new Debounce({
  id: "unique-function-id",
  redis: Redis.fromEnv(),

  // Wait time of 1 second
  // The debounced function will only be called once per second across all instances
  wait: 1000,

  // Callback function to be debounced
  callback: (arg) => {
    doExpensiveWork(arg);
  },
});

// This example function is called by our app to trigger work we want to only happen once per wait period
async function triggerExpensiveWork(arg: string) {
  // Call the debounced function
  // This will only call the callback function once per wait period
  await debouncedFunction.call(arg)
}
```

### Lock API

#### `Lock`

```typescript
new Lock({
  id: string,
  redis: Redis, // ie. Redis.fromEnv(), new Redis({...})
  lease: number, // default: 10000 ms
  retry: {
    attempts: number, // default: 3
    delay: number, // default: 100 ms
  },
});
```

#### `Lock#acquire`

Attempts to acquire the lock. Returns `true` if the lock is acquired, `false` otherwise.

You can pass a `config` object to override the default `lease` and `retry` options.

```typescript
async acquire(config?: LockAcquireConfig): Promise<boolean>
```

#### `Lock#release`

Attempts to release the lock. Returns `true` if the lock is released, `false` otherwise.

```typescript
async release(): Promise<boolean>
```

#### `Lock#extend`

Attempts to extend the lock lease. Returns `true` if the lock lease is extended, `false` otherwise.

```typescript
async extend(amt: number): Promise<boolean>
```

#### `Lock#getStatus`

Returns whether the lock is `ACQUIRED` or `FREE`.

```typescript
async getStatus(): Promise<LockStatus>
```

| Option           | Default Value | Description                                                                       |
| ---------------- | ------------- | --------------------------------------------------------------------------------- |
| `lease`          | `10000`       | The lease duration in milliseconds. After this expires, the lock will be released |
| `retry.attempts` | `3`           | The number of attempts to acquire the lock.                                       |
| `retry.delay`    | `100`         | The delay between attempts in milliseconds.                                       |

### Debounce API

#### `Debounce`

Creates a new debounced function.

```typescript
new Debounce({
  id: string,
  redis: Redis, // ie. Redis.fromEnv(), new Redis({...})
  wait: number, // default: 1000 ms
  callback: (...arg: any[]) => any // The function to be debounced
});
```

#### `Debounce#call`

Calls the debounced function. The function will only be called once per `wait` period.
When called there is a best-effort guarantee that the function will be called once per `wait` period.

Note: Due to the implementation of the debounce, there is always a delay of `wait` milliseconds before the function is called (even if the callback is not triggered when you use the call function).

```typescript
async call(...args: any[]): Promise<void>
```
