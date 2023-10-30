import { Redis } from "@upstash/redis";
import { LockStatus } from "./types";

type LockConfig = {
  /**
   * The Redis client to use for locking/unlocking.
   */
  redis: Redis;

  /**
   * The identifier for the lock.
   */
  id: string;

  /**
   * The status of the lock.
   */
  status: LockStatus;

  /**
   * The amount of time to hold the lock for.
   */
  lease: number;

  /**
   * Unique value for the lock, null if the lock was not acquired.
   */
  UUID: string | null;
};

export class Lock {
  private readonly config: LockConfig;

  constructor(config: LockConfig) {
    this.config = config;
  }

  /**
   * Releases the lock.
   */
  public async release() {
    // We need to use a Lua script to ensure that we only delete the lock if the UUID matches.
    // More info: https://redis.io/docs/manual/patterns/distributed-locks/
    const script = `
			if redis.call("get", KEYS[1]) == ARGV[1] then
				return redis.call("del", KEYS[1])
			else
				return 0
			end
		 `;

    this.config.status = "RELEASED";
    await this.config.redis.eval(script, [this.config.id], [this.config.UUID]);
  }

  get status() {
    return this.config.status;
  }

  get id() {
    return this.config.id;
  }
}
