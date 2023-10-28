export type RetryOptions = {
  /**
   * The number of times to retry acquiring the lock before giving up.
   */
  attempts: number;

  /**
   * The amount of time to wait between retries (in seconds)
   */
  delay: number;
};

export type LockAcquireOptions = {
  /**
   * The identifier for the lock.
   */
  id: string;

  /**
   * The amount of time to hold the lock for (in seconds).
   */
  lease: number;

  /**
   * The options for retrying to acquire the lock.
   */
  retry: RetryOptions;
};

export type LockStatus = "ACQUIRED" | "RELEASED" | "FAILED";
