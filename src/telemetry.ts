import type { Redis } from "@upstash/redis";
import { VERSION } from "../version";

// The redis client appends the telemetry header on every addTelemetry call,
// so tag each client only once no matter how many Lock instances
// are created with it.
const taggedClients = new WeakSet<Redis>();

/**
 * Reports the sdk name and version to Upstash through the redis client's
 * telemetry headers. Respects the client's telemetry opt-out
 * (`enableTelemetry: false` or the UPSTASH_DISABLE_TELEMETRY env var).
 */
export function addTelemetry(redis: Redis) {
  if (taggedClients.has(redis)) {
    return;
  }
  taggedClients.add(redis);
  try {
    // @ts-ignore - addTelemetry is intentionally hidden from the public types
    redis.addTelemetry({ sdk: `@upstash/lock@${VERSION}` });
  } catch {
    // telemetry must never break the client
  }
}
