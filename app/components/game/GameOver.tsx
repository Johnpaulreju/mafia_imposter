"use client";

import {
  Crown,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Skull,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { Avatar } from "@/app/components/ui";
import type { ClientSnapshot } from "@/lib/types";

export function GameOver({
  state,
  send,
  onLeave,
}: {
  state: ClientSnapshot;
  send: (t: string, p?: Record<string, unknown>) => void;
  onLeave: () => void;
}) {
  const mafia = state.players.filter((player) => player.role === "IMPOSTER");
  const host = state.players.find((player) => player.isHost);
  const isHost = !!state.me?.isHost;
  const connected = state.players.filter((player) => player.connected).length;
  const canRematch = connected >= 4;
  const villagersWon = state.winner === "VILLAGERS";

  return (
    <main className="min-h-screen bg-grid px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <section
          className={`relative overflow-hidden rounded-[34px] border p-7 sm:p-10 ${
            villagersWon
              ? "border-emerald-300/15 bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,.16),transparent_38%),rgba(14,14,18,.86)]"
              : "border-red-300/15 bg-[radial-gradient(circle_at_15%_0%,rgba(185,28,28,.2),transparent_38%),rgba(14,14,18,.86)]"
          }`}
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full border border-white/5" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs uppercase tracking-[.2em] ${
                  villagersWon
                    ? "border-emerald-300/20 bg-emerald-400/5 text-emerald-200"
                    : "border-red-300/20 bg-red-400/5 text-red-200"
                }`}
              >
                <Trophy size={14} /> Match {state.matchNumber} complete
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
                {villagersWon
                  ? "The village survived."
                  : "The Mafia took the night."}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
                Every secret is out. Compare your theories, settle the arguments,
                then shuffle the roles and run it back with the same crew.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
              <Users size={18} className="text-zinc-500" />
              <div>
                <div className="text-sm font-semibold text-zinc-200">
                  {connected}/{state.players.length} still connected
                </div>
                <div className="mt-0.5 text-xs text-zinc-600">
                  {host?.name ?? "The host"} controls the rematch
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="glass rounded-[30px] p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[.2em] text-zinc-600">
                  Role reveal
                </div>
                <h2 className="mt-2 text-2xl font-bold">The full cast</h2>
              </div>
              <div className="rounded-full border border-white/8 bg-white/[.025] px-3 py-1.5 text-xs text-zinc-500">
                {state.config.imposters} Mafia
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {state.players.map((player) => (
                <div
                  key={player.id}
                  className={`relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4 ${
                    player.role === "IMPOSTER"
                      ? "border-red-300/15 bg-red-500/[.055]"
                      : "border-emerald-300/10 bg-emerald-500/[.035]"
                  }`}
                >
                  <Avatar id={player.avatarId} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">{player.name}</span>
                      {player.isHost && <Crown size={13} className="text-amber-300" />}
                    </div>
                    <div
                      className={`mt-1 flex items-center gap-1.5 text-xs uppercase tracking-[.15em] ${
                        player.role === "IMPOSTER"
                          ? "text-red-300"
                          : "text-emerald-300"
                      }`}
                    >
                      {player.role === "IMPOSTER" ? (
                        <Swords size={13} />
                      ) : (
                        <ShieldCheck size={13} />
                      )}
                      {player.role === "IMPOSTER" ? "Mafia" : "Villager"}
                    </div>
                  </div>
                  {player.status !== "ALIVE" && (
                    <Skull size={17} className="text-zinc-600" />
                  )}
                </div>
              ))}
            </div>
          </section>

          <aside className="glass flex flex-col rounded-[30px] p-6">
            <div className="text-xs uppercase tracking-[.2em] text-zinc-600">
              What happens next?
            </div>

            <div className="mt-5 rounded-2xl border border-red-300/10 bg-red-500/[.04] p-4">
              <div className="text-xs uppercase tracking-[.18em] text-red-200/60">
                The Mafia were
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {mafia.map((player) => (
                  <span
                    key={player.id}
                    className="rounded-full border border-red-300/10 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-100"
                  >
                    {player.name}
                  </span>
                ))}
              </div>
            </div>

            {isHost ? (
              <div className="mt-auto pt-7">
                <div className="mb-4 text-sm leading-6 text-zinc-500">
                  Rematch keeps this room and every player, but reshuffles all
                  secret roles.
                </div>
                <button
                  onClick={() => send("START_MATCH")}
                  disabled={!canRematch}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-sm font-bold text-black transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RefreshCw size={17} /> Rematch same players
                </button>
                {!canRematch && (
                  <p className="mt-2 text-center text-xs text-amber-300/70">
                    At least four connected players are required.
                  </p>
                )}
                <button
                  onClick={onLeave}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3.5 text-sm font-semibold text-zinc-300 transition hover:border-red-300/20 hover:bg-red-500/10 hover:text-red-200"
                >
                  <LogOut size={16} /> End and leave
                </button>
              </div>
            ) : (
              <div className="mt-auto pt-7">
                <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[.045] p-4 text-center">
                  <RefreshCw className="mx-auto text-cyan-200" size={20} />
                  <div className="mt-3 font-semibold">Waiting for the host</div>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {host?.name ?? "The host"} can start a rematch with this crew.
                  </p>
                </div>
                <button
                  onClick={onLeave}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[.07]"
                >
                  <LogOut size={16} /> Leave game
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
