"use client";

const avatarGlyph: Record<string, string> = {
  fox: "🦊",
  owl: "🦉",
  cat: "🐈",
  raven: "🐦‍⬛",
  wolf: "🐺",
  bear: "🐻",
  deer: "🦌",
  snake: "🐍",
  rabbit: "🐇",
  tiger: "🐯",
  panda: "🐼",
  crow: "🐦",
};

export function Avatar({ id, large = false }: { id: string; large?: boolean }) {
  return (
    <div
      className={`${
        large ? "h-16 w-16 text-4xl" : "h-11 w-11 text-2xl"
      } grid place-items-center rounded-2xl border border-white/10 bg-white/5`}
    >
      {avatarGlyph[id] ?? "🙂"}
    </div>
  );
}

export { avatarGlyph };
