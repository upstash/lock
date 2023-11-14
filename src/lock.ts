import { randomUUID } from "crypto";
import type { LockAcquireConfig, LockConfig, LockCreateConfig, LockStatus } from "./types";

export class Lock {
  private readonly config: LockConfig;
  private readonly DEFAULT_LEASE_MS = 10000;
  private readonly DEFAULT_RETRY_ATTEMPTS = 3;
  private readonly DEFAULT_RETRY_DELAY_MS = 100;

  constructor(config: LockCreateConfig) {
    this.config = {
      redis: config.redis,
      id: config.id,
      status: "CREATED",
      lease: config.lease ?? this.DEFAULT_LEASE_MS,
      UUID: null, // set when lock is acquired
      retry: {
        attempts: config.retry?.attempts ?? this.DEFAULT_RETRY_ATTEMPTS,
        delay: config.retry?.delay ?? this.DEFAULT_RETRY_DELAY_MS,
      },
    };
  }

  /**
   * Tries to acquire a lock with the given configuration.
   * If successful, the `status` of the lock will be set to "ACQUIRED".
   * If unsuccessful, the method will retry based on the provided retry configuration.
   *
   * @param config - Configuration for acquiring the lock, including lease, retry attempts, and delay.
   */
  public async acquire(acquireConfig?: LockAcquireConfig) {
    // Allow for overriding the constructor lease and retry config
    const lease = acquireConfig?.lease ?? this.config.lease;
    const retryAttempts = acquireConfig?.retry?.attempts ?? this.config.retry?.attempts;
    const retryDelay = acquireConfig?.retry?.delay ?? this.config.retry?.delay;

    let attempts = 0;
    const UUID = randomUUID();
    while (attempts < retryAttempts) {
      const upstashResult = await this.config.redis.set(this.config.id, UUID, {
        nx: true,
        px: lease,
      });

      if (upstashResult === "OK") {
        this.config.status = "ACQUIRED";
        this.config.UUID = UUID;
        return;
      }

      attempts += 1;

      // Wait for the specified delay before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }

    // Lock acquisition failed
    this.config.status = "FAILED";
    this.config.lease = lease;
    this.config.UUID = null;
  }

  /**
   * Safely releases the lock ensuring the UUID matches.
   * This operation utilizes a Lua script to interact with Redis and
   * guarantees atomicity of the unlock operation.
   * @returns {Promise<boolean>} True if the lock was released, otherwise false.
   */
  public async release(): Promise<boolean> {
    const script = `
      -- Check if the current UUID still holds the lock
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
     `;

    this.config.status = "RELEASED";
    const numReleased = await this.config.redis.eval(script, [this.config.id], [this.config.UUID]);
    return numReleased === 1;
  }

  /**
   * Extends the duration for which the lock is held by a given amount of milliseconds.
   * @param amt - The number of milliseconds by which the lock duration should be extended.
   * @returns {Promise<boolean>} True if the lock duration was extended, otherwise false.
   */
  public async extend(amt: number): Promise<boolean> {
    const script = `
      -- Check if the current UUID still holds the lock
      if redis.call("get", KEYS[1]) ~= ARGV[1] then
        return 0
      end

      -- Get the current TTL and extend it by the specified amount
      local ttl = redis.call("ttl", KEYS[1])
      if ttl > 0 then
        return redis.call("expire", KEYS[1], ttl + ARGV[2])
      else
        return 0
      end
     `;

    const extendBy = amt / 1000; // convert to seconds
    const extended = await this.config.redis.eval(
      script,
      [this.config.id],
      [this.config.UUID, extendBy],
    );

    if (extended === 1) {
      this.config.lease += amt;
    }
    return extended === 1;
  }

  get status(): LockStatus {
    return this.config.status;
  }

  get id(): string {
    return this.config.id;
  }
}
