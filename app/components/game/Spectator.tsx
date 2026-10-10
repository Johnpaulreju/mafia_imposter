"use client";

import { Eye, Ghost, MessageCircleQuestion } from "lucide-react";
import { Avatar } from "@/app/components/ui";
import type { ClientSnapshot } from "@/lib/types";
import { phaseTitle } from "./utils";

export function Spectator({ state }: { state: ClientSnapshot }) {
  const alive = state.players.filter((player) => player.status === "ALIVE");

  return (
    <div className="grid min-h-[60vh] place-items-center overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_50%_0%,rgba(63,63,70,.22),transparent_50%)] p-6 text-center sm:p-9">
      <div className="w-full max-w-2xl">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-white/10 bg-white/[.035]">
          <Ghost className="text-zinc-300" size={34} />
        </div>
        <div className="mt-6 text-xs uppercase tracking-[.28em] text-zinc-600">
          Silent observer · {phaseTitle(state.phase)}
        </div>
        <h2 className="mt-3 text-4xl font-black">Who is the Mafia?</h2>
        <p className="mx-auto mt-4 max-w-lg leading-7 text-zinc-500">
          You cannot act, vote, or reveal what you know. Build your theory in
          silence and watch how the living players behave under pressure.
        </p>

        <div className="mt-8 rounded-[22px] border border-white/8 bg-black/20 p-5 text-left">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[.2em] text-zinc-600">
            <Eye size={14} /> Players still in the game
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {alive.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[.025] py-2 pl-2 pr-3"
              >
                <Avatar id={player.avatarId} />
                <span className="text-sm font-medium text-zinc-300">{player.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-sm text-zinc-600">
          <MessageCircleQuestion size={16} />
          Notice who leads, who follows, and who avoids a name.
        </div>
      </div>
    </div>
  );
}
