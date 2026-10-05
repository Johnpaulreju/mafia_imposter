"use client";

import { Skull } from "lucide-react";
import { Avatar } from "@/app/components/ui";
import type { ClientSnapshot } from "@/lib/types";

export function GameOver({ state }: { state: ClientSnapshot }) {
  const mafia = state.players.filter((p) => p.role === "IMPOSTER");

  return (
    <main className="min-h-screen bg-grid px-5 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="glass rounded-[32px] p-7 sm:p-10">
          <div className="text-xs uppercase tracking-[.25em] text-zinc-500">
            Match complete
          </div>
          <h1 className="mt-3 text-5xl font-black">
            {state.winner === "VILLAGERS"
              ? "The village survived."
              : "The Mafia took the night."}
          </h1>
          <p className="mt-3 text-zinc-500">
            The secret roles are now revealed.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {state.players.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[.025] p-4"
              >
                <Avatar id={p.avatarId} />
                <div className="flex-1">
                  <div className="font-semibold">{p.name}</div>
                  <div
                    className={`mt-1 text-xs uppercase tracking-wider ${
                      p.role === "IMPOSTER" ? "text-red-300" : "text-emerald-300"
                    }`}
                  >
                    {p.role}
                  </div>
                </div>
                {p.status !== "ALIVE" && (
                  <Skull size={16} className="text-zinc-600" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-white/8 bg-black/20 p-5">
            <div className="mb-3 text-xs uppercase tracking-[.2em] text-zinc-600">
              Mafia
            </div>
            <div className="flex flex-wrap gap-2">
              {mafia.map((p) => (
                <span
                  key={p.id}
                  className="rounded-full bg-red-500/10 px-3 py-1.5 text-sm text-red-200"
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
