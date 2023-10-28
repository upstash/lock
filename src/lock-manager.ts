import { randomUUID } from "crypto";
import { Redis } from "@upstash/redis";
import { Lock } from "./lock";
import { LockAcquireOptions } from "./types";

type LockManagerConfig = {
  /**
   * The Redis client to use for locking/unlocking.
   */
  redis: Redis;
};

export class LockManager {
  private readonly redis: Redis;

  constructor(config: LockManagerConfig) {
    this.redis = config.redis;
  }

  public async acquire(options: LockAcquireOptions) {
    let attempts = 0;

    const UUID = randomUUID();
    while (attempts < options.retry.attempts) {
      // TODO: Prefix?
      const upstashResult = await this.redis.set(options.id, UUID, { nx: true, ex: options.lease });

      if (upstashResult === "OK") {
        return new Lock({
          id: options.id,
          redis: this.redis,
          status: "ACQUIRED",
          lease: options.lease,
          UUID,
        });
      }

      attempts += 1;

      // Wait for the specified delay before retrying
      const delayInSeconds = options.retry.delay * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayInSeconds));
    }

    // Lock failed to acquire
    return new Lock({
      id: options.id,
      redis: this.redis,
      status: "FAILED",
      lease: options.lease,
      UUID: null,
    });
  }
}
