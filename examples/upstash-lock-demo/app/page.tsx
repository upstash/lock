"use client";

import { useEffect, useRef, useState } from "react";

type Attempt = {
  id: number;
  lockId: string;
  state: "pending" | "holding" | "completed" | "blocked" | "error";
  uuid?: string;
  pttlMs?: number;
  released?: boolean;
  error?: string;
};

type Phase =
  | { name: "free" }
  | { name: "mine"; until: number }
  | { name: "held"; until: number };

const STORAGE_KEY = "upstash-lock-demo:id";

const ADJECTIVES = ["calm", "swift", "brave", "quiet", "lucky", "sunny", "bold", "merry", "gentle", "clever"];
const ANIMALS = ["otter", "fox", "owl", "lynx", "seal", "crane", "finch", "hare", "wolf", "panda"];

const pick = (list: string[]) =>
  list[Math.floor(Math.random() * list.length)];

const generateLockId = () => `${pick(ADJECTIVES)}-${pick(ANIMALS)}`;

export default function Home() {
  const [lockId, setLockId] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [phase, setPhase] = useState<Phase>({ name: "free" });
  const [now, setNow] = useState(0);
  const nextId = useRef(0);

  useEffect(() => {
    let stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      stored = generateLockId();
      localStorage.setItem(STORAGE_KEY, stored);
    }
    setLockId(stored);
  }, []);

  // One ticker drives both countdowns.
  useEffect(() => {
    if (phase.name === "free") return;
    const interval = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (phase.name === "held" && t >= phase.until) {
        setPhase({ name: "free" });
      }
    }, 200);
    return () => clearInterval(interval);
  }, [phase]);

  const patch = (id: number, changes: Partial<Attempt>) => {
    setAttempts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...changes } : a)),
    );
  };

  const holdLock = async () => {
    if (phase.name === "mine") return;
    const id = ++nextId.current;
    setAttempts((prev) => [...prev, { id, lockId, state: "pending" as const }]);

    try {
      const res = await fetch("/api/hold", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lockId }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        patch(id, { state: "error", error: data.error ?? "Request failed" });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline = buffer.indexOf("\n");
        while (newline >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (line) handleEvent(id, JSON.parse(line));
          newline = buffer.indexOf("\n");
        }
      }
    } catch {
      patch(id, { state: "error", error: "Network error" });
      setPhase({ name: "free" });
    }
  };

  const handleEvent = (id: number, data: any) => {
    if (data.event === "acquired") {
      patch(id, { state: "holding", uuid: data.uuid });
      setPhase({ name: "mine", until: Date.now() + data.holdMs });
    } else if (data.event === "released") {
      patch(id, { state: "completed", released: data.released });
      setPhase({ name: "free" });
    } else if (data.event === "blocked") {
      patch(id, { state: "blocked", pttlMs: data.pttlMs });
      setPhase({ name: "held", until: Date.now() + data.pttlMs });
    } else if (data.event === "error") {
      patch(id, { state: "error", error: data.error });
      setPhase({ name: "free" });
    }
  };

  const secondsLeft =
    phase.name === "free"
      ? 0
      : Math.max(0, Math.ceil((phase.until - now) / 1000));

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 lg:py-16">
      <header className="max-w-2xl">
        <h1 className="font-mono text-3xl font-semibold tracking-tight">
          <span className="text-emerald-600">@upstash/</span>lock
        </h1>
        <p className="mt-4 leading-relaxed text-stone-600">
          The button takes a lock and holds it for 10 seconds. While it is
          held, nobody else can take it. Open this page in a second tab and
          try.
        </p>
      </header>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-2">
        {/* Demo: first on mobile, right column on desktop */}
        <div className="flex flex-col gap-8 lg:order-2">
          <section className="rounded-lg border border-stone-200 bg-white p-8 text-center shadow-sm">
            <Padlock phase={phase.name} />

            <p className="mt-4 font-mono text-lg font-semibold">
              {phase.name === "free" && "Unlocked"}
              {phase.name === "mine" && `You hold the lock · ${secondsLeft}s`}
              {phase.name === "held" && `Locked · ${secondsLeft}s`}
            </p>
            <p className="mt-1 text-sm text-stone-500">
              {phase.name === "free" && "Nobody holds the lock."}
              {phase.name === "mine" && "It releases itself when the hold ends."}
              {phase.name === "held" && "Another tab holds it right now."}
            </p>

            <button
              type="button"
              onClick={holdLock}
              disabled={phase.name === "mine" || !lockId}
              className="mt-6 w-full rounded-md bg-emerald-600 px-4 py-2.5 font-mono text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hold the lock for 10 seconds
            </button>
            <p className="mt-3 font-mono text-xs text-stone-400">
              lock id: {lockId || "…"} · shared by your tabs
            </p>
          </section>

          <section className="overflow-hidden rounded-lg border border-stone-800 bg-stone-900 shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-800 px-4 py-2">
              <span className="font-mono text-xs text-stone-400">
                redis commands
              </span>
              {attempts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAttempts([])}
                  className="font-mono text-xs text-stone-500 transition-colors hover:text-stone-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                >
                  clear
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto p-4 font-mono text-[13px] leading-6">
              {attempts.length === 0 ? (
                <p className="text-stone-500"># press the button</p>
              ) : (
                attempts.map((a) => <TranscriptEntry key={a.id} attempt={a} />)
              )}
            </div>
          </section>
        </div>

        {/* Code: below on mobile, left column on desktop */}
        <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm lg:order-1">
          <div className="border-b border-stone-200 px-4 py-2">
            <span className="font-mono text-xs text-stone-400">
              what this demo runs
            </span>
          </div>
          <CodeExample />
        </section>
      </div>

      <footer className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-stone-500">
        <a
          href="https://github.com/upstash/lock"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-stone-300 underline-offset-4 transition-colors hover:text-emerald-700"
        >
          GitHub
        </a>
        <a
          href="https://upstash.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-stone-300 underline-offset-4 transition-colors hover:text-emerald-700"
        >
          upstash.com
        </a>
        <a
          href="https://github.com/upstash/lock#disclaimer"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-stone-300 underline-offset-4 transition-colors hover:text-emerald-700"
        >
          disclaimer
        </a>
      </footer>
    </main>
  );
}

