"use client";

import { useEffect, useState } from "react";
import { Copy, Crown, Sparkles, House, Globe2, X, Link2 } from "lucide-react";
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
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const me = state.me;
  const isHost = !!me?.isHost;

  const copyCode = async () => {
    await navigator.clipboard?.writeText(roomCode);
    setCopied("code");
    setTimeout(() => setCopied(null), 2000);
  };

  const copyLink = async () => {
    await navigator.clipboard?.writeText(`${location.origin}/?room=${roomCode}`);
    setCopied("link");
    setTimeout(() => setCopied(null), 2000);
  };

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
              Waiting Room
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-2xl font-bold tracking-widest">
                {roomCode}
              </span>
              <button
                onClick={copyCode}
                className={`rounded-lg border p-2 transition ${
                  copied === "code"
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                    : "border-white/10 text-zinc-400 hover:text-white"
                }`}
                title="Copy room code"
              >
                <Copy size={15} />
              </button>
              <button
                onClick={copyLink}
                className={`rounded-lg border p-2 transition ${
                  copied === "link"
                    ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                    : "border-white/10 text-zinc-400 hover:text-white"
                }`}
                title="Copy shareable link"
              >
                <Link2 size={15} />
              </button>
            </div>
          </div>
          <div className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs text-emerald-200">
            Waiting · {state.players.length}/{state.config.maxPlayers}
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
                  <p className="mt-2 text-xs text-zinc-500">Number of assassination rounds before the game ends</p>
                </Setting>

                <div className="space-y-3 rounded-xl bg-white/[.02] p-3">
                  <div className="text-xs uppercase tracking-[.2em] text-zinc-600">Timing (seconds)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <NumberSetting
                        label="Assassination"
                        value={config.assassinationTime}
                        onChange={(v) => set("assassinationTime", v)}
                      />
                      <p className="mt-1 text-xs text-zinc-500">Time for Mafia to eliminate and players to complete tasks</p>
                    </div>
                    <div>
                      <NumberSetting
                        label="Discussion"
                        value={config.discussionTime}
                        onChange={(v) => set("discussionTime", v)}
                      />
                      <p className="mt-1 text-xs text-zinc-500">Time for players to discuss who is suspicious</p>
                    </div>
                    <div>
                      <NumberSetting
                        label="Voting"
                        value={config.votingTime}
                        onChange={(v) => set("votingTime", v)}
                      />
                      <p className="mt-1 text-xs text-zinc-500">Time for players to vote out the suspicious person</p>
                    </div>
                    <div>
                      <NumberSetting
                        label="Max players"
                        value={config.maxPlayers}
                        onChange={(v) => set("maxPlayers", v)}
                      />
                      <p className="mt-1 text-xs text-zinc-500">Maximum players allowed in this room</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={copyCode}
                    >
                      <Copy size={15} /> {copied === "code" ? "Copied! ✓" : "Copy code"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={copyLink}
                    >
                      <Link2 size={15} /> {copied === "link" ? "Copied! ✓" : "Copy link"}
                    </Button>
                  </div>
                  <Button
                    onClick={() => send("START_MATCH")}
                    disabled={state.players.length < 4}
                  >
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
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4 text-sm text-zinc-400">
                  The host is preparing the match. Your role will be assigned
                  privately when the game starts.
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4">
                  <span className="text-white text-sm">
                    {state.config.playMode === "IN_PERSON"
                      ? "🏠 In person"
                      : "🌐 Remote"}
                  </span>{" "}
                  <span className="text-sm text-zinc-500">
                    · {state.config.rounds} rounds ·{" "}
                    {state.config.mafiaMode.toLowerCase()} Mafia
                  </span>
                </div>

                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                  <div className="text-xs uppercase tracking-[.2em] text-cyan-300 font-semibold mb-3">How to Play</div>
                  <div className="space-y-2 text-xs text-cyan-200/80">
                    <div>
                      <span className="font-semibold text-cyan-200">Your Role:</span> You'll be assigned Villager or Mafia (Imposter)
                    </div>
                    <div>
                      <span className="font-semibold text-cyan-200">Assassination Phase:</span> Mafia eliminates someone. Villagers complete mini-games to help.
                    </div>
                    <div>
                      <span className="font-semibold text-cyan-200">Discussion Phase:</span> Everyone talks to find the Mafia.
                    </div>
                    <div>
                      <span className="font-semibold text-cyan-200">Voting Phase:</span> Vote out who you think is Mafia.
                    </div>
                    <div className="pt-2 border-t border-cyan-400/20">
                      <span className="font-semibold text-cyan-200">Win Condition:</span> Villagers win if all Mafia are eliminated. Mafia wins if they equal the villagers.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
