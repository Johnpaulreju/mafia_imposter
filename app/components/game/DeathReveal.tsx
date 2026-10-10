"use client";

import { BookOpen, Ear, Mic2, Radio, Skull } from "lucide-react";
import { Avatar } from "@/app/components/ui";
import type { ClientSnapshot, PublicPlayer } from "@/lib/types";

export function DeathReveal({
  state,
  me,
  seconds,
}: {
  state: ClientSnapshot;
  me: PublicPlayer | null;
  seconds: number;
}) {
  const victim = state.players.find(
    (p) => p.id === (state.story?.victimId ?? state.eliminatedThisRound)
  );
  const dead = me?.status !== "ALIVE";
  const reader = state.story?.readerId === me?.id;
  const remoteStory = state.config.playMode === "REMOTE" && !!state.story;

  if (dead) {
    return (
      <div className="grid min-h-[60vh] place-items-center overflow-hidden rounded-[28px] border border-red-400/10 bg-[radial-gradient(circle_at_50%_10%,rgba(127,29,29,.25),transparent_48%)] p-7 text-center">
        <div className="max-w-lg">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-red-300/15 bg-red-500/10">
            <Skull className="text-red-200" size={34} />
          </div>
          <div className="mt-7 text-xs uppercase tracking-[.28em] text-red-200/60">
            Silent observer
          </div>
          <h2 className="mt-3 text-4xl font-black">You are out.</h2>
          <p className="mx-auto mt-4 max-w-md leading-7 text-zinc-400">
            Keep your role and suspicions secret. Watch every reaction—who looks
            relieved, and who already has an alibi?
          </p>
          <div className="mt-8 rounded-2xl border border-white/8 bg-black/20 p-5">
            <div className="text-xs uppercase tracking-[.2em] text-zinc-600">
              Your private question
            </div>
            <div className="mt-3 text-xl font-semibold text-zinc-200">
              Who do you think the Mafia is?
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[60vh] overflow-hidden rounded-[28px] border border-violet-300/10 bg-[radial-gradient(circle_at_50%_0%,rgba(88,28,135,.24),transparent_45%)] p-6 sm:p-9">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:100%_38px]" />
      <div className="relative mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {victim ? <Avatar id={victim.avatarId} /> : null}
            <div>
              <div className="text-xs uppercase tracking-[.22em] text-violet-200/55">
                The discovery
              </div>
              <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
                {victim ? `${victim.name} is gone.` : "The night was quiet."}
              </h2>
            </div>
          </div>
          <div className="shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 font-mono text-sm text-zinc-300">
            {seconds}s to read
          </div>
        </div>

        {state.story ? (
          <div className="mt-8 rounded-[24px] border border-violet-200/15 bg-black/30 p-6 shadow-2xl shadow-violet-950/20 sm:p-8">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[.22em] text-violet-200">
              <BookOpen size={15} />
              {reader ? "You are the narrator" : "Case file"}
            </div>
            <p className="mt-5 text-lg leading-8 text-zinc-100 sm:text-xl sm:leading-9">
              {state.story.text}
            </p>
            <div className="mt-6 flex items-center gap-2 border-t border-white/8 pt-4 text-sm text-zinc-500">
              {reader ? <Mic2 size={16} /> : <Radio size={16} />}
              {reader
                ? "Read this aloud. Everyone else is waiting for your voice."
                : remoteStory
                  ? "Read carefully. Discussion begins when the timer ends."
                  : "Hold this clue until discussion begins."}
            </div>
          </div>
        ) : victim && state.config.playMode === "IN_PERSON" ? (
          <div className="mt-10 grid min-h-72 place-items-center rounded-[24px] border border-white/8 bg-black/20 p-8 text-center">
            <div>
              <Ear className="mx-auto text-violet-200" size={32} />
              <h3 className="mt-5 text-2xl font-bold">Listen carefully.</h3>
              <p className="mx-auto mt-3 max-w-sm leading-7 text-zinc-500">
                One living player has the full story. They have ten seconds to
                read it to the room.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-10 grid min-h-72 place-items-center rounded-[24px] border border-white/8 bg-black/20 p-8 text-center">
            <div>
              <div className="text-5xl">🌙</div>
              <h3 className="mt-5 text-2xl font-bold">No victim tonight.</h3>
              <p className="mt-3 text-zinc-500">But silence can be suspicious too.</p>
            </div>
          </div>
        )}

        <div className="mt-6 h-1 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300 transition-[width] duration-300"
            style={{ width: `${Math.min(100, (seconds / 10) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
