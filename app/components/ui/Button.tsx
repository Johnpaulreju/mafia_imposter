"use client";

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  const styles =
    variant === "primary"
      ? "bg-white text-black hover:bg-zinc-200"
      : variant === "danger"
        ? "bg-red-500/15 text-red-200 border border-red-400/20 hover:bg-red-500/25"
        : "bg-white/5 border border-white/10 text-white hover:bg-white/10";

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
    >
      {children}
    </button>
  );
}
