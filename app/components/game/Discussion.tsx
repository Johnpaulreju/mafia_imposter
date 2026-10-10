"use client";

import { MessageCircle, Search, ShieldQuestion, Timer } from "lucide-react";
import { Avatar } from "@/app/components/ui";
import type { ClientSnapshot } from "@/lib/types";

export function Discussion({
  state,
  seconds,
}: {
  state: ClientSnapshot;
  seconds: number;
}) {
  const victim = state.players.find((p) => p.id === state.eliminatedThisRound);
  const urgency = seconds <= 7;

  const prompts = [
    { icon: Search, text: "Who changed their story?" },
    { icon: ShieldQuestion, text: "Who is defending too quickly?" },
    { icon: MessageCircle, text: "Who stayed unusually quiet?" },
  ];

  return (
    <div className="relative min-h-[60vh] overflow-hidden rounded-[28px] border border-amber-300/10 bg-[radial-gradient(circle_at_50%_0%,rgba(146,64,14,.2),transparent_48%)] p-6 sm:p-9">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[.22em] text-amber-200/70">
              <MessageCircle size={15} /> Open discussion
            </div>
            <h2 className="mt-3 text-4xl font-black sm:text-5xl">
              Make your case.
            </h2>
            <p className="mt-3 max-w-xl leading-7 text-zinc-400">
              {victim
                ? `${victim.name} is gone. Compare alibis, question contradictions, and listen for panic.`
                : "Nobody was taken. Work out whether the Mafia hesitated—or got unlucky."}
            </p>
          </div>
          <div
            className={`rounded-2xl border px-5 py-3 text-center ${
              urgency
                ? "border-red-300/25 bg-red-500/10 text-red-100"
                : "border-amber-300/20 bg-amber-300/5 text-amber-100"
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[.18em] opacity-65">
              <Timer size={13} /> {urgency ? "Final words" : "Talk now"}
            </div>
            <div className="mt-1 font-mono text-3xl font-black">{seconds}</div>
          </div>
        </div>

        {victim && (
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 p-3">
            <Avatar id={victim.avatarId} />
            <div>
              <div className="text-xs uppercase tracking-[.18em] text-zinc-600">
                Tonight&apos;s victim
              </div>
              <div className="mt-0.5 font-semibold text-zinc-200">{victim.name}</div>
            </div>
            <div className="ml-auto hidden text-sm text-zinc-600 sm:block">
              Their role remains secret
            </div>
          </div>
        )}

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {prompts.map(({ icon: Icon, text }, index) => (
            <div
              key={text}
              className="rounded-2xl border border-white/8 bg-white/[.025] p-4"
            >
              <div className="flex items-center justify-between">
                <Icon size={17} className="text-amber-200/80" />
                <span className="font-mono text-[10px] text-zinc-700">0{index + 1}</span>
              </div>
              <div className="mt-4 text-sm font-medium leading-6 text-zinc-300">
                {text}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-7 flex items-center justify-between border-t border-white/8 pt-5 text-xs uppercase tracking-[.16em] text-zinc-600">
          <span>No voting yet</span>
          <span>Vote follows discussion</span>
        </div>
      </div>
    </div>
  );
}
