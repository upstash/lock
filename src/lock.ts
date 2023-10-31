import { Redis } from "@upstash/redis";
import { LockStatus } from "./types";

type LockConfig = {
  /**
   * Upstash Redis client instance for locking operations.
   */
  redis: Redis;

  /**
   * Unique identifier associated with the lock.
   */
  id: string;

  /**
   * Current status of the lock (e.g., ACQUIRED, RELEASED).
   */
  status: LockStatus;

  /**
   * Duration (in ms) for which the lock should be held.
   */
  lease: number;

  /**
   * A unique value assigned when the lock is acquired.
   * It's set to null if the lock isn't successfully acquired.
   */
  UUID: string | null;
};

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
    return extended === 1;
  }

  get status(): LockStatus {
    return this.config.status;
  }

  get id(): string {
    return this.config.id;
  }
}
