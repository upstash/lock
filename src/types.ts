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

export type LockStatus = "ACQUIRED" | "RELEASED" | "FAILED";
