import type { Redis } from "@upstash/redis";

export type LockManagerConfig = {
  /**
   * Array of Upstash Redis client instances used for locking operations.
   */
  redises: Redis[];
};

export type RetryConfig = {
  /**
   * The number of times to retry acquiring the lock before giving up.
   * Default: 3.
   */
  attempts?: number;

  /**
   * The amount of time to wait between retries (in ms)
   * Default: 0.1.
   */
  delay?: number;
};

export type LockAcquireConfig = {
  /**
   * The identifier for the lock.
   */
  id: string;

  /**
   * The amount of time to hold the lock for (in ms).
   * Default: 10000 ms.
   */
  lease?: number;

  /**
   * The config for retrying to acquire the lock.
   */
  retry?: RetryConfig;
};

export type LockConfig = {
  /**
   * Array of Upstash Redis client instances for locking operations.
   */
  redis: Redis[];

  /**
   * Unique identifier associated with the lock.
   */
  id: string;

  /**
   * Current status of the lock (e.g., ACQUIRED, RELEASED).
   */
  status: LockStatus;

  /**
   * The Redis instances on which the lock was acquired.
   */
  acquiredInstances: Redis[];

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

export type LockStatus = "ACQUIRED" | "RELEASED" | "FAILED";
