import type { Redis } from "@upstash/redis";

export type RetryConfig = {
  /**
   * The number of times to retry acquiring the lock before giving up.
   * Default: 3.
   */
  attempts: number;

  /**
   * The amount of time to wait between retries (in ms)
   * Default: 0.1.
   */
  delay: number;
};

export type LockAcquireConfig = {
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
   * Upstash Redis client instance for locking operations.
   */
  redis: Redis;

  /**
   * Unique identifier associated with the lock.
   */
  id: string;

  /**
   * Duration (in ms) for which the lock should be held.
   */
  lease: number;

  /**
   * A unique value assigned when the lock is acquired.
   * It's set to null if the lock isn't successfully acquired.
   */
  UUID: string | null;

  /**
   * The config for retrying to acquire the lock.
   */
  retry: RetryConfig;
};

export type LockCreateConfig = {
  /**
   * Unique identifier associated with the lock.
   */
  id: string;

  /**
   * Upstash Redis client instance for locking operations.
   */
  redis: Redis;

  /**
   * Duration (in ms) for which the lock should be held.
   */
  lease?: number;

  /**
   * The config for retrying to acquire the lock.
   */
  retry?: RetryConfig;
};

export type LockStatus = "ACQUIRED" | "FREE";

export type DebounceConfig = {
  /**
   * Upstash Redis client instance for locking operations.
   */
  redis: Redis;

  /**
   * Unique identifier associated with the lock.
   */
  id: string;

  /**
   * Duration (in ms) for which to wait before executing the callback.
   */
  wait: number;

  /**
   * The callback function to execute after the wait time.
   */
  callback: (...args: any[]) => any;
};