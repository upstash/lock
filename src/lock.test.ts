import { expect, test } from "bun:test";
import { Redis } from "@upstash/redis";
import { Lock } from "./lock";

function getUniqueLockId() {
  return `lock-test-${Math.random().toString(36).substr(2, 9)}`;
}

test("lock created, extended, and released with defaults", async () => {
  const uniqueId = getUniqueLockId();
  const lock = new Lock({
    id: uniqueId,
    redis: Redis.fromEnv(),
  });

  expect(lock.id).toBe(uniqueId);
  expect(lock.status).toBe("CREATED");
  await lock.acquire();
  expect(lock.status).toBe("ACQUIRED");
  const extended = await lock.extend(10000);
  expect(extended).toBe(true);
  const released = await lock.release();
  expect(released).toBe(true);
  expect(lock.status).toBe("RELEASED");
});

test("lock created, extended, and released with values", async () => {
  const uniqueId = getUniqueLockId();
  const lock = new Lock({
    id: uniqueId,
    redis: Redis.fromEnv(),
    lease: 5000,
    retry: {
      attempts: 1,
      delay: 100,
    },
  });

  expect(lock.id).toBe(uniqueId);
  expect(lock.status).toBe("CREATED");
  await lock.acquire();
  expect(lock.status).toBe("ACQUIRED");
  const extended = await lock.extend(10000);
  expect(extended).toBe(true);
  const released = await lock.release();
  expect(released).toBe(true);
  expect(lock.status).toBe("RELEASED");
});

test("lock acquisition fails", async () => {
  const uniqueId = getUniqueLockId();
  const lock = new Lock({
    id: uniqueId,
    redis: Redis.fromEnv(),
    lease: 5000,
    retry: {
      attempts: 1,
      delay: 100,
    },
  });

  await lock.acquire();
  expect(lock.status).toBe("ACQUIRED");

  // Attempt to acquire the same lock, which should fail
  const lockFail = new Lock({
    id: uniqueId,
    redis: Redis.fromEnv(),
    retry: {
      attempts: 1,
      delay: 100,
    },
  });
  await lockFail.acquire();
  expect(lockFail.status).toBe("FAILED");
});

test("lock lease times out", async () => {
  const lock = new Lock({
    id: "lock-test-3",
    redis: Redis.fromEnv(),
    lease: 100,
    retry: {
      attempts: 1,
      delay: 100,
    },
  });

  await lock.acquire();
  expect(lock.status).toBe("ACQUIRED");

  // Wait for the lock to expire
  await new Promise((resolve) => setTimeout(resolve, 200));
});
