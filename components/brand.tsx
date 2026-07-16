import { cn } from "@/lib/utils";

/**
 * The wordmark: monospace, with a blinking block caret for a slight terminal feel.
 */
export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("font-mono font-medium tracking-tight", className)}>
      <span className="text-muted-foreground">~/</span>
      payload
      <span className="caret text-muted-foreground">▌</span>
    </span>
  );
}
