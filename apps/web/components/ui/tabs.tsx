"use client";

import React, { createContext, useContext, useId } from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  selectedTab: string;
  onSelectTab: (val: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps {
  value: string;
  onValueChange: (val: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  const baseId = useId();
  return (
    <TabsContext.Provider value={{ selectedTab: value, onSelectTab: onValueChange, baseId }}>
      <div className={cn("space-y-4", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function TabsList({ children, className, ariaLabel = "Navigation Tabs" }: TabsListProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsList must be used inside Tabs");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])')
    );
    const currentIndex = tabs.findIndex((t) => t === document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn(
        "inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04] dark:border-white/[0.08] font-mono text-xs overflow-x-auto max-w-full",
        className
      )}
    >
      {children}
    </div>
  );
}

export interface TabTriggerProps {
  value: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function TabTrigger({ value, children, icon, disabled = false, className }: TabTriggerProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabTrigger must be used inside Tabs");

  const isSelected = ctx.selectedTab === value;
  const tabId = `${ctx.baseId}-tab-${value}`;
  const panelId = `${ctx.baseId}-panel-${value}`;

  return (
    <button
      id={tabId}
      role="tab"
      type="button"
      aria-selected={isSelected}
      aria-controls={panelId}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      onClick={() => ctx.onSelectTab(value)}
      className={cn(
        "relative flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-xs font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#F64302] select-none shrink-0",
        isSelected
          ? "bg-black text-white dark:bg-white dark:text-black shadow-sm font-bold"
          : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5",
        disabled && "opacity-40 cursor-not-allowed",
        className
      )}
    >
      {icon && <span className={cn(isSelected ? "text-[#F64302]" : "text-inherit")}>{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

export interface TabContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabContent({ value, children, className }: TabContentProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabContent must be used inside Tabs");

  const isSelected = ctx.selectedTab === value;
  const tabId = `${ctx.baseId}-tab-${value}`;
  const panelId = `${ctx.baseId}-panel-${value}`;

  if (!isSelected) return null;

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      tabIndex={0}
      className={cn("outline-none animate-in fade-in-50 duration-200", className)}
    >
      {children}
    </div>
  );
}
