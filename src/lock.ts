import { Redis } from "@upstash/redis";
import { LockStatus } from "./types";

type LockOptions = {
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
  private readonly options: LockOptions;
  private _status: LockStatus;
  private _id: string;

  constructor(options: LockOptions) {
    this.options = options;
    this._status = options.status;
    this._id = options.id;
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

    this._status = "RELEASED";
		// TODO: Should this return something?
    await this.options.redis.eval(script, [this.options.id], [this.options.UUID]);
  }

  get status() {
    return this._status;
  }

  get id() {
    return this._id;
  }
}