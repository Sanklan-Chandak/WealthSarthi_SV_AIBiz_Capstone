import { cn } from "@/lib/utils";

export function ChatHeaderBlock({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("gap-2 flex flex-1 items-center", className)}>
      {children}
    </div>
  );
}

export function ChatHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full flex items-center justify-between py-4 px-5 bg-gradient-to-b from-background/95 via-background/90 to-background/0 backdrop-blur-md border-b border-border/60">
      {children}
    </div>
  );
}
