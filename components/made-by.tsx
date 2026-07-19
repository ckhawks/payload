import { cn } from "@/lib/utils";

/**
 * "Made by Stellaric" footer pill. The logo is inlined with fill=currentColor
 * so it adapts to the theme; the pill is full-strength while the lead-in text
 * stays muted.
 */
export function MadeBy({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "text-muted-foreground flex items-center justify-center gap-1.5 text-xs",
        className,
      )}
    >
      Made by
      <a
        href="https://stellaric.pw"
        target="_blank"
        rel="noreferrer"
        className="border-border text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-2 transition-colors"
      >
        <svg
          viewBox="0 0 1024 1024"
          fill="currentColor"
          aria-hidden="true"
          className="size-4"
        >
          <path d="M203 641.88H381.8C381.8 713.68 440 771.92 511.84 771.92V950.72C341.28 950.72 203 812.44 203 641.88Z" />
          <path d="M511.84 601.24C341.28 601.24 203 462.96 203 292.4H381.8C381.8 364.2 440 422.44 511.84 422.44C682.4 422.44 820.68 560.72 820.68 731.28H641.88C641.88 659.48 583.68 601.24 511.84 601.24Z" />
          <path d="M820.68 381.8H641.88C641.88 310 583.68 251.76 511.84 251.76V73C682.387 73 820.658 211.258 820.68 381.8Z" />
        </svg>
        <span className="font-medium">Stellaric</span>
      </a>
    </p>
  );
}
