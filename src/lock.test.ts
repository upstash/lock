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
	expect(await lock.getStatus()).toBe("FREE");
	const acquired = await lock.acquire();
	expect(acquired).toBe(true);
	const extended = await lock.extend(10000);
	expect(extended).toBe(true);
	const released = await lock.release();
	expect(released).toBe(true);
	expect(await lock.getStatus()).toBe("FREE");
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
	expect(await lock.getStatus()).toBe("FREE");
	const acquired = await lock.acquire();
	expect(acquired).toBe(true);
	const extended = await lock.extend(10000);
	expect(extended).toBe(true);
	const released = await lock.release();
	expect(released).toBe(true);
	expect(await lock.getStatus()).toBe("FREE");
});

test("double lock acquisition fails", async () => {
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

	expect(await lock.acquire()).toBe(true);

	// Attempt to acquire the same lock, which should fail
	expect(await lock.acquire()).toBe(false);
});

test("lock acquisition fails by other instance", async () => {
	const uniqueId = getUniqueLockId();
	const lock = new Lock({
		id: uniqueId,
		redis: Redis.fromEnv(),
	});

	expect(await lock.acquire()).toBe(true);

	// Attempt to acquire the same lock using a different lock instance, which should fail
	const lockFail = new Lock({
		id: uniqueId,
		redis: Redis.fromEnv(),
	});

	expect(await lockFail.acquire()).toBe(false);
});

test("lock lease times out", async () => {
	const uniqueId = getUniqueLockId();
	const lock = new Lock({
		id: uniqueId,
		redis: Redis.fromEnv(),
		lease: 100,
		retry: {
			attempts: 1,
			delay: 100,
		},
	});

	expect(await lock.acquire()).toBe(true);

	// Wait for the lock to expire
	await new Promise((resolve) => setTimeout(resolve, 200));

	expect(await lock.getStatus()).toBe("FREE");
});
