import { expect, test } from "bun:test";
import type { Redis } from "@upstash/redis";
import { Lock } from "./lock";

test("a redis client is tagged with telemetry once, no matter how many locks use it", () => {
  const calls: unknown[] = [];
  const redis = {
    addTelemetry: (telemetry: unknown) => calls.push(telemetry),
  } as unknown as Redis;

  new Lock({ id: "telemetry-once-a", redis });
  new Lock({ id: "telemetry-once-b", redis });

  expect(calls.length).toBe(1);
  expect(calls[0]).toEqual({ sdk: expect.stringMatching(/^@upstash\/lock@/) });
});

test("telemetry failures never break Lock construction", () => {
  const throwing = {
    addTelemetry: () => {
      throw new Error("telemetry down");
    },
  } as unknown as Redis;
  const missing = {} as unknown as Redis;

  expect(() => new Lock({ id: "telemetry-throws", redis: throwing })).not.toThrow();
  expect(() => new Lock({ id: "telemetry-missing", redis: missing })).not.toThrow();
});
