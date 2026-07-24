import { Lock } from "@upstash/lock";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

export const maxDuration = 30;

// The demo holds the lock for 10s. The lease is slightly longer so the
// lock is always released by us, not by TTL expiry.
const HOLD_MS = 10_000;
const LEASE_MS = 10_500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (see .env.example)",
      },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const lockId = typeof body.lockId === "string" ? body.lockId.trim() : "";
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(lockId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid lock ID" },
      { status: 400 },
    );
  }

  const key = `upstash-lock-demo:${lockId}`;
  const redis = Redis.fromEnv();
  const lock = new Lock({
    id: key,
    lease: LEASE_MS,
    retry: { attempts: 1, delay: 0 },
    redis,
  });

  // Stream events so the client knows the moment the lock is acquired,
  // while this same request keeps holding it and releases it at the end.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(data)}\n`));
      try {
        if (await lock.acquire()) {
          // The UUID is the value the SDK stored at the key.
          // Only a prefix leaves the server; the UI never needs the full value.
          const uuid = await redis.get<string>(key);
          send({
            event: "acquired",
            key,
            uuid: uuid?.slice(0, 8),
            holdMs: HOLD_MS,
            leaseMs: LEASE_MS,
          });
          await sleep(HOLD_MS);
          const released = await lock.release();
          send({ event: "released", key, released });
        } else {
          const pttlMs = await redis.pttl(key);
          send({ event: "blocked", key, leaseMs: LEASE_MS, pttlMs: Math.max(0, pttlMs) });
        }
      } catch (err) {
        send({ event: "error", error: String(err) });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson" },
  });
}
