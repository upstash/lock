/**
 * Lock against a Redis server other than Upstash, reached over REST (for example
 * Redis or Valkey behind serverless-redis-http). Runs only when NON_UPSTASH_REDIS_REST_URL /
 * _TOKEN are set; not part of CI.
 */
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { Redis } from "@upstash/redis";
import { Lock } from "./lock";
import { EXTEND_SCRIPT, RELEASE_SCRIPT, buildScript } from "./scripts";

const url = process.env.NON_UPSTASH_REDIS_REST_URL;
const token = process.env.NON_UPSTASH_REDIS_REST_TOKEN;

/** A fresh client to the server, recording the script of every EVAL sent through it. */
const recordingClient = () => {
  const client = new Redis({ url: url ?? "", token: token ?? "" });
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
  return { redis, sent };
};

const id = () => `lock-non-upstash-${crypto.randomUUID()}`;

describe.skipIf(!url || !token)("Lock on a Redis other than Upstash", () => {
  let warn: ReturnType<typeof spyOn>;
  beforeEach(() => {
    warn = spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
  });

  test("unset: sends the flags once, then runs without them", async () => {
    const { redis, sent } = recordingClient();
    const lock = new Lock({ id: id(), redis });
    expect(await lock.acquire()).toBe(true);
    expect(await lock.extend(1000)).toBe(true);
    expect(await lock.release()).toBe(true);
    expect(sent).toEqual([
      buildScript(EXTEND_SCRIPT, true),
      EXTEND_SCRIPT.script,
      RELEASE_SCRIPT.script,
    ]);
  });

  test("false: never sends the flags", async () => {
    const { redis, sent } = recordingClient();
    const lock = new Lock({ id: id(), redis, enableUpstashScriptFlags: false });
    expect(await lock.acquire()).toBe(true);
    expect(await lock.release()).toBe(true);
    expect(sent).toEqual([RELEASE_SCRIPT.script]);
  });

  test("true: throws the server's rejection, even on a client that fell back before", async () => {
    const { redis } = recordingClient();
    const fallback = new Lock({ id: id(), redis });
    await fallback.acquire();
    await fallback.release(); // falls back for this client
    const strict = new Lock({ id: id(), redis, enableUpstashScriptFlags: true });
    await strict.acquire();
    await expect(strict.release()).rejects.toThrow(/shebang|near '#'/);
  });
});
