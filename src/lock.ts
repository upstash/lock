import type { LockConfig, LockStatus } from "./types";

export class Lock {
  private readonly config: LockConfig;

  constructor(config: LockConfig) {
    this.config = config;
  }

  public async release(): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
     `;

    // We must release the lock on all Redis instances
    const results = (await Promise.all(
      this.config.redis.map((redis) => redis.eval(script, [this.config.id], [this.config.UUID])),
    )) as number[];

    // All instances must return 1 for the lock to be considered released
    const releaseSuccess = results.every((res) => res === 1);
    if (releaseSuccess) {
      this.config.status = "RELEASED";
    }

    return releaseSuccess;
  }

  public async extend(amt: number): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) ~= ARGV[1] then
        return 0
      end

      local ttl = redis.call("ttl", KEYS[1])
      if ttl > 0 then
        return redis.call("expire", KEYS[1], ttl + ARGV[2])
      else
        return 0
      end
     `;

    const extendBy = amt / 1000;

    // We must extend the lock on all Redis instances
    const results = await Promise.all(
      this.config.redis.map((redis) =>
        redis.eval(script, [this.config.id], [this.config.UUID, extendBy]),
      ),
    );

    // If extended on all instances, update the lease
    if (results.every((res) => res === 1)) {
      this.config.lease += amt;
    }

    return results.every((res) => res === 1);
  }

  get status(): LockStatus {
    return this.config.status;
  }

  get id(): string {
    return this.config.id;
  }
}
