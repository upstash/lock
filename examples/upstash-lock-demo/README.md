# Upstash Lock Demo

A minimal Next.js app showing [`@upstash/lock`](https://github.com/upstash/lock). One button holds a distributed lock for 10 seconds. Open a second tab and try to take it while it is held and you are turned away. Every Redis command the SDK runs shows up in a live transcript.

Hosted on Vercel: [https://lock-upstash.vercel.app](https://lock-upstash.vercel.app)

## Run locally

1. Create a Redis database at [console.upstash.com](https://console.upstash.com) and copy the REST URL and token into `.env`:

   ```bash
   cp .env.example .env
   ```

2. Install and start:

   ```bash
   bun install
   bun dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in two tabs and race them.

## How it works

The whole demo is one API route, [`app/api/hold/route.ts`](app/api/hold/route.ts). It streams events so the page updates the moment the lock is acquired, while the same request keeps holding it and releases it at the end:

```ts
const lock = new Lock({
  id: key,
  lease: LEASE_MS,
  retry: { attempts: 1, delay: 0 },
  redis: Redis.fromEnv(),
});

if (await lock.acquire()) {
  await doWork(); // critical section
  await lock.release();
} else {
  // someone else holds the lock
}
```

- Acquire runs `SET key uuid NX PX lease`, which only succeeds if the key is free.
- The lease is a TTL. If the holder crashes, Redis expires the lock on its own.
- Release runs a Lua script that deletes the key only if it still holds this run's UUID.
