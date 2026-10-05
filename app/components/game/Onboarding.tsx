"use client";

import { ArrowRight, Users, Skull, Gamepad2, Sparkles, X } from "lucide-react";
import { Button } from "@/app/components/ui";

const items = [
  {
    icon: <Users />,
    title: "Create or join a room",
    text: "Pick an avatar, enter a name, then share the room code with your friends.",
  },
  {
    icon: <Skull />,
    title: "Roles stay secret",
    text: "One or more players are Mafia. Connected Mafia know their teammates; Blind Mafia do not.",
  },
  {
    icon: <Gamepad2 />,
    title: "Survive the rounds",
    text: "Complete a mini-game while Mafia chooses a target. Then discuss, vote, and investigate.",
  },
  {
    icon: <Sparkles />,
    title: "Every death becomes a mystery",
    text: "In-person groups get one narrator. Remote players see the story on their own screens.",
  },
];

export function Onboarding({
  step,
  setStep,
  close,
}: {
  step: number;
  setStep: (n: number) => void;
  close: () => void;
}) {
  const x = items[step];

  return (
    <main className="grid min-h-screen place-items-center bg-grid px-6">
      <div className="glass w-full max-w-lg rounded-[30px] p-8">
        <div className="mb-8 flex justify-between">
          <span className="text-xs uppercase tracking-[.2em] text-zinc-500">
            How to play · {step + 1}/4
          </span>
          <button onClick={close}>
            <X size={18} className="text-zinc-500" />
          </button>
        </div>

        <div className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200">
          {x.icon}
        </div>

        <h2 className="text-3xl font-bold">{x.title}</h2>
        <p className="mt-4 leading-7 text-zinc-400">{x.text}</p>

        <div className="mt-10 flex items-center justify-between">
          <button
            onClick={close}
            className="text-sm text-zinc-500 hover:text-white"
          >
            Skip
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)}>
                Next <ArrowRight size={16} />
              </Button>
            ) : (
              <Button onClick={close}>Let's play</Button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
