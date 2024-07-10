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
   * If initially unsuccessful, the method will retry based on the provided retry configuration.
   *
   * @param config - Optional configuration for the lock acquisition to override the constructor config.
   * @returns {Promise<boolean>} True if the lock was acquired, otherwise false.
   */
  public async acquire(acquireConfig?: LockAcquireConfig): Promise<boolean> {
    // Allow for overriding the constructor lease and retry config
    const lease = acquireConfig?.lease ?? this.config.lease;
    this.config.lease = lease;
    const retryAttempts = acquireConfig?.retry?.attempts ?? this.config.retry?.attempts;
    const retryDelay = acquireConfig?.retry?.delay ?? this.config.retry?.delay;

    let attempts = 0;

    let UUID: string;
    if (acquireConfig?.uuid) {
      UUID = acquireConfig.uuid;
    } else {
      try {
        UUID = crypto.randomUUID();
      } catch (error) {
        throw new Error('No UUID provided and crypto module is not available in this environment.');
      }
    }
   
    while (attempts < retryAttempts) {
      const upstashResult = await this.config.redis.set(this.config.id, UUID, {
        nx: true,
        px: lease,
      });

      if (upstashResult === "OK") {
        this.config.UUID = UUID;
        return true;
      }

      attempts += 1;

      // Wait for the specified delay before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }

    // Lock acquisition failed
    this.config.UUID = null;
    return false;
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

  get id(): string {
    return this.config.id;
  }

  /**
   * Gets the status of the lock, ie: ACQUIRED or FREE.
   * @returns {Promise<LockStatus>} The status of the lock.
   */
  async getStatus(): Promise<LockStatus> {
    if (this.config.UUID === null) {
      return "FREE";
    }

    const UUID = await this.config.redis.get(this.config.id);
    if (UUID === this.config.UUID) {
      return "ACQUIRED";
    }

    return "FREE";
  }
}
