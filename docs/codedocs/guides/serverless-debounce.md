---
title: "Debounce Serverless Events"
description: "Collapse bursts of events across instances with a distributed debounce." 
---

This guide demonstrates how to debounce repeated webhook or API calls that may arrive in bursts. The goal is to execute the expensive processing only once per quiet period, even when multiple serverless instances are involved.

**Problem**
Webhook providers sometimes retry quickly or send multiple events in a short period. Running the same expensive processing for every event wastes resources and can trigger rate limits downstream.

**Solution**
Use the distributed debounce utility so only the last event in a time window triggers the callback. The callback receives the last call’s arguments.

<Steps>
<Step>
### Create a debounced handler
```typescript filename="debounce-handler.ts"
import { Debounce } from "@upstash/lock";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export function createDebouncedHandler() {
  return new Debounce({
    id: "webhooks:ingest",
    redis,
    wait: 2000,
    callback: async (payload: { id: string; type: string }) => {
      await ingestWebhook(payload);
    },
  });
}
```
</Step>
<Step>
### Use it in an API route
```typescript filename="route.ts"
import { createDebouncedHandler } from "./debounce-handler";

const debounced = createDebouncedHandler();

export async function POST(req: Request) {
  const payload = await req.json();

  await debounced.call(payload);
  return new Response("accepted", { status: 202 });
}
```
</Step>
<Step>
### Tune the debounce window
```typescript filename="debounce-config.ts"
import { Debounce } from "@upstash/lock";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Longer wait reduces duplicate work but increases latency
export const debounced = new Debounce({
  id: "webhooks:ingest",
  redis,
  wait: 5_000,
  callback: async (payload: { id: string; type: string }) => {
    await ingestWebhook(payload);
  },
});
```
</Step>
</Steps>

**Complete runnable example**
```typescript filename="server.ts"
import { Debounce } from "@upstash/lock";
import { Redis } from "@upstash/redis";
import { serve } from "bun";

const redis = Redis.fromEnv();
const debounced = new Debounce({
  id: "events:burst",
  redis,
  wait: 1500,
  callback: async (payload: any) => {
    console.log("processing", payload.id);
  },
});

serve({
  port: 3000,
  async fetch(req) {
    if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
    const payload = await req.json();
    await debounced.call(payload);
    return new Response("queued", { status: 202 });
  },
});
```

This approach keeps your handler fast and reduces redundant work. Use a key that scopes the debounce window appropriately; if you need per-user debouncing, include the user ID in the key.
