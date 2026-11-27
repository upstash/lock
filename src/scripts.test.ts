import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { Redis } from "@upstash/redis";
import { Lock } from "./lock";
import {
  EXTEND_SCRIPT,
  RELEASE_SCRIPT,
  buildScript,
  isScriptFlagError,
  resetScriptFlagWarning,
} from "./scripts";

const SCRIPTS = [RELEASE_SCRIPT, EXTEND_SCRIPT];

/**
 * A fake Redis client which records the scripts sent with EVAL and answers 1,
 * or throws `rejectWith` for scripts starting with a shebang.
 */
const fakeRedis = (rejectWith?: string) => {
  const scripts: string[] = [];
  const redis = {
    addTelemetry: () => {},
    set: async () => "OK",
    eval: async (script: string) => {
      scripts.push(script);
      if (rejectWith && script.startsWith("#!")) {
        throw new Error(rejectWith);
      }
      return 1;
    },
  } as unknown as Redis;
  return { redis, scripts };
};

const acquireReleaseExtend = async (redis: Redis, enableUpstashScriptFlags?: boolean) => {
  const lock = new Lock({ id: "script-flags", redis, enableUpstashScriptFlags });
  await lock.acquire();
  await lock.extend(1000);
  return await lock.release();
};

describe("buildScript", () => {
  test("adds the script name and allow-key-locking flag in a shebang", () => {
    expect(buildScript(RELEASE_SCRIPT, true).split("\n")[0]).toBe(
      "#!lua script_name=lock-js-release flags=allow-key-locking",
    );
    expect(buildScript(EXTEND_SCRIPT, true).split("\n")[0]).toBe(
      "#!lua script_name=lock-js-extend flags=allow-key-locking",
    );
  });

  test("returns the bare script without flags", () => {
    for (const info of SCRIPTS) {
      expect(buildScript(info, false)).toBe(info.script);
      expect(info.script).not.toContain("#!");
    }
  });

  test("script names are unique and fit the server's 100 byte limit", () => {
    const names = SCRIPTS.map((info) => `lock-js-${info.name}`);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(name.length).toBeLessThanOrEqual(100);
    }
  });
});

test("isScriptFlagError recognizes shebang rejections", () => {
  expect(isScriptFlagError("ERR Unexpected flag in script shebang: allow-key-locking")).toBe(true);
  expect(isScriptFlagError("ERR Unknown lua shebang option: script_name")).toBe(true);
  expect(
    isScriptFlagError("ERR Error compiling script: user_script:1: unexpected symbol near '#'"),
  ).toBe(true);
  expect(isScriptFlagError("ERR Unknown metadata value: script_name=lock-js-release")).toBe(true);
  expect(isScriptFlagError("NOSCRIPT No matching script")).toBe(false);
  expect(isScriptFlagError("WRONGTYPE Operation against a key")).toBe(false);
});

describe("enableUpstashScriptFlags", () => {
  let warn: ReturnType<typeof spyOn>;
  beforeEach(() => {
    warn = spyOn(console, "warn").mockImplementation(() => {});
    resetScriptFlagWarning();
  });
  afterEach(() => {
    warn.mockRestore();
  });

  test("unset: sends the flags", async () => {
    const { redis, scripts } = fakeRedis();
    expect(await acquireReleaseExtend(redis)).toBe(true);
    expect(scripts).toEqual([buildScript(EXTEND_SCRIPT, true), buildScript(RELEASE_SCRIPT, true)]);
  });

  test("unset: falls back without the flags when the server rejects them, and remembers it", async () => {
    const { redis, scripts } = fakeRedis("ERR Unknown lua shebang option: script_name");
    expect(await acquireReleaseExtend(redis)).toBe(true);
    expect(await acquireReleaseExtend(redis)).toBe(true);
    expect(scripts).toEqual([
      buildScript(EXTEND_SCRIPT, true),
      EXTEND_SCRIPT.script,
      RELEASE_SCRIPT.script,
      EXTEND_SCRIPT.script,
      RELEASE_SCRIPT.script,
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  test("false: never sends the flags", async () => {
    const { redis, scripts } = fakeRedis("ERR Unknown lua shebang option: script_name");
    expect(await acquireReleaseExtend(redis, false)).toBe(true);
    expect(scripts).toEqual([EXTEND_SCRIPT.script, RELEASE_SCRIPT.script]);
  });

  test("true: throws when the server rejects the flags", async () => {
    const { redis } = fakeRedis("ERR Unknown lua shebang option: script_name");
    const lock = new Lock({ id: "script-flags", redis, enableUpstashScriptFlags: true });
    await lock.acquire();
    await expect(lock.extend(1000)).rejects.toThrow("shebang");
  });

  test("other errors are thrown, not retried", async () => {
    const { redis, scripts } = fakeRedis("WRONGTYPE Operation against a key");
    const lock = new Lock({ id: "script-flags", redis });
    await lock.acquire();
    await expect(lock.extend(1000)).rejects.toThrow("WRONGTYPE");
    expect(scripts.length).toBe(1);
  });
});

describe.skipIf(!process.env.UPSTASH_REDIS_REST_URL)("Upstash Redis", () => {
  test("accepts the flags, sent in a first-line shebang", async () => {
    const client = Redis.fromEnv();
    const sent: string[] = [];
    const redis = new Proxy(client, {
      get: (target, prop) =>
        prop === "eval"
          ? (script: string, keys: string[], args: unknown[]) => {
              sent.push(script);
              return target.eval(script, keys, args);
            }
          : Reflect.get(target, prop),
    });
    const lock = new Lock({
      id: `lock-flags-${crypto.randomUUID()}`,
      redis,
      enableUpstashScriptFlags: true,
    });
    expect(await lock.acquire()).toBe(true);
    expect(await lock.extend(1000)).toBe(true);
    expect(await lock.release()).toBe(true);
    expect(sent.map((script) => script.split("\n")[0])).toEqual([
      "#!lua script_name=lock-js-extend flags=allow-key-locking",
      "#!lua script_name=lock-js-release flags=allow-key-locking",
    ]);
  });
});
