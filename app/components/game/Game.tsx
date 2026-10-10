"use client";

import { useEffect, useState } from "react";
import { Crown, Sparkles } from "lucide-react";
import { Avatar } from "@/app/components/ui";
import { TaskCard } from "./TaskCard";
import { DeathReveal } from "./DeathReveal";
import { Discussion } from "./Discussion";
import { GameOver } from "./GameOver";
import { Spectator } from "./Spectator";
import { phaseTitle } from "./utils";
import type { ClientSnapshot } from "@/lib/types";

export function Game({
  state,
  send,
  onLeave,
}: {
  state: ClientSnapshot;
  send: (t: string, p?: Record<string, unknown>) => void;
  onLeave: () => void;
}) {
  const me = state.me;
  const [now, setNow] = useState(state.serverNow);
  const [selection, setSelection] = useState({ phase: "", round: 0, id: "" });
  const [taskCompletion, setTaskCompletion] = useState({ round: 0, done: false });

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, []);

  const seconds = state.phaseEndsAt
    ? Math.max(0, Math.ceil((state.phaseEndsAt - now) / 1000))
    : 0;
  const alive = state.players.filter((p) => p.status === "ALIVE");
  const victim = state.currentVictimId
    ? state.players.find((p) => p.id === state.currentVictimId)
    : undefined;
  const eliminated = state.eliminatedThisRound
    ? state.players.find((p) => p.id === state.eliminatedThisRound)
    : undefined;

  if (state.phase === "GAME_OVER") {
    return <GameOver state={state} send={send} onLeave={onLeave} />;
  }

  const task = me ? state.tasks[me.id] : undefined;
  const isSpectator = !!me && me.status !== "ALIVE";
  const selected =
    selection.phase === state.phase && selection.round === state.round
      ? selection.id
      : "";
  const taskDone =
    taskCompletion.round === state.round && taskCompletion.done;
  const selectPlayer = (id: string) =>
    setSelection({ phase: state.phase, round: state.round, id });

  return (
    <main className="min-h-screen bg-grid px-4 py-5">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[.2em] text-zinc-600">
              Round {state.round} / {state.config.rounds}
            </div>
            <div className="mt-1 font-semibold">{phaseTitle(state.phase)}</div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[.03] px-4 py-2 font-mono text-lg">
            {seconds}s
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="glass min-h-[70vh] rounded-[30px] p-6 sm:p-10">
            {isSpectator && state.phase !== "DEATH_REVEAL" ? (
              <Spectator state={state} />
            ) : (
              <>
            {state.phase === "COUNTDOWN" && (
              <div className="grid h-[60vh] place-items-center text-center">
                <div>
                  <div className="text-sm uppercase tracking-[.3em] text-zinc-600">
                    Get ready
                  </div>
                  <div className="mt-5 text-8xl font-black text-gradient">
                    {seconds}
                  </div>
                </div>
              </div>
            )}

            {state.phase === "ROLE_REVEAL" && (
              <div className="grid h-[60vh] place-items-center text-center">
                <div>
                  <div className="text-sm uppercase tracking-[.25em] text-zinc-500">
                    Your secret role
                  </div>
                  <div
                    className={`mx-auto mt-6 grid h-28 w-28 place-items-center rounded-[30px] border ${
                      me?.role === "IMPOSTER"
                        ? "border-red-400/30 bg-red-500/10"
                        : "border-emerald-400/30 bg-emerald-500/10"
                    }`}
                  >
                    <span className="text-5xl">
                      {me?.role === "IMPOSTER" ? "☠️" : "🛡️"}
                    </span>
                  </div>
                  <h1 className="mt-6 text-4xl font-black">
                    {me?.role === "IMPOSTER"
                      ? "You are Mafia"
                      : "You are a Villager"}
                  </h1>
                  <p className="mx-auto mt-3 max-w-md text-zinc-500">
                    {me?.role === "IMPOSTER"
                      ? state.config.mafiaMode === "CONNECTED"
                        ? `Your teammates: ${(me.teamMates ?? [])
                            .map((id) => state.players.find((p) => p.id === id)?.name)
                            .filter(Boolean)
                            .join(", ") || "none"}.`
                        : "You do not know the other Mafia."
                      : "Complete your task, watch the room, and trust your instincts."}
                  </p>
                </div>
              </div>
            )}

            {state.phase === "ASSASSINATION" && (
              <div>
                <div className="mb-7 flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[.2em] text-zinc-500">
                      Night action
                    </div>
                    <h2 className="mt-2 text-3xl font-bold">
                      {me?.role === "IMPOSTER"
                        ? "Choose your target"
                        : "Complete your task"}
                    </h2>
                  </div>
                  <div className="rounded-xl bg-white/5 px-3 py-2 text-xs text-zinc-500">
                    Private
                  </div>
                </div>

                {me?.role === "IMPOSTER" ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {alive
                      .filter((p) => p.id !== me.id)
                      .map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            selectPlayer(p.id);
                            send("SELECT_TARGET", { targetId: p.id });
                          }}
                          className={`rounded-2xl border p-4 text-left transition ${
                            selected === p.id || victim?.id === p.id
                              ? "border-red-300/40 bg-red-500/10"
                              : "border-white/8 bg-white/[.025] hover:bg-white/[.06]"
                          }`}
                        >
                          <Avatar id={p.avatarId} />
                          <div className="mt-3 font-semibold">{p.name}</div>
                          <div className="mt-1 text-xs text-zinc-600">
                            {victim?.id === p.id
                              ? "Target selected"
                              : "Select"}
                          </div>
                        </button>
                      ))}
                  </div>
                ) : (
                  <TaskCard
                    task={task}
                    done={taskDone || !!task?.completed}
                    onDone={(answer, timing) => {
                      setTaskCompletion({ round: state.round, done: true });
                      send("COMPLETE_TASK", {
                        answer,
                        timing,
                      });
                    }}
                  />
                )}

                <div className="mt-7 rounded-2xl border border-white/8 bg-white/[.02] p-4 text-sm text-zinc-500">
                  The phase continues until the timer ends. Finishing early does
                  not reveal your performance to anyone else.
                </div>
              </div>
            )}

            {state.phase === "DEATH_REVEAL" && (
              <DeathReveal state={state} me={me} seconds={seconds} />
            )}

            {state.phase === "DISCUSSION" && (
              <Discussion state={state} seconds={seconds} />
            )}

            {(state.phase === "VOTING" || state.phase === "TIE_BREAK") && (
              <div>
                <div className="mb-7">
                  <div className="text-xs uppercase tracking-[.2em] text-zinc-500">
                    {state.phase === "TIE_BREAK" ? "Tie-break" : "Vote"}
                  </div>
                  <h2 className="mt-2 text-3xl font-bold">
                    {state.phase === "TIE_BREAK"
                      ? "Break the tie"
                      : "Who is suspicious?"}
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {alive
                    .filter(
                      (p) =>
                        p.id !== me?.id &&
                        (!state.tieCandidates.length ||
                          state.tieCandidates.includes(p.id))
                    )
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          selectPlayer(p.id);
                          send("CAST_VOTE", { targetId: p.id });
                        }}
                        className={`rounded-2xl border p-4 text-left ${
                          selected === p.id ||
                          state.votes[me?.id ?? ""] === p.id
                            ? "border-cyan-300/40 bg-cyan-300/10"
                            : "border-white/8 bg-white/[.025]"
                        }`}
                      >
                        <Avatar id={p.avatarId} />
                        <div className="mt-3 font-semibold">{p.name}</div>
                      </button>
                    ))}
                </div>
                <button
                  onClick={() => {
                    selectPlayer("");
                    send("CAST_VOTE", { targetId: null });
                  }}
                  className="mt-5 text-xs text-zinc-600 hover:text-zinc-300"
                >
                  Abstain
                </button>
              </div>
            )}

            {state.phase === "ELIMINATION_REVEAL" && (
              <div className="grid h-[60vh] place-items-center text-center">
                <div>
                  <div className="text-sm uppercase tracking-[.25em] text-zinc-500">
                    The vote is in
                  </div>
                  <div className="mx-auto mt-5 grid h-24 w-24 place-items-center rounded-full border border-white/10 bg-white/5 text-4xl">
                    {eliminated ? "⚡" : "—"}
                  </div>
                  <h2 className="mt-6 text-4xl font-black">
                    {eliminated
                      ? `${eliminated.name} was voted out.`
                      : "No one was eliminated."}
                  </h2>
                  <p className="mt-3 text-zinc-500">
                    {eliminated
                      ? `They were ${
                          state.lastEliminationRole === "IMPOSTER"
                            ? "an Imposter."
                            : "a Villager."
                        }`
                      : "The tie could not be broken."}
                  </p>
                </div>
              </div>
            )}

            {state.phase === "ROUND_END" && (
              <div className="grid h-[60vh] place-items-center text-center">
                <div>
                  <Sparkles className="mx-auto text-cyan-200" />
                  <h2 className="mt-5 text-4xl font-black">Round complete</h2>
                  <p className="mt-3 text-zinc-500">
                    Prepare for the next mystery.
                  </p>
                </div>
              </div>
            )}
              </>
            )}
          </section>

          <aside className="glass rounded-[28px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[.2em] text-zinc-500">
                Players
              </span>
              <span className="text-xs text-zinc-600">{alive.length} alive</span>
            </div>
            <div className="space-y-2">
              {state.players.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                    p.id === me?.id
                      ? "border-cyan-300/20 bg-cyan-300/5"
                      : "border-white/5 bg-white/[.02]"
                  }`}
                >
                  <Avatar id={p.avatarId} />
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate text-sm font-medium ${
                        p.status !== "ALIVE"
                          ? "text-zinc-600 line-through"
                          : ""
                      }`}
                    >
                      {p.name}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                      {p.status === "ALIVE" ? "alive" : "out"}
                    </div>
                  </div>
                  {p.isHost && (
                    <Crown size={13} className="text-amber-300" />
                  )}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
