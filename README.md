<div align="center">
  <h1 align="center">@upstash/lock</h1>
  <h5>Distributed Lock using Upstash Redis</h5>
</div>

<div align="center">
  <a href="https://upstash.com?ref=@upstash/lock">upstash.com</a>
</div>
<br/>

`@upstash/lock` offers a distributed lock implementation using multiple instances of Upstash Redis, adhering to the RedLock algorithm.

### Example Usage

```typescript
import { LockManager } from '@upstash/lock';
import { Redis } from "@upstash/redis";

const redisInstances = [
  Redis.fromEnv("REDIS_INSTANCE_1"),
  Redis.fromEnv("REDIS_INSTANCE_2"),
  // ... any additional instances
];

const lockManager = new LockManager({
  redises: redisInstances,
})

const lock = await lockManager.acquire({
  id: "unique-lock-id",
  lease: 5000, // milliseconds, default: 10000
  retry: {
   attempts: 5, // default: 3
   delay: 200, // milliseconds, default: 100
  },
});

if (lock.status === "ACQUIRED") {
  performCriticalSection();
  const isReleased = await lock.release();
  if (!isReleased) {
   // handle release failure
  }
} else {
  // handle lock acquisition failure
}
```

#### TODO

- [ ] Good default values for lease, retry attempts, and delay
- [ ] Versioning (src/version.ts) (scripts/set-version.js), GH workflow for release, and package.json version
- [ ] Examples
- [ ] Documentation
