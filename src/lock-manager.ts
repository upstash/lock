import { randomUUID } from "crypto";
import { Redis } from "@upstash/redis";
import { Lock } from "./lock";
import { LockAcquireConfig } from "./types";

type LockManagerConfig = {
  /**
   * The Redis client to use for locking/unlocking.
   */
  redis: Redis;
};

export class LockManager {
  private readonly redis: Redis;
  private readonly DEFAULT_LEASE = 10;
  private readonly DEFAULT_RETRY_ATTEMPTS = 3;
  private readonly DEFAULT_RETRY_DELAY = 0.1;

  constructor(config: LockManagerConfig) {
    this.redis = config.redis;
  }

  public async acquire(config: LockAcquireConfig) {
    const lease = config.lease || this.DEFAULT_LEASE;
    const retryAttempts = config.retry?.attempts || this.DEFAULT_RETRY_ATTEMPTS;
    const retryDelay = config.retry?.delay || this.DEFAULT_RETRY_DELAY;

    let attempts = 0;
    const UUID = randomUUID();
    while (attempts < retryAttempts) {
      // TODO: Prefix?
      const upstashResult = await this.redis.set(config.id, UUID, { nx: true, ex: lease });

      if (upstashResult === "OK") {
        return new Lock({
          id: config.id,
          redis: this.redis,
          status: "ACQUIRED",
          lease,
          UUID,
        });
      }

      attempts += 1;

      // Wait for the specified delay before retrying
      const delayInSeconds = retryDelay * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayInSeconds));
    }

    // Lock failed to acquire
    return new Lock({
      id: config.id,
      redis: this.redis,
      status: "FAILED",
      lease,
      UUID: null,
    });
  }
}
