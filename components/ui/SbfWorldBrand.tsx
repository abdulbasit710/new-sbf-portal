type SbfWorldBrandProps = {
  compact?: boolean;
  className?: string;
};

export default function SbfWorldBrand({
  compact = false,
  className = "",
}: SbfWorldBrandProps) {
  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      <div
        className={`relative shrink-0 ${
          compact ? "h-11 w-11" : "h-16 w-16"
        }`}
      >
        <span className="absolute inset-[18%] rounded-full bg-gold/20 blur-xl" />
        <img
          src="/sbf-world-logo-transparent.png"
          alt="SBF WORLD"
          className="relative h-full w-full object-contain [filter:drop-shadow(0_0_5px_rgba(244,201,91,0.48))_drop-shadow(0_0_16px_rgba(212,175,55,0.2))]"
        />
      </div>
      <div className="min-w-0 leading-none">
        <div className={`${compact ? "text-xs" : "text-sm"} truncate font-mono tracking-[0.2em] text-chalk`}>
          SBF·WORLD
        </div>
        <div className="label-mono mt-1.5 truncate text-gold">PARTNER PORTAL</div>
      </div>
    </div>
  );
}
