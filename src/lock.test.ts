import { expect, test } from "bun:test";
import { Redis } from "@upstash/redis";
import { LockManager } from "./lock-manager";

function getUniqueLockId() {
  return `lock-test-${Math.random().toString(36).substr(2, 9)}`;
}

// Assuming you have multiple Redis instances set up
const redisInstances = [
  Redis.fromEnv(),
  // Redis.fromEnv("REDIS_INSTANCE_2"),
  // ... any additional instances you wish to use for tests
];

test("lock created, extended, and released with defaults", async () => {
  const lm = new LockManager({
    redises: redisInstances,
  });
  const id = getUniqueLockId();
  const lock = await lm.acquire({ id });

  expect(lock.id).toBe(id);
  expect(lock.status).toBe("ACQUIRED");
  const extended = await lock.extend(10000);
  expect(extended).toBe(true);
  const released = await lock.release();
  expect(released).toBe(true);
  expect(lock.status).toBe("RELEASED");
});

test("lock created, extended, and released with values", async () => {
  const lm = new LockManager({
    redises: redisInstances,
  });

  const id = getUniqueLockId();
  const lock = await lm.acquire({
    id,
    lease: 5000,
    retry: {
      attempts: 1,
      delay: 100,
    },
  });

  expect(lock.id).toBe(id);
  expect(lock.status).toBe("ACQUIRED");
  const extended = await lock.extend(10000);
  expect(extended).toBe(true);
  const released = await lock.release();
  expect(released).toBe(true);
  expect(lock.status).toBe("RELEASED");
});

test("lock acquisition fails", async () => {
  const lm = new LockManager({
    redises: redisInstances,
  });

  const id = getUniqueLockId();
  const lockSuccess = await lm.acquire({
    id,
    lease: 5000,
    retry: {
      attempts: 1,
      delay: 100,
    },
  });

  expect(lockSuccess.status).toBe("ACQUIRED");

  // Since the lock was already acquired, this should fail
  const lockFail = await lm.acquire({
    id,
    retry: {
      attempts: 1,
      delay: 100,
    },
  });

  expect(lockFail.status).toBe("FAILED");
});

test("lock lease times out", async () => {
  const lm = new LockManager({
    redises: redisInstances,
  });

  const lock = await lm.acquire({
    id: "lock-test-3",
    lease: 100,
    retry: {
      attempts: 1,
      delay: 100,
    },
  });

  // Wait for the lock to expire
  setTimeout(async () => {
    expect(lock.status).toBe("RELEASED");
  }, 200);
});
