"use client";

import { useEffect } from "react";
import { Copy, Crown, Sparkles, House, Globe2, X } from "lucide-react";
import { Button, Avatar } from "@/app/components/ui";
import { Setting, NumberSetting } from "./utils";
import type { ClientSnapshot, MatchConfig } from "@/lib/types";

export function Lobby({
  state,
  send,
  config,
  setConfig,
  error,
  setError,
  roomCode,
}: {
  state: ClientSnapshot;
  send: (t: string, p?: Record<string, unknown>) => void;
  config: MatchConfig;
  setConfig: React.Dispatch<React.SetStateAction<MatchConfig>>;
  error: string;
  setError: (s: string) => void;
  roomCode: string;
}) {
  const me = state.me;
  const isHost = !!me?.isHost;
  const copy = () =>
    navigator.clipboard?.writeText(
      `${location.origin}/?room=${roomCode}`
    );

  const set = (k: keyof MatchConfig, v: unknown) =>
    setConfig((c) => ({ ...c, [k]: v }));

  useEffect(() => {
    if (!isHost) return;
    const t = setTimeout(() => send("UPDATE_CONFIG", { config }), 350);
    return () => clearTimeout(t);
  }, [config, isHost]);

  return (
    <main className="min-h-screen bg-grid px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[.22em] text-zinc-500">
              Mafia Night
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span className="font-mono text-2xl font-bold tracking-widest">
                {roomCode}
              </span>
              <button
                onClick={copy}
                className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:text-white"
              >
                <Copy size={15} />
              </button>
            </div>
          </div>
          <div className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs text-emerald-200">
            Lobby · {state.players.length}/{state.config.maxPlayers}
          </div>
        </header>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="glass rounded-[28px] p-5 sm:p-7">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h1 className="text-2xl font-bold">Your crew</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  {isHost
                    ? "Configure the match, then start when everyone is ready."
                    : "Waiting for the host to start."}
                </p>
              </div>
            </div>

            <div className="grid max-h-[58vh] grid-cols-2 gap-3 overflow-auto pr-1 sm:grid-cols-3 xl:grid-cols-4 scrollbar">
              {state.players.map((p) => (
                <div
                  key={p.id}
                  className="group relative rounded-2xl border border-white/8 bg-white/[.025] p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar id={p.avatarId} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{p.name}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                        {p.isHost && (
                          <>
                            <Crown size={12} /> Host
                          </>
                        )}
                        {!p.connected && (
                          <span className="text-amber-300">offline</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isHost && !p.isHost && (
                    <button
                      onClick={() => send("KICK_PLAYER", { playerId: p.id })}
                      className="absolute right-2 top-2 hidden rounded-lg p-1.5 text-zinc-600 hover:bg-red-500/10 hover:text-red-300 group-hover:block"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <aside className="glass rounded-[28px] p-5 sm:p-6">
            <div className="mb-5 text-xs uppercase tracking-[.2em] text-zinc-500">
              Match settings
            </div>

            {isHost ? (
              <div className="space-y-5">
                <Setting label="Play mode">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => set("playMode", "IN_PERSON")}
                      className={`rounded-xl border p-3 text-left ${
                        config.playMode === "IN_PERSON"
                          ? "border-cyan-300/30 bg-cyan-300/10"
                          : "border-white/8"
                      }`}
                    >
                      <House size={16} />
                      <div className="mt-2 text-sm font-semibold">
                        In person
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        One narrator reads the story.
                      </div>
                    </button>
                    <button
                      onClick={() => set("playMode", "REMOTE")}
                      className={`rounded-xl border p-3 text-left ${
                        config.playMode === "REMOTE"
                          ? "border-cyan-300/30 bg-cyan-300/10"
                          : "border-white/8"
                      }`}
                    >
                      <Globe2 size={16} />
                      <div className="mt-2 text-sm font-semibold">Remote</div>
                      <div className="text-[11px] text-zinc-500">
                        Everyone sees the story.
                      </div>
                    </button>
                  </div>
                </Setting>

                <Setting label="Mafia mode">
                  <select
                    value={config.mafiaMode}
                    onChange={(e) => set("mafiaMode", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm"
                  >
                    <option value="CONNECTED">Connected Mafia</option>
                    <option value="BLIND">Blind Mafia</option>
                  </select>
                </Setting>

                <Setting label="Imposters">
                  <select
                    value={config.imposters}
                    onChange={(e) => set("imposters", Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </Setting>

                <Setting label={`Rounds · ${config.rounds}`}>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={config.rounds}
                    onChange={(e) =>
                      set("rounds", Number(e.target.value))
                    }
                    className="w-full"
                  />
                </Setting>

                <div className="grid grid-cols-2 gap-2">
                  <NumberSetting
                    label="Assassination"
                    value={config.assassinationTime}
                    onChange={(v) => set("assassinationTime", v)}
                  />
                  <NumberSetting
                    label="Discussion"
                    value={config.discussionTime}
                    onChange={(v) => set("discussionTime", v)}
                  />
                  <NumberSetting
                    label="Voting"
                    value={config.votingTime}
                    onChange={(v) => set("votingTime", v)}
                  />
                  <NumberSetting
                    label="Max players"
                    value={config.maxPlayers}
                    onChange={(v) => set("maxPlayers", v)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" onClick={copy}>
                    <Copy size={15} /> Share
                  </Button>
                  <Button onClick={() => send("START_MATCH")}>
                    <Sparkles size={15} /> Start match
                  </Button>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {error}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 text-sm text-zinc-400">
                <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4">
                  The host is preparing the match. Your role will be assigned
                  privately when the game starts.
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4">
                  <span className="text-white">
                    {state.config.playMode === "IN_PERSON"
                      ? "🏠 In person"
                      : "🌐 Remote"}
                  </span>{" "}
                  · {state.config.rounds} rounds ·{" "}
                  {state.config.mafiaMode.toLowerCase()} Mafia
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
