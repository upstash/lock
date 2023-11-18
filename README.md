<div align="center">
  <h1 align="center">@upstash/lock</h1>
  <h5>Distributed Lock using Upstash Redis</h5>
</div>

<div align="center">
  <a href="https://upstash.com?ref=@upstash/lock">upstash.com</a>
</div>
<br/>

`@upstash/lock` offers a distributed lock implementation using Upstash Redis.

### Example Usage

```typescript
import { Lock } from '@upstash/lock';
import { Redis } from "@upstash/redis";

const redisInstance = Redis.fromEnv();

async function handleOperation() {
  const uniqueLockId = "unique-lock-id";
  const lock = new Lock({
    id: uniqueLockId,
    redis: redisInstance,
  });

  if (await lock.acquire()) {
    await performCriticalSection();
    const isReleased = await lock.release();
    if (!isReleased) {
      // handle release failure
    }
  } else {
    // handle lock acquisition failure
  }
}

handleOperation();
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

```typescript
async acquire(): Promise<boolean>
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

#### TODO

- [ ] Versioning (src/version.ts) (scripts/set-version.js) and package.json version
- [ ] Examples
- [ ] Documentation

