<div align="center">
  <h1 align="center">@upstash/lock</h1>
  <h5>Distributed Lock using Upstash Redis</h5>
</div>

<div align="center">
  <a href="https://upstash.com?ref=@upstash/lock">upstash.com</a>
</div>
<br/>

[![Tests](https://github.com/upstash/ratelimit/actions/workflows/tests.yaml/badge.svg)](https://github.com/upstash/lock/actions/workflows/tests.yaml)

`@upstash/lock` offers a distributed lock implementation using Upstash Redis.

### Example Usage

```typescript
import { LockManager } from '@upstash/lock';
import { Redis } from "@upstash/redis";

const lockManager = new LockManager({
  redis: Redis.fromEnv(),
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
- [ ] Versioning (src/version.ts) (scripts/set-version.js) and package.json version
- [ ] Tests
- [ ] Github Actions
- [ ] Examples
- [ ] Documentation
