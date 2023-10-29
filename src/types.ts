export type RetryOptions = {
  /**
   * The number of times to retry acquiring the lock before giving up.
	 * Default: 3.
   */
  attempts: number;

  /**
   * The amount of time to wait between retries (in seconds)
	 * Default: 0.1.
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
	 * Defaults to 10 seconds.
   */
  lease?: number;

  /**
   * The options for retrying to acquire the lock.
   */
  retry?: RetryOptions;
};

export type LockStatus = "ACQUIRED" | "RELEASED" | "FAILED";
