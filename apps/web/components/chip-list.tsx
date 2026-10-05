"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";

export function ChipList({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value) return;
    if (!values.includes(value)) onChange([...values, value]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <div className="flex min-h-[88px] flex-wrap content-start gap-2 rounded border border-border bg-background p-3">
        {values.length === 0 ? <span className="text-sm text-muted">None yet</span> : null}
        {values.map((label) => (
          <Chip key={label} label={label} onRemove={() => onChange(values.filter((v) => v !== label))} />
        ))}
      </div>
      <Input
        value={draft}
        placeholder={placeholder ?? "Add and press Enter"}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
      />
    </div>
  );
}
