<div align="center">
  <h1 align="center">@upstash/lock</h1>
  <h5>Distributed Lock using Upstash Redis</h5>
</div>

<div align="center">
  <a href="https://upstash.com?ref=@upstash/lock">upstash.com</a>
</div>
<br/>

`@upstash/lock` offers a distributed lock implementation using Upstash Redis.

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

To create the Redis instance, you can use the `Redis.fromEnv()` method to use an Upstash Redis instance from environment variables. More options can be found [here](https://github.com/upstash/upstash-redis#quick-start).

### Example Usage

```typescript
import { Lock } from '@upstash/lock';
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

### API

#### `Lock`

```typescript
new Lock({
  id: string,
  redis: Redis, // ie. Redis.fromEnv(), new Redis({...})
  lease?: number, // default: 10000 ms
  retry?: {
    attempts?: number, // default: 3
    delay?: number, // default: 100 ms
  },
})
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

| Option           | Default Value | Description                                                 |
|------------------|---------------|-------------------------------------------------------------|
| `lease`          | `10000`       | The lease duration in milliseconds. After this expires, the lock will be released |
| `retry.attempts` | `3`           | The number of attempts to acquire the lock.                |
| `retry.delay`    | `100`         | The delay between attempts in milliseconds.                 |
