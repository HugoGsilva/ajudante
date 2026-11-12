import { Button } from "@ajudante/ui/components/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { monthTitle, shiftMonth } from "@/lib/month";

export function MonthSwitch({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11"
        aria-label="Mês anterior"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <ChevronLeftIcon />
      </Button>
      <p className="w-40 text-center text-sm font-medium">{monthTitle(month)}</p>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11"
        aria-label="Próximo mês"
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}
