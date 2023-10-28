<div align="center">
    <h1 align="center">@upstash/query</h1>
    <h5>Distributed Lock using Upstash Redis</h5>
</div>

<div align="center">
  <a href="https://upstash.com?ref=@upstash/lock">upstash.com</a>
</div>
<br/>

`@upstash/lock` offers a distributed lock implementation using Upstash Redis.

### Example Usage

```typescript
import { LockManager } from '@upstash/lock';
import type { Lock } from '@upstash/lock';
import { Redis } from "@upstash/redis";

const lockManager = new LockManager({
	redis: Redis.fromEnv(),
})

const lock: Lock = await lockManager.acquire({
	id: "unique-lock-id",
	lease: 5, // seconds
	retry: {
		attempts: 5,
		delay: 2, // seconds
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
- [ ] LockManager default options
- [ ] Versioning (src/version.ts) (scripts/set-version.js) and package.json version
- [ ] Tests
- [ ] Github Actions
- [ ] Examples
- [ ] Documentation
