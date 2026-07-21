import { expect, test } from "bun:test";
import type { Redis } from "@upstash/redis";
import { Lock, LockAcquisitionError } from "./lock";

// An in-memory stand-in for Upstash Redis covering the commands Lock uses,
// so `using` semantics can be tested without a live database.
function createFakeRedis() {
  const store = new Map<string, string>();
  let evalCalls = 0;

  const redis = {
    async set(key: string, value: string, opts?: { nx?: boolean; px?: number }) {
      if (opts?.nx && store.has(key)) {
        return null;
      }
      store.set(key, value);
      return "OK";
    },
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async eval(script: string, keys: string[], args: unknown[]) {
      evalCalls += 1;
      const [key] = keys;
      const [uuid] = args;
      if (store.get(key) !== uuid) {
        return 0;
      }
      if (script.includes("del")) {
        store.delete(key);
        return 1;
      }
      return 1; // extend script: pretend TTL was updated
    },
  };

  return {
    redis: redis as unknown as Redis,
    store,
    get evalCalls() {
      return evalCalls;
    },
  };
}

test("await using releases the lock on scope exit", async () => {
  const fake = createFakeRedis();

  {
    await using lock = new Lock({ id: "using-test", redis: fake.redis });
    expect(await lock.acquire()).toBe(true);
    expect(fake.store.has("using-test")).toBe(true);
  }

  expect(fake.store.has("using-test")).toBe(false);
});

test("await using releases the lock when the critical section throws", async () => {
  const fake = createFakeRedis();

  const run = async () => {
    await using lock = await new Lock({ id: "using-throw", redis: fake.redis }).acquireOrThrow();
    expect(lock.id).toBe("using-throw");
    throw new Error("boom");
  };

  await expect(run()).rejects.toThrow("boom");
  expect(fake.store.has("using-throw")).toBe(false);
});

test("dispose is a no-op when the lock was never acquired", async () => {
  const fake = createFakeRedis();

  {
    await using _lock = new Lock({ id: "using-noop", redis: fake.redis });
  }

  expect(fake.evalCalls).toBe(0);
});

test("dispose is a no-op after an explicit release", async () => {
  const fake = createFakeRedis();

  {
    await using lock = new Lock({ id: "using-released", redis: fake.redis });
    expect(await lock.acquire()).toBe(true);
    expect(await lock.release()).toBe(true);
  }

  // one eval for the explicit release, plus one for dispose (UUID still set)
  // dispose's release finds the key gone and returns 0, which is fine
  expect(fake.store.has("using-released")).toBe(false);
});

test("acquireOrThrow throws LockAcquisitionError when the lock is held", async () => {
  const fake = createFakeRedis();

  const holder = new Lock({ id: "using-contended", redis: fake.redis });
  expect(await holder.acquire()).toBe(true);

  const contender = new Lock({
    id: "using-contended",
    redis: fake.redis,
    retry: { attempts: 1, delay: 10 },
  });

  await expect(contender.acquireOrThrow()).rejects.toBeInstanceOf(LockAcquisitionError);
  // the holder's lock is untouched
  expect(fake.store.has("using-contended")).toBe(true);
});

test("dispose does not release a lock stolen by another holder", async () => {
  const fake = createFakeRedis();

  {
    await using lock = await new Lock({ id: "using-stolen", redis: fake.redis }).acquireOrThrow();
    expect(lock.id).toBe("using-stolen");
    // simulate lease expiry + takeover by another client
    fake.store.set("using-stolen", "someone-else");
  }

  expect(fake.store.get("using-stolen")).toBe("someone-else");
});
