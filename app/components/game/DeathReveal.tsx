"use client";

import { Avatar } from "@/app/components/ui";
import type { ClientSnapshot, PublicPlayer } from "@/lib/types";

export function DeathReveal({
  state,
  me,
}: {
  state: ClientSnapshot;
  me: PublicPlayer | null;
}) {
  const victim = state.players.find((p) => p.id === state.eliminatedThisRound);
  const dead = me?.id === victim?.id;
  const reader = state.story?.readerId === me?.id;

  return (
    <div
      className={`grid min-h-[60vh] place-items-center rounded-[28px] p-7 text-center ${
        dead ? "bg-red-950/30" : "bg-emerald-950/15"
      }`}
    >
      <div>
        <div className="animate-heartbeat text-6xl">{dead ? "☠️" : "🟢"}</div>
        <h2 className="mt-7 text-4xl font-black">
          {dead ? "You are dead" : "You survived"}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-zinc-500">
          {dead
            ? "You can watch the rest of the match, but you can no longer vote or act."
            : victim
              ? `${victim.name} was discovered.`
              : "No one was taken."}
        </p>

        {reader && state.story && (
          <div className="mt-8 max-w-xl rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-6 text-left">
            <div className="text-xs uppercase tracking-[.2em] text-cyan-200">
              📖 You are the narrator
            </div>
            <p className="mt-4 text-lg leading-8 text-zinc-200">
              {state.story.text}
            </p>
            <div className="mt-4 text-xs text-zinc-600">
              Read this aloud to the room.
            </div>
          </div>
        )}

        {!dead &&
          state.config.playMode === "REMOTE" &&
          state.story && (
            <div className="mt-8 max-w-xl rounded-2xl border border-white/10 bg-white/[.03] p-6 text-left">
              <div className="text-xs uppercase tracking-[.2em] text-zinc-500">
                The mystery
              </div>
              <p className="mt-4 text-lg leading-8 text-zinc-200">
                {state.story.text}
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
