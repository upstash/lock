import { Redis } from "@upstash/redis";
import { LockManager } from "./lock-manager";

async function main() {
  const lockManager = new LockManager({
    redis: Redis.fromEnv(),
  });

  const lockId = "lock-my-lock";
  const lock = await lockManager.acquire({
    id: lockId,
    lease: 10,
    retry: {
      attempts: 2,
      delay: 0.2,
    },
  });

  if (lock.status === "ACQUIRED") {
    console.log("Lock", lock.status);
		// Wait 5 seconds and relase
		await new Promise((resolve) => setTimeout(resolve, 5000));
		await lock.release();
		console.log("Lock", lock.status);
  } else {
    console.log("Lock", lock.status);
  }
}

main();
