"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CircleDashed,
  Copy,
  Crown,
  Globe2,
  House,
  Link2,
  LogOut,
  Play,
  Settings2,
  Shield,
  Sparkles,
  Timer,
  UserPlus,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { Avatar } from "@/app/components/ui";
import { NumberSetting, Setting } from "./utils";
import type { ClientSnapshot, MatchConfig } from "@/lib/types";

export function Lobby({
  state,
  send,
  config,
  setConfig,
  error,
  roomCode,
  onLeave,
}: {
  state: ClientSnapshot;
  send: (t: string, p?: Record<string, unknown>) => void;
  config: MatchConfig;
  setConfig: React.Dispatch<React.SetStateAction<MatchConfig>>;
  error: string;
  roomCode: string;
  onLeave: () => void;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const me = state.me;
  const isHost = !!me?.isHost;
  const connectedPlayers = state.players.filter((player) => player.connected).length;
  const playersNeeded = Math.max(0, 4 - connectedPlayers);
  const ready = playersNeeded === 0;
  const openMinimumSeats = Math.max(0, 4 - state.players.length);

  const copyCode = async () => {
    await navigator.clipboard?.writeText(roomCode);
    setCopied("code");
    window.setTimeout(() => setCopied(null), 2000);
  };

  const copyLink = async () => {
    await navigator.clipboard?.writeText(`${location.origin}/?room=${roomCode}`);
    setCopied("link");
    window.setTimeout(() => setCopied(null), 2000);
  };

  const set = (key: keyof MatchConfig, value: unknown) =>
    setConfig((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!isHost) return;
    const timeout = window.setTimeout(
      () => send("UPDATE_CONFIG", { config }),
      350
    );
    return () => window.clearTimeout(timeout);
  }, [config, isHost, send]);

  return (
    <main className="min-h-screen bg-grid px-4 py-5 sm:px-7 sm:py-7">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[.24em] text-zinc-600">
              Private game room
            </div>
            <h1 className="mt-1 text-xl font-bold sm:text-2xl">
              {isHost ? "Host control room" : "Waiting for the host"}
            </h1>
          </div>
          <button
            onClick={onLeave}
            className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[.025] px-3 py-2 text-xs font-medium text-zinc-500 transition hover:border-red-300/20 hover:bg-red-500/10 hover:text-red-200"
          >
            <LogOut size={14} /> <span className="hidden sm:inline">Leave room</span>
          </button>
        </header>

        <section className="glass relative mt-6 overflow-hidden rounded-[30px] p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/[.035] blur-2xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[.2em] text-cyan-200/65">
                <UserPlus size={14} /> Invite your crew
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={copyCode}
                  className="group flex items-center gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[.055] px-5 py-3 transition hover:border-cyan-300/30 hover:bg-cyan-300/[.09]"
                  title="Copy room code"
                >
                  <span className="font-mono text-2xl font-black tracking-[.22em] text-white sm:text-3xl">
                    {roomCode}
                  </span>
                  {copied === "code" ? (
                    <Check size={18} className="text-emerald-300" />
                  ) : (
                    <Copy size={17} className="text-zinc-500 transition group-hover:text-cyan-200" />
                  )}
                </button>
                <button
                  onClick={copyLink}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/[.07]"
                >
                  {copied === "link" ? <Check size={16} /> : <Link2 size={16} />}
                  {copied === "link" ? "Invite copied" : "Copy invite link"}
                </button>
              </div>
              <p className="mt-3 text-sm text-zinc-600">
                Share the code or link. New players appear here automatically.
              </p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-xl ${
                      ready
                        ? "bg-emerald-400/10 text-emerald-200"
                        : "bg-amber-400/10 text-amber-200"
                    }`}
                  >
                    {ready ? <Wifi size={19} /> : <CircleDashed size={19} />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">
                      {ready ? "Crew ready" : `${playersNeeded} more needed`}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-600">
                      {connectedPlayers} connected · minimum 4
                    </div>
                  </div>
                </div>
                <div className="font-mono text-xl font-bold text-zinc-300">
                  {state.players.length}/{config.maxPlayers}
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full transition-all ${
                    ready ? "bg-emerald-300" : "bg-amber-300"
                  }`}
                  style={{ width: `${Math.min(100, (connectedPlayers / 4) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_390px] lg:items-start">
          <section className="glass rounded-[30px] p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[.2em] text-zinc-600">
                  <Users size={14} /> Player roster
                </div>
                <h2 className="mt-2 text-2xl font-bold">Tonight&apos;s crew</h2>
              </div>
              <div className="rounded-full border border-white/8 bg-white/[.025] px-3 py-1.5 text-xs text-zinc-500">
                {connectedPlayers} online
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {state.players.map((player, index) => (
                <div
                  key={player.id}
                  className={`group relative rounded-2xl border p-4 transition ${
                    player.id === me?.id
                      ? "border-cyan-300/20 bg-cyan-300/[.045]"
                      : "border-white/8 bg-white/[.025] hover:bg-white/[.04]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar id={player.avatarId} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold">{player.name}</span>
                        {player.id === me?.id && (
                          <span className="text-[9px] uppercase tracking-wider text-cyan-200/70">
                            You
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-600">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            player.connected ? "bg-emerald-300" : "bg-amber-300"
                          }`}
                        />
                        {player.connected ? "Connected" : "Reconnecting"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="font-mono text-[10px] text-zinc-700">
                      SEAT {String(index + 1).padStart(2, "0")}
                    </span>
                    {player.isHost ? (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-300/80">
                        <Crown size={11} /> Host
                      </span>
                    ) : isHost ? (
                      <button
                        onClick={() => send("KICK_PLAYER", { playerId: player.id })}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-700 transition hover:bg-red-500/10 hover:text-red-300"
                        aria-label={`Remove ${player.name}`}
                      >
                        <X size={11} /> Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}

              {Array.from({ length: openMinimumSeats }).map((_, index) => (
                <div
                  key={`open-${index}`}
                  className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-white/8 bg-white/[.012] p-4 text-center"
                >
                  <div>
                    <UserPlus className="mx-auto text-zinc-700" size={19} />
                    <div className="mt-2 text-xs font-medium text-zinc-600">Open seat</div>
                  </div>
                </div>
              ))}
            </div>

            {!isHost && (
              <div className="mt-6 rounded-2xl border border-cyan-300/10 bg-cyan-300/[.035] p-5">
                <div className="flex items-start gap-3">
                  <Sparkles size={18} className="mt-0.5 shrink-0 text-cyan-200" />
                  <div>
                    <div className="font-semibold">The host is setting the rules</div>
                    <p className="mt-1 text-sm leading-6 text-zinc-500">
                      Stay on this screen. Your secret role appears automatically
                      when the match begins.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className="glass overflow-hidden rounded-[30px]">
            <div className="border-b border-white/8 px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[.2em] text-zinc-600">
                    <Settings2 size={14} /> Match setup
                  </div>
                  <div className="mt-2 font-semibold">
                    {isHost ? "Tune the game" : "Tonight's rules"}
                  </div>
                </div>
                {isHost && (
                  <span className="rounded-full border border-amber-300/15 bg-amber-300/5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-amber-200/70">
                    Host only
                  </span>
                )}
              </div>
            </div>

            {isHost ? (
              <div className="max-h-[calc(100vh-270px)] space-y-6 overflow-y-auto p-5 scrollbar sm:p-6">
                <Setting label="Where are you playing?">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => set("playMode", "IN_PERSON")}
                      className={`rounded-2xl border p-3 text-left transition ${
                        config.playMode === "IN_PERSON"
                          ? "border-cyan-300/30 bg-cyan-300/10 text-white"
                          : "border-white/8 bg-white/[.02] text-zinc-500 hover:bg-white/[.04]"
                      }`}
                    >
                      <House size={17} />
                      <div className="mt-3 text-sm font-semibold">In person</div>
                      <div className="mt-1 text-[11px] leading-4 opacity-65">
                        One narrator reads aloud
                      </div>
                    </button>
                    <button
                      onClick={() => set("playMode", "REMOTE")}
                      className={`rounded-2xl border p-3 text-left transition ${
                        config.playMode === "REMOTE"
                          ? "border-cyan-300/30 bg-cyan-300/10 text-white"
                          : "border-white/8 bg-white/[.02] text-zinc-500 hover:bg-white/[.04]"
                      }`}
                    >
                      <Globe2 size={17} />
                      <div className="mt-3 text-sm font-semibold">Remote</div>
                      <div className="mt-1 text-[11px] leading-4 opacity-65">
                        Everyone reads privately
                      </div>
                    </button>
                  </div>
                </Setting>

                <div className="grid grid-cols-2 gap-3">
                  <Setting label="Mafia team">
                    <select
                      value={config.mafiaMode}
                      onChange={(event) => set("mafiaMode", event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm outline-none focus:border-cyan-300/30"
                    >
                      <option value="CONNECTED">Connected</option>
                      <option value="BLIND">Blind</option>
                    </select>
                  </Setting>
                  <Setting label="Mafia count">
                    <select
                      value={config.imposters}
                      onChange={(event) => set("imposters", Number(event.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm outline-none focus:border-cyan-300/30"
                    >
                      <option value="1">1 player</option>
                      <option value="2">2 players</option>
                      <option value="3">3 players</option>
                    </select>
                  </Setting>
                </div>

                <Setting label={`Rounds · ${config.rounds}`}>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={config.rounds}
                    onChange={(event) => set("rounds", Number(event.target.value))}
                    className="w-full accent-cyan-300"
                  />
                  <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-zinc-700">
                    <span>Quick</span>
                    <span>Long game</span>
                  </div>
                </Setting>

                <div className="rounded-2xl border border-white/8 bg-white/[.018] p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[.18em] text-zinc-600">
                    <Timer size={13} /> Phase timing
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberSetting
                      label="Night"
                      value={config.assassinationTime}
                      onChange={(value) => set("assassinationTime", value)}
                    />
                    <NumberSetting
                      label="Discussion"
                      value={config.discussionTime}
                      onChange={(value) => set("discussionTime", value)}
                    />
                    <NumberSetting
                      label="Voting"
                      value={config.votingTime}
                      onChange={(value) => set("votingTime", value)}
                    />
                    <NumberSetting
                      label="Max players"
                      value={config.maxPlayers}
                      onChange={(value) => set("maxPlayers", value)}
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-zinc-600">
                    <Shield size={13} /> Story reveal is fixed at 10 seconds
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-5 sm:p-6">
                <RuleRow
                  icon={state.config.playMode === "IN_PERSON" ? House : Globe2}
                  label="Play mode"
                  value={state.config.playMode === "IN_PERSON" ? "In person" : "Remote"}
                />
                <RuleRow icon={Shield} label="Mafia" value={`${state.config.imposters} · ${state.config.mafiaMode.toLowerCase()}`} />
                <RuleRow icon={Sparkles} label="Rounds" value={String(state.config.rounds)} />
                <RuleRow icon={Timer} label="Discussion" value={`${state.config.discussionTime}s`} />
              </div>
            )}

            {isHost && (
              <div className="border-t border-white/8 bg-black/20 p-5 sm:p-6">
                {error && (
                  <div className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {error}
                  </div>
                )}
                <button
                  onClick={() => send("START_MATCH")}
                  disabled={!ready}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-sm font-bold text-black transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Play size={16} fill="currentColor" />
                  {ready ? "Start the match" : `Waiting for ${playersNeeded} more`}
                </button>
                <p className="mt-2 text-center text-[11px] text-zinc-700">
                  Roles are assigned privately when you start
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function RuleRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[.025] p-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-zinc-500">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-zinc-700">{label}</div>
        <div className="mt-0.5 truncate text-sm font-medium text-zinc-300">{value}</div>
      </div>
    </div>
  );
}
