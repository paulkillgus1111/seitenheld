"use client";

import { useMemo, useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type EventOption = {
  id: string;
  name: string;
};

type EventSwitcherProps = {
  events: EventOption[];
  selectedEventId?: string | null;
};

export function EventSwitcher({ events, selectedEventId }: EventSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  const options = useMemo(() => events ?? [], [events]);
  const hasEvents = options.length > 0;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "") {
      params.set("eventId", value);
    } else {
      params.delete("eventId");
    }
    const query = params.toString();
    const newUrl = query ? `${pathname}?${query}` : pathname;
    // Use router.replace for client-side navigation (works with client components)
    router.replace(newUrl);
  };

  const currentValue = selectedEventId ?? (hasEvents ? options[0]?.id : "");

  if (!isMounted) {
    return (
      <div className="flex flex-col gap-2">
        <Label className="text-sm text-muted-foreground">Event auswählen</Label>
        <div className="w-[260px] h-10 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm text-muted-foreground">Event auswählen</Label>
      <Select
        disabled={!hasEvents}
        value={currentValue}
        onValueChange={handleChange}
      >
        <SelectTrigger className="w-[260px]">
          <SelectValue placeholder={hasEvents ? "Event wählen" : "Keine Events"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((event) => (
            <SelectItem key={event.id} value={event.id}>
              {event.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
