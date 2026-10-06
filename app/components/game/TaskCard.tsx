"use client";

import { useEffect, useState } from "react";
import { MiniShell, Progress } from "./utils";
import type { ClientSnapshot } from "@/lib/types";

export function TaskCard({
  task,
  done,
  onDone,
}: {
  task: ClientSnapshot["tasks"][string] | undefined;
  done: boolean;
  onDone: (answer: unknown, timing: number) => void;
}) {
  const [score, setScore] = useState(0);
  const [memory, setMemory] = useState<number[]>([]);
  const [input, setInput] = useState<number[]>([]);
  const [target, setTarget] = useState({ x: 50, y: 50 });
  const [pulse, setPulse] = useState(false);
  const [wire, setWire] = useState<number[]>([]);
  const [safe, setSafe] = useState<number[]>([]);
  const [tiles, setTiles] = useState<number[]>([]);
  const [changed, setChanged] = useState(4);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (task?.game === "MEMORY_FLASH") {
      const seq = Array.from({ length: 4 }, () =>
        Math.floor(Math.random() * 4)
      );
      setMemory(seq);
      setInput([]);
    }
    if (task?.game === "SAFE_CRACKER") {
      setSafe(Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)));
    }
    if (task?.game === "SUSPECT") {
      setChanged(Math.floor(Math.random() * 9));
      setTiles(Array.from({ length: 9 }, () => Math.floor(Math.random() * 5)));
    }
  }, [task?.game]);

  const finish = (answer: unknown) => {
    if (!done) {
      const timing = Date.now() - startTime;
      onDone(answer, timing);
    }
  };

  if (!task) return null;

  if (done)
    return (
      <div className="rounded-[28px] border border-emerald-400/20 bg-emerald-400/10 p-7 text-center">
        <div className="text-4xl">✓</div>
        <div className="mt-3 text-xl font-bold">Task complete</div>
        <div className="mt-2 text-sm text-emerald-100/60">
          Waiting for the night to end. Your performance stays private.
        </div>
      </div>
    );

  if (task.game === "POP_RUSH")
    return (
      <MiniShell
        title="Pop Rush"
        subtitle="Hit the moving target five times."
      >
        <div className="relative h-72 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          {Array.from({ length: score }).map((_, i) => (
            <span key={i} className="absolute left-2 top-2 text-xs text-emerald-300">
              ●
            </span>
          ))}
          <button
            onClick={() => {
              const newScore = score + 1;
              setScore(newScore);
              if (newScore >= 5) {
                finish(5);
              } else {
                setTarget({
                  x: 8 + Math.random() * 84,
                  y: 8 + Math.random() * 84,
                });
              }
            }}
            style={{ left: `${target.x}%`, top: `${target.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 grid h-14 w-14 place-items-center rounded-full bg-cyan-300 text-black shadow-[0_0_35px_rgba(103,232,249,.35)] transition-all"
          >
            ●
          </button>
        </div>
        <Progress text={`${score}/5 hits`} value={(score / 5) * 100} />
      </MiniShell>
    );

  if (task.game === "HEARTBEAT")
    return (
      <MiniShell
        title="Heartbeat"
        subtitle="Press when the ring reaches the sweet spot."
      >
        <div className="grid h-72 place-items-center">
          <button
            onClick={() => {
              const good = Math.random() > 0.35;
              if (good) {
                finish({ timing: Date.now() - startTime });
              } else {
                setPulse((v) => !v);
              }
            }}
            className={`grid h-40 w-40 place-items-center rounded-full border-4 ${
              pulse
                ? "border-cyan-200 scale-110"
                : "border-white/10"
            } bg-white/[.03] text-4xl transition-all`}
          >
            ♥
          </button>
        </div>
        <div className="text-center text-xs text-zinc-600">
          Timing matters more than speed.
        </div>
      </MiniShell>
    );

  if (task.game === "MEMORY_FLASH")
    return (
      <MiniShell
        title="Memory Flash"
        subtitle="Watch the sequence, then repeat it."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <button
              key={i}
              onClick={() => {
                const next = [...input, i];
                setInput(next);
                if (next.length === memory.length) {
                  finish(next);
                }
              }}
              className="h-24 rounded-2xl border border-white/10 bg-white/[.04] text-2xl hover:bg-white/10"
            >
              {["◆", "●", "▲", "■"][i]}
            </button>
          ))}
        </div>
        <div className="mt-5 text-center text-xs text-zinc-600">
          Sequence: {memory.map(() => "• ").join("")} · your input {input.length}
          /4
        </div>
      </MiniShell>
    );

  if (task.game === "WIRE_PANIC")
    return (
      <MiniShell
        title="Wire Panic"
        subtitle="Connect matching pairs in the correct order."
      >
        <div className="grid grid-cols-2 gap-3">
          {["cyan", "violet", "amber", "emerald"].map((c, i) => (
            <button
              key={c}
              onClick={() => {
                if (!wire.includes(i)) {
                  const next = [...wire, i];
                  setWire(next);
                  if (next.length === 4) finish(next);
                }
              }}
              className={`rounded-2xl border p-6 text-center ${
                wire.includes(i)
                  ? "border-cyan-300/40 bg-cyan-300/10"
                  : "border-white/10 bg-white/[.03]"
              }`}
            >
              {["01", "02", "03", "04"][i]}
              <div className="mt-2 text-xs uppercase tracking-wider text-zinc-500">
                {c} wire
              </div>
            </button>
          ))}
        </div>
      </MiniShell>
    );

  if (task.game === "SAFE_CRACKER")
    return (
      <MiniShell
        title="Safe Cracker"
        subtitle={`Enter the 4-digit combination.`}
      >
        <div className="mb-5 text-center font-mono text-3xl tracking-[.5em]">
          {safe.map((n, i) => input[i] ?? "•").join(" ")}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, n) => (
            <button
              key={n}
              onClick={() => {
                const next = [...input, n];
                setInput(next);
                if (next.length === 4) {
                  finish(next);
                }
              }}
              className="rounded-xl border border-white/10 bg-white/[.03] p-3 font-mono hover:bg-white/10"
            >
              {n}
            </button>
          ))}
        </div>
      </MiniShell>
    );

  return (
    <MiniShell title="Suspect" subtitle="Find the tile that changed.">
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((n, i) => (
          <button
            key={i}
            onClick={() => {
              finish(i);
            }}
            className="aspect-square rounded-2xl border border-white/10 bg-white/[.03] text-3xl hover:bg-white/10"
          >
            {["●", "◆", "▲", "■", "✦"][n]}
          </button>
        ))}
      </div>
    </MiniShell>
  );
}
