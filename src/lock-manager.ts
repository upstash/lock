import { randomUUID } from "crypto";
import { Redis } from "@upstash/redis";
import { Lock } from "./lock";
import type { LockAcquireConfig, LockManagerConfig } from "./types";

export class LockManager {
  private readonly redises: Redis[];
  private readonly DEFAULT_LEASE_MS = 10000;
  private readonly DEFAULT_RETRY_ATTEMPTS = 3;
  private readonly DEFAULT_RETRY_DELAY_MS = 100;

  constructor(config: LockManagerConfig) {
    this.redises = config.redises;
  }

  /**
   * Tries to acquire a lock with the given configuration.
   * If unsuccessful, the method will retry based on the provided retry configuration.
   *
   * @param config - Configuration for acquiring the lock, including lease, retry attempts, and delay.
   * @returns {Promise<Lock>} A lock object indicating if the lock was acquired or failed.
   */
  public async acquire(config: LockAcquireConfig): Promise<Lock> {
    const lease = config.lease || this.DEFAULT_LEASE_MS;
    const retryAttempts = config.retry?.attempts || this.DEFAULT_RETRY_ATTEMPTS;
    const retryDelay = config.retry?.delay || this.DEFAULT_RETRY_DELAY_MS;

    let attempts = 0;
    const UUID = randomUUID();

    while (attempts < retryAttempts) {
      const results = await Promise.all(
        this.redises.map((redis) => redis.set(config.id, UUID, { nx: true, px: lease })),
      );

      const successfulLocks = results.filter((res) => res === "OK").length;

      if (successfulLocks > this.redises.length / 2) {
        // Lock acquired on majority of instances
        return new Lock({
          id: config.id,
          redis: this.redises,
          status: "ACQUIRED",
          lease,
          UUID,
        });
      } else {
        // Release any locks that were acquired
        await Promise.all(this.redises.map((redis) => redis.del(config.id)));
      }

      attempts += 1;

      // Wait for the specified delay before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }

    // Lock acquisition failed
    return new Lock({
      id: config.id,
      redis: this.redises,
      status: "FAILED",
      lease,
      UUID: null,
    });
  }
}
