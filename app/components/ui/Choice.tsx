"use client";

export function Choice({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        active
          ? "border-cyan-300/40 bg-cyan-300/10"
          : "border-white/8 bg-white/[.025] hover:bg-white/[.05]"
      }`}
    >
      <div className="flex gap-3">
        <div className="mt-0.5 text-cyan-200">{icon}</div>
        <div>
          <div className="font-semibold">{title}</div>
          <div className="mt-1 text-xs leading-5 text-zinc-500">{subtitle}</div>
        </div>
      </div>
    </button>
  );
}
