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

async function handleCriticalSection() {
  const uniqueLockId = "unique-lock-id";
  const lock = new Lock({
    id: uniqueLockId,
    redis: redisInstance,
    lease: 5000, // milliseconds, default: 10000
    retry: {
      attempts: 5, // default: 3
      delay: 200, // milliseconds, default: 100
    },
  });

  await lock.acquire();
  if (lock.status === "ACQUIRED") {
    performCriticalSection();
    const isReleased = await lock.release();
    if (!isReleased) {
      // handle release failure
    }
  } else {
    // handle lock acquisition failure
  }
}

handleCriticalSection();

```

#### TODO

- [ ] Versioning (src/version.ts) (scripts/set-version.js) and package.json version
- [ ] Examples
- [ ] Documentation
- [ ] Should expired locks be set to RELEASED state? This means we need to check the lock status inside of status.
