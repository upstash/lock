import type { Redis } from "@upstash/redis";

const SCRIPT_NAME_PREFIX = "lock-js";

export type ScriptInfo = {
  /**
   * Name of the script, sent to Upstash Redis as part of the `script_name`
   * flag (see `buildScript`).
   */
  name: string;
  /**
   * The lua script without any shebang line.
   */
  script: string;
};

export const RELEASE_SCRIPT: ScriptInfo = {
  name: "release",
  script: `
      -- Check if the current UUID still holds the lock
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
     `,
};

export const EXTEND_SCRIPT: ScriptInfo = {
  name: "extend",
  script: `
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
     `,
};

/**
 * Returns the script to send to Redis.
 *
 * With `withFlags`, the script starts with a shebang carrying two flags which
 * only Upstash Redis understands:
 * - `script_name`: names the script in Upstash's script metrics, for example
 *   `lock-js-release`
 * - `flags=allow-key-locking`: lets scripts for different keys run in
 *   parallel. Both lock scripts only touch the key passed in KEYS.
 */
export const buildScript = (info: ScriptInfo, withFlags: boolean): string => {
  if (!withFlags) {
    return info.script;
  }
  return `#!lua script_name=${SCRIPT_NAME_PREFIX}-${info.name} flags=allow-key-locking\n${info.script}`;
};

/**
 * Redis clients whose server rejected the Upstash flags. Scripts are sent
 * without them from then on.
 */
const flagsRejected = new WeakSet<object>();
let warned = false;

/**
 * Errors which mean the server doesn't accept the Upstash flags in the shebang:
 * - Redis 7+ and Valkey: `Unexpected flag in script shebang: allow-key-locking`
 *   or `Unknown lua shebang option: script_name`
 * - Redis 6 and older, which don't know shebangs: a lua syntax error near `#`
 * - Upstash Redis servers which predate `script_name`:
 *   `Unknown metadata value: script_name=...`
 */
export const isScriptFlagError = (error: unknown): boolean => {
  const message = `${error}`;
  return (
    /shebang/i.test(message) ||
    message.includes("near '#'") ||
    message.includes("Unknown metadata value")
  );
};

/** Lets the next rejection warn again. For tests only; not exported from the package. */
export const resetScriptFlagWarning = () => {
  warned = false;
};

const warnFlagsRejected = () => {
  if (warned) {
    return;
  }
  warned = true;
  console.warn(
    "[Upstash Lock] Your Redis database doesn't support the flags the scripts are sent " +
      "with to improve performance, so the scripts are sent without them. Set " +
      "`enableUpstashScriptFlags: false` in the Lock config to send the scripts without " +
      "the flags from the start and to hide this warning.",
  );
};

/**
 * Runs the script on Redis.
 *
 * Unless `enableUpstashScriptFlags` is false, the script is sent with the
 * Upstash flags (see `buildScript`). If the user left
 * `enableUpstashScriptFlags` unset and the server rejects the flags, the
 * script is run again without them, a warning is printed once, and the flags
 * are left off for that client from then on.
 */
export const evalScript = async (
  redis: Redis,
  enableUpstashScriptFlags: boolean | undefined,
  info: ScriptInfo,
  keys: string[],
  args: unknown[],
): Promise<unknown> => {
  // Set: the option decides. Unset: the flags, unless this client rejected them before.
  const withFlags = enableUpstashScriptFlags ?? !flagsRejected.has(redis);
  if (!withFlags) {
    return await redis.eval(info.script, keys, args);
  }
  try {
    return await redis.eval(buildScript(info, true), keys, args);
  } catch (error) {
    if (enableUpstashScriptFlags === undefined && isScriptFlagError(error)) {
      flagsRejected.add(redis);
      warnFlagsRejected();
      return await redis.eval(info.script, keys, args);
    }
    throw error;
  }
};
