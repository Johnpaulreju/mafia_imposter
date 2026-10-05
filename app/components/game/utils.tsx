"use client";

import { Button } from "@/app/components/ui";

export function Setting({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-[.16em] text-zinc-500">
        {label}
      </div>
      {children}
    </div>
  );
}

export function NumberSetting({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="rounded-xl border border-white/8 bg-white/[.025] p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-600">
        {label}
      </div>
      <input
        type="number"
        min={label === "Max players" ? 4 : 10}
        max={label === "Max players" ? 25 : 120}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full bg-transparent text-lg font-semibold outline-none"
      />
    </label>
  );
}

export function MiniShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-black/30 p-6">
      <div className="mb-6 text-center">
        <div className="text-xs uppercase tracking-[.2em] text-cyan-200/70">
          Mini-game
        </div>
        <div className="mt-2 text-3xl font-black">{title}</div>
        <div className="mt-2 text-sm text-zinc-500">{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

export function Progress({
  text,
  value,
}: {
  text: string;
  value: number;
}) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex justify-between text-xs text-zinc-600">
        <span>{text}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-cyan-300 transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function phaseTitle(p: string): string {
  const titles: Record<string, string> = {
    COUNTDOWN: "Get ready",
    ROLE_REVEAL: "Role reveal",
    ASSASSINATION: "Night phase",
    DEATH_REVEAL: "The discovery",
    DISCUSSION: "Discussion",
    VOTING: "Voting",
    TIE_BREAK: "Tie-break",
    ELIMINATION_REVEAL: "Elimination",
    ROUND_END: "Round complete",
    GAME_OVER: "Game over",
    LOBBY: "Lobby",
  };
  return titles[p] ?? "Unknown phase";
}
