"use client";

import { useState } from "react";
import { ArrowRight, BookOpen, Info, LogIn, Plus, Crown, Volume2 } from "lucide-react";
import { AVATARS } from "@/lib/constants";
import { Button, Avatar, Field, Choice, avatarGlyph } from "@/app/components/ui";

export function Landing({
  name,
  setName,
  avatar,
  setAvatar,
  onCreateRoom,
  onJoinRoom,
  onShowTutorial,
  error,
  setError,
  sound,
  setSound,
  roomCode,
  setRoomCode,
  triedContinue,
  setTriedContinue,
  mode,
  setMode,
}: {
  name: string;
  setName: (s: string) => void;
  avatar: string;
  setAvatar: (s: string) => void;
  onCreateRoom: () => Promise<void>;
  onJoinRoom: () => Promise<void>;
  onShowTutorial: () => void;
  error: string;
  setError: (s: string) => void;
  sound: boolean;
  setSound: (v: boolean) => void;
  roomCode: string;
  setRoomCode: (s: string) => void;
  triedContinue: boolean;
  setTriedContinue: (v: boolean) => void;
  mode: "welcome" | "choice" | "host" | "join";
  setMode: (m: "welcome" | "choice" | "host" | "join") => void;
}) {
  const missingName = !name.trim();
  const missingAvatar = !avatar;

  function profileReady() {
    setTriedContinue(true);
    if (missingName || missingAvatar) {
      setError(
        missingName && missingAvatar
          ? "Type your name and choose an avatar."
          : missingName
            ? "Type your name."
            : "Choose an avatar."
      );
      return false;
    }
    setError("");
    return true;
  }

  function proceedToChoice() {
    if (profileReady()) setMode("choice");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-grid">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-cyan-400/8 blur-[120px]" />
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <section>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_#67e8f9]" />{" "}
              PRIVATE LOBBY · REALTIME
            </div>
            <h1 className="max-w-3xl text-6xl font-black tracking-[-.055em] sm:text-7xl">
              Trust no one.
              <br />
              <span className="text-gradient">Find the Mafia.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">
              A cinematic social-deduction party game built for friends — secret
              roles, fast mini-games, suspicious votes, and a new mystery every
              round.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={onShowTutorial}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                <Info size={16} /> How to play
              </button>
            </div>
          </section>

          <section
            id="player-setup"
            className="glass glow rounded-[28px] p-6 sm:p-8"
          >
            <div className="mb-7">
              <div className="text-xs uppercase tracking-[.2em] text-zinc-500">
                {mode === "welcome"
                  ? "Step 1 of 3"
                  : mode === "choice"
                    ? "Step 2 of 3"
                    : "Step 3 of 3"}
              </div>
              <h2 className="mt-2 text-2xl font-bold">
                {mode === "welcome"
                  ? "Who are you?"
                  : mode === "choice"
                    ? "Host or join?"
                    : "Join the room"}
              </h2>
            </div>

            {mode === "welcome" && (
              <>
                <Field
                  label="Display name"
                  value={name}
                  onChange={(v) => {
                    setName(v);
                    setError("");
                  }}
                  placeholder="e.g. John"
                  invalid={triedContinue && missingName}
                />
                <div className="mt-6">
                  <div
                    className={`mb-3 text-xs uppercase tracking-[.18em] ${
                      triedContinue && missingAvatar
                        ? "text-red-300"
                        : "text-zinc-500"
                    }`}
                  >
                    Choose your avatar
                  </div>
                  <div
                    className={`grid grid-cols-6 gap-2 rounded-2xl ${
                      triedContinue && missingAvatar
                        ? "ring-1 ring-red-400/50 ring-offset-4 ring-offset-transparent"
                        : ""
                    }`}
                  >
                    {AVATARS.map((a) => (
                      <button
                        key={a}
                        onClick={() => {
                          setAvatar(a);
                          setError("");
                        }}
                        className={`grid aspect-square place-items-center rounded-xl border text-2xl transition ${
                          avatar === a
                            ? "border-cyan-300/50 bg-cyan-300/10"
                            : "border-white/8 bg-white/[.025] hover:bg-white/10"
                        }`}
                      >
                        {avatarGlyph[a]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-7 grid gap-3">
                  <Button onClick={proceedToChoice}>
                    Next <ArrowRight size={16} />
                  </Button>
                </div>
              </>
            )}

            {mode === "choice" && (
              <>
                <div className="space-y-3">
                  <Choice
                    active={true}
                    icon={<Crown size={20} />}
                    title="Host a game"
                    subtitle="Create a new room and invite friends."
                    onClick={() => {
                      setMode("host");
                      setError("");
                    }}
                  />
                  <Choice
                    active={true}
                    icon={<LogIn size={20} />}
                    title="Join a game"
                    subtitle="Enter your friend's room code."
                    onClick={() => {
                      setMode("join");
                      setError("");
                    }}
                  />
                </div>
                <div className="mt-6">
                  <Button
                    variant="ghost"
                    onClick={() => setMode("welcome")}
                  >
                    Back
                  </Button>
                </div>
              </>
            )}

            {mode === "host" && (
              <>
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 mb-5">
                  <div className="flex items-center gap-2 text-sm text-emerald-200">
                    <Plus size={16} /> Ready to create a room?
                  </div>
                </div>
                <div className="mt-6 grid gap-3">
                  <Button onClick={onCreateRoom}>
                    <Crown size={16} /> Create room
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setMode("choice")}
                  >
                    Back
                  </Button>
                </div>
              </>
            )}

            {mode === "join" && (
              <>
                <Field
                  label="Room code"
                  value={roomCode}
                  onChange={(v) => {
                    setRoomCode(v.toUpperCase());
                    setError("");
                  }}
                  placeholder="e.g. AB12CD"
                />
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setMode("choice")}
                  >
                    Back
                  </Button>
                  <Button onClick={onJoinRoom}>
                    <LogIn size={16} /> Join
                  </Button>
                </div>
              </>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              onClick={() => setSound(!sound)}
              className="mt-5 flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300"
            >
              <Volume2 size={14} /> Sound {sound ? "enabled" : "off"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