function TranscriptEntry({ attempt }: { attempt: Attempt }) {
  const { lockId, state, uuid, pttlMs, released, error } = attempt;
  const shortUuid = uuid ? `${uuid.slice(0, 4)}…` : "…";
  const setLine = `SET ${lockId} ${shortUuid} NX PX 10500`;

  return (
    <div className="mb-3 last:mb-0">
      {state === "pending" && (
        <p className="text-stone-300">
          {setLine}
          <span className="ml-1 inline-block h-3.5 w-2 animate-pulse bg-emerald-400 align-middle motion-reduce:animate-none" />
        </p>
      )}

      {state === "blocked" && (
        <p className="text-stone-300">
          {setLine} <span className="text-red-400">→ (nil)</span>{" "}
          <span className="text-red-400">
            # taken
            {pttlMs != null && pttlMs > 0
              ? `, ${Math.round(pttlMs / 1000)}s left`
              : ""}
          </span>
        </p>
      )}

      {(state === "holding" || state === "completed") && (
        <>
          <p className="text-stone-300">
            {setLine} <span className="text-emerald-400">→ OK</span>{" "}
            <span className="text-stone-500"># you hold it</span>
          </p>
          {state === "completed" && (
            <p className="text-stone-300">
              DEL {lockId}{" "}
              {released === false ? (
                <>
                  <span className="text-amber-400">→ 0</span>{" "}
                  <span className="text-amber-400"># already expired</span>
                </>
              ) : (
                <>
                  <span className="text-emerald-400">→ 1</span>{" "}
                  <span className="text-stone-500"># released</span>
                </>
              )}
            </p>
          )}
        </>
      )}

      {state === "error" && <p className="text-red-400"># error: {error}</p>}
    </div>
  );
}

function Padlock({ phase }: { phase: "free" | "mine" | "held" }) {
  const color =
    phase === "mine"
      ? "text-emerald-500"
      : phase === "held"
        ? "text-red-500"
        : "text-stone-300";
  return (
    <svg
      viewBox="0 0 32 32"
      className={`mx-auto h-16 w-16 transition-colors ${color}`}
      aria-hidden="true"
    >
      {phase === "free" ? (
        <path
          d="M21 13V8a5 5 0 0 0-10 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M11 15v-5a5 5 0 0 1 10 0v5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      <rect x="6" y="14" width="20" height="14" rx="3" fill="currentColor" />
    </svg>
  );
}

function CodeExample() {
  // Hand-highlighted so the demo stays dependency-free.
  const kw = "text-violet-600";
  const str = "text-emerald-700";
  const cm = "text-stone-400";
  return (
    <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-stone-800">
      <code>
        <span className={kw}>import</span> {"{ Lock }"}{" "}
        <span className={kw}>from</span>{" "}
        <span className={str}>&quot;@upstash/lock&quot;</span>;{"\n"}
        <span className={kw}>import</span> {"{ Redis }"}{" "}
        <span className={kw}>from</span>{" "}
        <span className={str}>&quot;@upstash/redis&quot;</span>;{"\n\n"}
        <span className={kw}>const</span> lock ={" "}
        <span className={kw}>new</span> Lock({"{"}
        {"\n"}
        {"  "}id: <span className={str}>&quot;my-lock&quot;</span>,{"\n"}
        {"  "}redis: Redis.fromEnv(),{"\n"}
        {"}"});{"\n\n"}
        <span className={kw}>if</span> (<span className={kw}>await</span>{" "}
        lock.acquire()) {"{"}
        {"\n"}
        {"  "}
        <span className={kw}>await</span> doWork();{" "}
        <span className={cm}>{"// you hold the lock"}</span>
        {"\n"}
        {"  "}
        <span className={kw}>await</span> lock.release();{"\n"}
        {"}"} <span className={kw}>else</span> {"{"}
        {"\n"}
        {"  "}
        <span className={cm}>{"// someone else holds it"}</span>
        {"\n"}
        {"}"}
      </code>
    </pre>
  );
}
