"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Play,
  FileText,
  Activity,
  Code2,
  Video,
  BarChart3,
  Settings,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { BentoCard } from "@/components/ui/bento-card";
import { StatTile } from "@/components/ui/stat-tile";
import { ScoreNumeral } from "@/components/ui/score-numeral";
import { SectionCard } from "@/components/ui/section-card";
import { DataRow } from "@/components/ui/data-row";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { Toolbar } from "@/components/ui/toolbar";
import { Tabs, TabsList, TabTrigger, TabContent } from "@/components/ui/tabs";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast, RehearseToaster } from "@/components/ui/toast";

export default function UiKitDevPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 font-mono">
      <RehearseToaster />

      {/* 1. Page Header */}
      <PageHeader
        eyebrow="Design System / Aeris"
        title="Rehearse Component Kit"
        subtitle="Shared UI components following the AERIS design language: JetBrains Mono typography, dot-matrix numerals, #f0eded surfaces, #EBE8EB cards, and #F64302 accent."
        action={
          <Button
            onClick={() => {
              toast.success("Design system tokens verified!");
              setDialogOpen(true);
            }}
            className="rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white px-5 text-xs font-bold uppercase tracking-wider"
          >
            Launch Dialog
          </Button>
        }
      />

      {/* 2. Bento Grid & Stat Tiles */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
          01. Stat Tiles &amp; Bento Geometry
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile
            label="Interviews"
            value="14"
            icon={<Video className="w-4 h-4" />}
            delta={{ value: "+2 this week", trend: "up" }}
          />
          <StatTile
            label="Rounds Completed"
            value="28"
            icon={<CheckCircle2 className="w-4 h-4" />}
            delta={{ value: "+4", trend: "up" }}
          />
          <StatTile
            label="Skills Found"
            value="42"
            icon={<Sparkles className="w-4 h-4" />}
            delta={{ value: "+12", trend: "up" }}
          />
          <StatTile
            label="Target Roles"
            value="03"
            icon={<Activity className="w-4 h-4" />}
            delta={{ value: "Steady", trend: "neutral" }}
          />
        </div>
      </div>

      {/* 3. Score Numerals */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
          02. Score Numerals with Ring &amp; Bar Progress
        </h3>
        <div className="grid md:grid-cols-3 gap-3">
          <ScoreNumeral
            score={84}
            maxScore={100}
            label="Overall Readiness"
            verdict="Strong Hire"
            verdictType="positive"
            variant="ring"
          />
          <ScoreNumeral
            score={72}
            maxScore={100}
            label="Technical Round"
            verdict="Lean Hire"
            verdictType="warning"
            variant="ring"
          />
          <ScoreNumeral
            score={68}
            maxScore={100}
            label="System Design"
            verdict="Needs Practice"
            verdictType="negative"
            variant="bar"
          />
        </div>
      </div>

      {/* 4. Section Card & Data Rows */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
          03. Section Card &amp; Data Rows
        </h3>
        <SectionCard
          title="Recent Interviews"
          subtitle="Showing latest practice sessions conducted with Aria"
          action={{ label: "View All", onClick: () => toast.info("Viewing all interviews") }}
        >
          <DataRow
            icon={<Code2 className="w-4 h-4" />}
            title="Senior Full Stack Engineer — Stripe"
            meta="Completed 2 hours ago · Technical Round · 45 mins"
            trailingBadge={<StatusChip status="completed" />}
            action={{ label: "View Report", onClick: () => toast.info("Opening report") }}
          />
          <DataRow
            icon={<Sparkles className="w-4 h-4" />}
            title="Distributed Systems Architect — Google"
            meta="Yesterday · Behavioral & System Design"
            trailingBadge={<StatusChip status="partial" />}
            action={{ label: "Resume", onClick: () => toast.info("Resuming session") }}
          />
        </SectionCard>
      </div>

      {/* 5. Status Chips */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
          04. Status Chips (WCAG AA Compliant)
        </h3>
        <div className="flex flex-wrap gap-2.5 p-4 rounded-2xl bg-[#EBE8EB] dark:bg-[#141414] border border-black/[0.04]">
          <StatusChip status="completed" />
          <StatusChip status="in_progress" />
          <StatusChip status="partial" />
          <StatusChip status="failed" />
          <StatusChip status="not_analysed" />
        </div>
      </div>

      {/* 6. Tabs & Toolbar */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
          05. Tabs &amp; Toolbar
        </h3>
        <Toolbar
          searchValue={searchVal}
          onSearchChange={setSearchVal}
          searchPlaceholder="Filter items..."
          actions={
            <Button
              onClick={() => toast.success("Filtered")}
              className="rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-mono"
            >
              Apply Filter
            </Button>
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList ariaLabel="UI Kit Demo Tabs">
            <TabTrigger value="overview" icon={<BarChart3 className="w-3.5 h-3.5" />}>
              Overview
            </TabTrigger>
            <TabTrigger value="details" icon={<FileText className="w-3.5 h-3.5" />}>
              Detailed Specs
            </TabTrigger>
            <TabTrigger value="settings" icon={<Settings className="w-3.5 h-3.5" />}>
              Tokens
            </TabTrigger>
          </TabsList>

          <TabContent value="overview">
            <BentoCard padded="normal">
              <p className="text-xs text-muted-foreground">
                Overview tab content displayed with smooth fade transition and keyboard arrow navigation.
              </p>
            </BentoCard>
          </TabContent>
          <TabContent value="details">
            <BentoCard padded="normal">
              <p className="text-xs text-muted-foreground">
                Detailed specs: #f0eded background, #EBE8EB cards, JetBrains Mono font, bubbledot numerals.
              </p>
            </BentoCard>
          </TabContent>
          <TabContent value="settings">
            <BentoCard padded="normal">
              <p className="text-xs text-muted-foreground">
                Tokens: Accent #F64302, Radius: 2xl (16px), 2-3px compact gaps, prefers-reduced-motion safe.
              </p>
            </BentoCard>
          </TabContent>
        </Tabs>
      </div>

      {/* 7. Empty State & Skeleton Loading */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
            06. Empty State with Contour Texture
          </h3>
          <EmptyState
            title="No Documents Uploaded"
            description="Upload your resume or target job description to personalize your rehearsal sessions with Aria."
            action={{ label: "Upload Resume", onClick: () => toast.info("Opening upload modal") }}
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
            07. Skeleton Loading Placeholder
          </h3>
          <SkeletonCard lines={3} hasHeader hasLeadingIcon />
        </div>
      </div>

      {/* Dialog Demo */}
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Interactive Dialog Demo"
        description="Accessible modal dialog with backdrop blur, focus trap, and keyboard Escape listener."
      >
        <p className="text-xs text-muted-foreground leading-relaxed">
          The dialog component encapsulates responsive sizing, proper ARIA attributes, and cohesive AERIS styling.
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <Button
            onClick={() => setDialogOpen(false)}
            className="rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-semibold"
          >
            Close Dialog
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
