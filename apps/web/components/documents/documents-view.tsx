"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  UploadCloud,
  Search,
  Sparkles,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { BentoCard } from "@/components/ui/bento-card";
import { Toolbar } from "@/components/ui/toolbar";
import { DataRow } from "@/components/ui/data-row";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { resumeParsedSchema, jdParsedSchema } from "@rehearse/shared";

interface DocumentsViewProps {
  initialResumes: any[];
  initialJds: any[];
}

export function DocumentsView({ initialResumes, initialJds }: DocumentsViewProps) {
  const [resumes, setResumes] = useState(initialResumes);
  const [jds, setJds] = useState(initialJds);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "resume" | "jd">("all");
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/resumes", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.resume) throw new Error(data.error?.message || "Upload failed");
      setResumes([data.resume, ...resumes]);
      setShowUploadZone(false);
      toast.success(`Uploaded and parsed ${file.name}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to parse document");
    } finally {
      setUploading(false);
    }
  };

  // Filter items
  const filteredResumes = resumes.filter((r) => {
    if (filterType === "jd") return false;
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const parsed = resumeParsedSchema.safeParse(r.parsed);
    const skills = parsed.success ? parsed.data.skills.join(" ").toLowerCase() : "";
    return r.fileName.toLowerCase().includes(query) || skills.includes(query);
  });

  const filteredJds = jds.filter((j) => {
    if (filterType === "resume") return false;
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const parsed = jdParsedSchema.safeParse(j.parsed);
    const skills = parsed.success ? parsed.data.requiredSkills.join(" ").toLowerCase() : "";
    return j.title.toLowerCase().includes(query) || skills.includes(query);
  });

  const totalCount = filteredResumes.length + filteredJds.length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-mono pb-12">
      {/* Page Header */}
      <PageHeader
        eyebrow="Candidate Dossier"
        title="Your documents"
        subtitle="Manage uploaded resumes and target job descriptions used by Aria to personalize your interview evaluations."
        action={
          <Button
            onClick={() => setShowUploadZone((v) => !v)}
            className="rounded-xl bg-[#F64302] hover:bg-[#d93800] text-white px-5 text-xs font-bold uppercase tracking-wider shadow-md shadow-[#F64302]/20 gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Upload document</span>
          </Button>
        }
      />

      {/* Drag & Drop Upload Zone (Collapsible / Toggleable) */}
      {showUploadZone && (
        <BentoCard padded="normal" className="border-2 border-dashed border-[#F64302]/40 bg-[#F64302]/5 animate-in fade-in-50 duration-200">
          <label
            className={`flex cursor-pointer flex-col items-center justify-center p-8 transition-colors ${
              dragOver ? "bg-[#F64302]/10" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) void handleFileUpload(file);
            }}
          >
            <div className="h-12 w-12 rounded-2xl bg-[#F64302]/15 text-[#F64302] flex items-center justify-center mb-3">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="font-jetbrains font-bold text-sm text-foreground">
              {uploading ? "Extracting skills and entities…" : "Drop resume file here or click to browse"}
            </p>
            <p className="font-mono text-xs text-muted-foreground mt-1">
              Supports PDF, DOCX, TXT up to 5MB
            </p>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileUpload(file);
              }}
              disabled={uploading}
            />
          </label>
        </BentoCard>
      )}

      {/* Toolbar: Search & Type Filter Chips */}
      <Toolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by document title or skill keyword…"
        filters={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`rounded-xl px-3 py-1.5 text-xs font-mono font-semibold transition-colors ${
                filterType === "all"
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                  : "bg-white/60 dark:bg-black/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({resumes.length + jds.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("resume")}
              className={`rounded-xl px-3 py-1.5 text-xs font-mono font-semibold transition-colors ${
                filterType === "resume"
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                  : "bg-white/60 dark:bg-black/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              Resumes ({resumes.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("jd")}
              className={`rounded-xl px-3 py-1.5 text-xs font-mono font-semibold transition-colors ${
                filterType === "jd"
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                  : "bg-white/60 dark:bg-black/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              Target Roles ({jds.length})
            </button>
          </div>
        }
      />

      {/* Document Grid / Rows */}
      {totalCount === 0 ? (
        <EmptyState
          title="No matching documents found"
          description={
            search
              ? `No documents matched "${search}". Try searching for another skill or keyword.`
              : "Upload your resume or add a target job description to get started."
          }
          action={{
            label: "Upload document",
            onClick: () => setShowUploadZone(true),
          }}
        />
      ) : (
        <div className="space-y-6">
          {/* Resumes Group */}
          {filteredResumes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                  Resumes ({filteredResumes.length})
                </span>
              </div>
              <div className="space-y-2.5">
                {filteredResumes.map((r) => {
                  const parsed = resumeParsedSchema.safeParse(r.parsed);
                  const skills = parsed.success ? parsed.data.skills : [];
                  const atsScore = r.atsAnalysis?.overallAtsScore;

                  return (
                    <DataRow
                      key={r.id}
                      icon={<FileText className="w-4 h-4 text-[#F64302]" />}
                      title={r.fileName}
                      meta={
                        <>
                          <span>Added {new Date(r.createdAt).toLocaleDateString()}</span>
                          <span>·</span>
                          <span className="text-foreground font-semibold">
                            <span className="font-bubbledot font-bold text-[#F64302]">
                              {skills.length}
                            </span>{" "}
                            skills indexed
                          </span>
                          {skills.length > 0 && (
                            <span className="hidden sm:inline text-muted-foreground truncate max-w-sm">
                              ({skills.slice(0, 4).join(", ")}
                              {skills.length > 4 ? "…" : ""})
                            </span>
                          )}
                        </>
                      }
                      trailingBadge={
                        <div className="flex items-center gap-2">
                          {atsScore !== undefined && (
                            <span className="rounded-lg bg-[#F64302]/10 border border-[#F64302]/20 px-2.5 py-0.5 text-xs font-mono font-bold text-[#F64302]">
                              ATS {atsScore}%
                            </span>
                          )}
                          <span className="rounded-lg bg-black/5 dark:bg-white/10 px-2 py-0.5 text-[10px] font-mono text-muted-foreground uppercase font-bold">
                            Resume
                          </span>
                        </div>
                      }
                      action={{
                        label: atsScore ? "View ATS" : "Analyze",
                        href: "/analyzer/resume",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Job Descriptions Group */}
          {filteredJds.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                  Target Job Roles ({filteredJds.length})
                </span>
              </div>
              <div className="space-y-2.5">
                {filteredJds.map((j) => {
                  const parsed = jdParsedSchema.safeParse(j.parsed);
                  const reqSkills = parsed.success ? parsed.data.requiredSkills : [];

                  return (
                    <DataRow
                      key={j.id}
                      icon={<FileText className="w-4 h-4 text-[#F64302]" />}
                      title={j.title}
                      meta={
                        <>
                          <span>Added {new Date(j.createdAt).toLocaleDateString()}</span>
                          <span>·</span>
                          <span className="text-foreground font-semibold">
                            <span className="font-bubbledot font-bold text-[#F64302]">
                              {reqSkills.length}
                            </span>{" "}
                            required skills
                          </span>
                          {reqSkills.length > 0 && (
                            <span className="hidden sm:inline text-muted-foreground truncate max-w-sm">
                              ({reqSkills.slice(0, 4).join(", ")}
                              {reqSkills.length > 4 ? "…" : ""})
                            </span>
                          )}
                        </>
                      }
                      trailingBadge={
                        <span className="rounded-lg bg-black/5 dark:bg-white/10 px-2 py-0.5 text-[10px] font-mono text-muted-foreground uppercase font-bold">
                          Job Spec
                        </span>
                      }
                      action={{
                        label: "Start rehearsal",
                        href: "/interview",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
