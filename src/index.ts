export { LockManager } from "./lock-manager";
export { Lock } from "./lock";
export * from "./types";
// import { Redis } from "@upstash/redis";
// import { LockManager } from "./lock-manager";

// async function main() {
//   const lockManager = new LockManager({
//     redis: Redis.fromEnv(),
//   });

//   const lockId = "lock-my-lock";
//   const lock = await lockManager.acquire({
//     id: lockId,
//   });

//   if (lock.status === "ACQUIRED") {
//     console.log("Lock", lock.status);
// 		// Wait 5 seconds and release
// 		await new Promise((resolve) => setTimeout(resolve, 5000));
// 		await lock.release();
// 		console.log("Lock", lock.status);
//   } else {
//     console.log("Lock", lock.status);
//   }
// }

// main();
