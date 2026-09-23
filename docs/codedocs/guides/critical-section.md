---
title: "Protect a Critical Section"
description: "Use a lock to ensure an expensive task runs once across multiple instances."
---

This guide shows how to guard a critical section so only one instance performs the work at a time. The example uses a background job that may be triggered by multiple servers, but must run at most once per minute.

**Problem**
Multiple workers may run the same job concurrently, doubling cost and causing conflicting updates.

**Solution**
Use a Redis-backed lock with a lease and a safe release sequence to ensure only one worker proceeds.

<Steps>
<Step>
### Initialize Redis and the lock
```typescript filename="job-lock.ts"
import { Lock } from "@upstash/lock";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export function createJobLock(jobName: string) {
  return new Lock({
    id: `jobs:${jobName}`,
    redis,
    lease: 20_000,
    retry: { attempts: 4, delay: 250 },
  });
}
```
</Step>
<Step>
### Acquire the lock before doing work
```typescript filename="run-job.ts"
import { createJobLock } from "./job-lock";

export async function runJobOnce() {
  const lock = createJobLock("daily-report");
  const acquired = await lock.acquire();

  if (!acquired) {
    return { ok: false, reason: "busy" };
  }

  try {
    await generateReport();
    return { ok: true };
  } finally {
    await lock.release();
  }
}
```
</Step>
<Step>
### Extend the lock for long tasks
```typescript filename="run-job-extend.ts"
import { createJobLock } from "./job-lock";

export async function runLongJob() {
  const lock = createJobLock("daily-report");
  const acquired = await lock.acquire();
  if (!acquired) return;

  try {
    const extendInterval = setInterval(async () => {
      await lock.extend(10_000);
    }, 5_000);

    await generateLargeReport();
    clearInterval(extendInterval);
  } finally {
    await lock.release();
  }
}
```
</Step>
</Steps>

**Complete runnable example**
```typescript filename="cli.ts"
import { Lock } from "@upstash/lock";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

async function main() {
  const lock = new Lock({ id: "jobs:daily-report", redis, lease: 15_000 });

  if (!(await lock.acquire())) {
    console.log("busy");
    return;
  }

  try {
    console.log("running");
    await new Promise((r) => setTimeout(r, 1000));
  } finally {
    await lock.release();
    console.log("done");
  }
}

main();
```

This pattern makes the job resilient to concurrency without building a full queueing system. Use unique, stable lock IDs and always release in a `finally` block. If your tasks are long-running, use periodic `extend()` calls to keep the lease alive and reduce the chance of overlapping runs.
