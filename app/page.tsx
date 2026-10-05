"use client";

import { useEffect, useState } from "react";
import { AVATARS, DEFAULT_CONFIG } from "@/lib/constants";
import { actionId } from "@/lib/id";
import { getWSClient } from "@/lib/ws-client";
import type { ClientSnapshot, MatchConfig } from "@/lib/types";

import { Landing } from "@/app/components/game/Landing";
import { Onboarding, Lobby, Game } from "@/app/components/game";

export default function Home() {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [triedContinue, setTriedContinue] = useState(false);
  const [mode, setMode] = useState<
    "welcome" | "choice" | "host" | "join" | "lobby" | "game"
  >("welcome");
  const [roomCode, setRoomCode] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [state, setState] = useState<ClientSnapshot | null>(null);
  const [error, setError] = useState("");
  const [onboard, setOnboard] = useState(false);
  const [onboardStep, setOnboardStep] = useState(0);
  const [config, setConfig] = useState<MatchConfig>(DEFAULT_CONFIG);
  const [sound, setSound] = useState(false);

  // Restore session from localStorage and URL params
  useEffect(() => {
    const s = localStorage.getItem("mafia_session");
    if (s) setSessionId(s);
    const r = new URLSearchParams(location.search).get("room");
    if (r) setRoomCode(r.toUpperCase());
  }, []);

  // API helper
  async function api(path: string, body: unknown) {
    const r = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Something went wrong");
    return j;
  }

  // Create room
  async function host() {
    setError("");
    if (!name.trim() || !avatar)
      return setError("Name and avatar required.");
    try {
      const j = await api("/api/rooms", {
        action: "create",
        name: name.trim(),
        avatarId: avatar,
        config,
      });
      localStorage.setItem("mafia_session", j.sessionId);
      setSessionId(j.sessionId);
      setRoomCode(j.roomCode);
      setMode("lobby");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create room");
    }
  }

  // Join room
  async function join() {
    setError("");
    if (!name.trim() || !avatar)
      return setError("Name and avatar required.");
    if (roomCode.trim().length < 4)
      return setError("Enter the room code.");
    try {
      const j = await api("/api/rooms", {
        action: "join",
        name: name.trim(),
        avatarId: avatar,
        roomCode: roomCode.trim().toUpperCase(),
      });
      localStorage.setItem("mafia_session", j.sessionId);
      setSessionId(j.sessionId);
      setRoomCode(j.roomCode);
      setMode("lobby");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to join room");
    }
  }

  // WebSocket connection
  useEffect(() => {
    if (!sessionId) return;
    const client = getWSClient();
    client.connect(sessionId);
    const unsubscribeSnapshot = client.onSnapshot((snapshot) => {
      setState(snapshot);
      setRoomCode(snapshot.roomCode);
      setMode(snapshot.phase === "LOBBY" ? "lobby" : "game");
    });
    const unsubscribeError = client.onError((msg) => setError(msg));
    return () => {
      unsubscribeSnapshot();
      unsubscribeError();
    };
  }, [sessionId]);

  // Send action via WebSocket
  const send = (type: string, payload?: Record<string, unknown>) => {
    const client = getWSClient();
    client.send({ type, actionId: actionId(), payload });
  };

  // Show tutorial
  if (onboard) {
    return (
      <Onboarding
        step={onboardStep}
        setStep={setOnboardStep}
        close={() => setOnboard(false)}
      />
    );
  }

  // Show lobby
  if (mode === "lobby" && state) {
    return (
      <Lobby
        state={state}
        send={send}
        config={config}
        setConfig={setConfig}
        error={error}
        setError={setError}
        roomCode={roomCode}
      />
    );
  }

  // Show game
  if (mode === "game" && state) {
    return <Game state={state} send={send} />;
  }

  // Show landing page
  return (
    <Landing
      name={name}
      setName={setName}
      avatar={avatar}
      setAvatar={setAvatar}
      onCreateRoom={host}
      onJoinRoom={join}
      onShowTutorial={() => setOnboard(true)}
      error={error}
      setError={setError}
      sound={sound}
      setSound={setSound}
      roomCode={roomCode}
      setRoomCode={setRoomCode}
      triedContinue={triedContinue}
      setTriedContinue={setTriedContinue}
      mode={mode as "welcome" | "choice" | "host" | "join"}
      setMode={(m: "welcome" | "choice" | "host" | "join") => setMode(m)}
    />
  );
}
