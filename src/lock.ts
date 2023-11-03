import { EXTEND_SCRIPT, RELEASE_SCRIPT } from "./redis-scripts";
import type { LockConfig, LockStatus } from "./types";

export class Lock {
  private readonly config: LockConfig;

  constructor(config: LockConfig) {
    this.config = config;
  }

  /**
   * Safely releases the lock ensuring the UUID matches.
   * This operation utilizes a Lua script to interact with Redis and
   * guarantees atomicity of the unlock operation.
   * @returns {Promise<boolean>} True if the lock was released, otherwise false.
   */
  public async release(): Promise<boolean> {
    // We must release the lock on all Redis instances that the lock was acquired on
    const results = (await Promise.all(
      this.config.acquiredInstances.map((redis) =>
        redis.eval(RELEASE_SCRIPT, [this.config.id], [this.config.UUID]),
      ),
    )) as number[];

    // All instances must return 1 for the lock to be considered released
    const releaseSuccess = results.every((res) => res === 1);
    if (releaseSuccess) {
      this.config.status = "RELEASED";
    }

    return releaseSuccess;
  }

  /**
   * Extends the duration for which the lock is held by a given amount of milliseconds.
   * @param amt - The number of milliseconds by which the lock duration should be extended.
   * @returns {Promise<boolean>} True if the lock duration was extended, otherwise false.
   */
  public async extend(amt: number): Promise<boolean> {
    const extendBy = amt / 1000;

    // We must extend the lock on all Redis instances that the lock was acquired on
    const results = await Promise.all(
      this.config.acquiredInstances.map((redis) =>
        redis.eval(EXTEND_SCRIPT, [this.config.id], [this.config.UUID, extendBy]),
      ),
    );

    // If extended on all instances, update the lease
    if (results.every((res) => res === 1)) {
      this.config.lease += amt;
    }

    return results.every((res) => res === 1);
  }

  get status(): LockStatus {
    return this.config.status;
  }

  get id(): string {
    return this.config.id;
  }
}
