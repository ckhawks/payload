"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeleteButton({
  action,
  confirmLabel = "Delete this item?",
}: {
  action: () => Promise<void>;
  confirmLabel?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="icon-sm"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmLabel)) return;
        startTransition(async () => {
          await action();
          toast.success("Deleted");
        });
      }}
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}
