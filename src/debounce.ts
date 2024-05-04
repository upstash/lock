import { DebounceConfig } from "./types";

/**
 * A distributed debounce utility that ensures a function is only called once within a specified wait time.
 * Using a Redis instance, this utility can be used across multiple instances of an application
 * to debounce a function call.
 */
export class Debounce {
  private readonly config: DebounceConfig;
  private DEFAULT_WAIT_MS: number = 1000;

  constructor(config: DebounceConfig) {
    this.config = {
      redis: config.redis,
      id: config.id,
      wait: config.wait ?? this.DEFAULT_WAIT_MS,
      callback: config.callback,
    };
  }

  /**
   * Calls the callback function after the specified wait time has passed.
   * If the function is called multiple times within the wait time, the callback will only be called once.
   * This is useful for debouncing a function across multiple instances of an application.
   */
  public async call(...args: any[]): Promise<void> {
    // Increment the counter
    const thisTaskIncr = await this.config.redis.incr(this.config.id);

    // Wait for a delay
    await new Promise((resolve) => setTimeout(resolve, this.config.wait));

    // Get the current counter
    const currentTaskIncr = await this.config.redis.get(this.config.id);

    // If the counter has changed, it means another task has called the function
    // So we should not call the callback
    // We should only run the callback if the counter has not changed in the last wait time
    // This is to ensure that the callback is only called once per wait time
    if (thisTaskIncr !== currentTaskIncr) {
      return;
    }

    // We were the last task to increment the counter
    // So we can call the callback
    await this.config.callback(...args);
  }
}
