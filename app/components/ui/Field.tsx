"use client";

export function Field({
  label,
  value,
  onChange,
  placeholder,
  invalid = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-[.18em] text-zinc-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-black/40 px-4 py-3 outline-none transition placeholder:text-zinc-700 focus:border-cyan-400/40 ${
          invalid ? "border-red-400/50" : "border-white/10"
        }`}
      />
    </label>
  );
}
