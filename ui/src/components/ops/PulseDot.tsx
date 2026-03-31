// Pulse dot — animated status indicator

export function PulseDot({ color = "bg-green-500", size = "sm" }: { color?: string; size?: "sm" | "md" }) {
  const s = size === "md" ? "h-3 w-3" : "h-2 w-2";
  return (
    <span className="relative inline-flex">
      <span className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-50 animate-ping`} />
      <span className={`relative inline-flex ${s} rounded-full ${color}`} />
    </span>
  );
}
