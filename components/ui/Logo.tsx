export default function Logo({ size = 26 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-lg bg-gold-grad font-mono font-bold text-ink-950"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      S
    </div>
  );
}
