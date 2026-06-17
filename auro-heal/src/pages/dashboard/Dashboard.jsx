import React, { useState, useMemo } from "react";
import { EnvCard } from "../../components/EnvCard.jsx";
import { SevBadge } from "../../components/Badges.jsx";
import { IconSearch } from "../../components/Icons.jsx";
import {
  IconServerBolt, IconAlertCircle, IconShieldCheck, IconActivityHeartbeat,
  IconFileAnalytics,
  IconServer,
  IconAlertTriangle,
  IconCircleCheck,
  IconBox,
  IconApi,
  IconFunction,
  IconBrandAzure,
} from '@tabler/icons-react';
const LOGO_BG = { aws: 'bg-[#ff7b23]', azure: 'bg-[#2a5ec4]', gcp: 'bg-[#1e8c4a]', vps: 'bg-[#5a3c9a]' };
const ENV_CLASSES = {
  aws: "bg-gradient-to-r from-[#ff7b23] to-[#ff9d5c] text-white",
  azure: "bg-gradient-to-r from-[#2a5ec4] to-[#5f8ee8] text-white",
  gcp: "bg-gradient-to-r from-[#1e8c4a] to-[#3dbb6b] text-white",
  vps: "bg-gradient-to-r from-[#5a3c9a] to-[#8b6dd1] text-white",
};

function ShimmerRow() {
  return (
    <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr_1.6fr_0.5fr_0.6fr_80px] gap-3 items-center px-4 py-4 border-b border-lines animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-32 bg-neutral-200 rounded-md" />
        <div className="h-2 w-20 bg-neutral-100 rounded-md" />
      </div>
      <div className="h-6 w-16 bg-neutral-200 rounded-full" />
      <div className="h-6 w-20 bg-neutral-200 rounded-full" />
      <div className="space-y-2">
        <div className="h-3 w-40 bg-neutral-200 rounded-md" />
        <div className="h-2 w-28 bg-neutral-100 rounded-md" />
      </div>
      <div className="h-3 w-8 bg-neutral-200 rounded-md" />
      <div className="h-3 w-16 bg-neutral-200 rounded-md" />
      <div className="h-9 w-16 bg-neutral-300 rounded-md" />
    </div>
  );
}

function EnvShimmer() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-raised border border-line rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-200" />
              <div className="space-y-2">
                <div className="h-3 w-20 bg-neutral-200 rounded-md" />
                <div className="h-2 w-14 bg-neutral-100 rounded-md" />
              </div>
            </div>
            <div className="h-3 w-12 bg-neutral-200 rounded-md" />
          </div>
          <div className="flex gap-3">
            <div className="h-3 w-14 bg-neutral-200 rounded-md" />
            <div className="h-3 w-14 bg-neutral-200 rounded-md" />
            <div className="h-3 w-14 bg-neutral-200 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AppTypeIcon({ app }) {
  const type = (app.type || app.env || "").toLowerCase();

  if (type.includes("lambda")) {
    return <IconFunction size={14} stroke={1.8} />;
  }

  if (type.includes("api")) {
    return <IconApi size={14} stroke={1.8} />;
  }

  if (
    type.includes("function") ||
    type.includes("azure")
  ) {
    return <IconBrandAzure size={14} stroke={1.8} />;
  }

  return <span>-</span>;
}

function AppRow({ app, onFix }) {
  return (
    <div
      className="grid grid-cols-[1.4fr_0.7fr_0.7fr_1.6fr_0.5fr_0.6fr_80px] gap-3 items-center px-4 py-3.5 border-b border-lines last:border-0 hover:bg-canvas cursor-pointer transition-colors text-sm"
      onClick={() => app.occurrences != 0 && onFix(app)}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-md flex justify-center shrink-0 items-center text-white ${LOGO_BG[app.env] ?? "bg-slate-700"
            }`}
        >

          <IconBox stroke={2} size={18} />
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="font-semibold text-[14px]">{app.name}</div>
          <div className="font-mono text-[11px] text-ink-mute">
            {app.lang}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center">
        <p className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-medium uppercase tracking-wide ${ENV_CLASSES[app.env] ?? ENV_CLASSES.vps}`}>
          <AppTypeIcon app={app} />
          <span>{app.env?.toUpperCase()}</span>
          <span>{app.type?.toUpperCase()}</span>
        </p>

      </div>
      <div>
        <SevBadge sev={app.severity} />
      </div>
      <div className="min-w-0">
        <div
          className="font-mono text-[12px] line-clamp-3"
          style={{ wordBreak: "break-word" }}
        >
          {app.errorType}
        </div>

        <div
          className="font-mono text-[11px] text-ink-mute mt-0.5 line-clamp-3"
          style={{ wordBreak: "break-word" }}
        >
          {app.error}
        </div>
      </div>
      <div
        className={`font-mono font-semibold ${app.occurrences > 0 ? "text-red-500" : "text-ink-mute"}`}
      >
        {app.occurrences}
      </div>
      <div className="font-mono text-[12px] text-ink-mute">{app.lastSeen}</div>
      <div>
        <button

          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[7px] text-xs font-semibold transition-colors ${app.occurrences === 0
            ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
            : "bg-ink text-raised hover:bg-[#2a2926]"
            }`}
          onClick={(e) => {
            e.stopPropagation();
            app.occurrences != 0 && onFix(app)
          }}
        >
          <span
            className={`w-2 h-2 rounded-full ${app.occurrences === 0 ? "bg-gray-400" : "bg-teal shadow-[0_0_0_2px_rgba(255,255,255,0.1)]"}`}
          />
          {app.occurrences === 0 ? "Healthy" : "Fix"}
        </button>
      </div>
    </div>
  );
}

export function Dashboard({
  envData,
  errorApps,
  onFix,
  loading,
  envEmphasis = "cards",
}) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 1. Filter  2. Sort: errors first, then by latest  3. Optionally hide healthy
  const filtered = useMemo(() => {
    let list = errorApps.filter((a) => {
      if (filter !== "all" && a.env !== filter) return false;
      if (errorsOnly && a.occurrences === 0) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          a.name?.toLowerCase().includes(q) ||
          a.errorType?.toLowerCase().includes(q)
        );
      }
      return true;
    });

    // Errors-first sort (backend does this too, but keep it here for filter changes)
    list = [...list].sort((a, b) => {
      if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
      return new Date(b.lastSeen) - new Date(a.lastSeen);
    });

    return list;
  }, [errorApps, filter, query, errorsOnly]);

  // Reset to page 1 when filters change
  // eslint-disable-next-line no-undef
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [filter, query, errorsOnly]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedApps = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const totalErrors = envData.reduce((n, e) => n + e.errors, 0);
  const totalInstances = envData.reduce((n, e) => n + e.instances, 0);
  const errorCount = errorApps.filter((a) => a.occurrences > 0).length;

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-6 mb-7 pb-5 border-b border-line flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="font-bold text-[11px] uppercase tracking-[0.1em] text-teal-500">
              Operations
            </div>
            <div className="bg-teal-500 rounded-full px-2 py-1 text-xs w-fit flex items-center gap-1.5 font-bold text-white">
              <div className="w-1 h-1 rounded-full bg-white"></div> <p>Live</p></div>
          </div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight m-0">
            Self-heal console
          </h1>
          <p className="text-ink-soft mt-1.5 text-xs font-medium">
            Auro inspects logs across your environments and proposes patches for
            the LLM to apply.
          </p>
        </div>
        <div className="flex gap-7 items-center flex-wrap">
          <div className="flex items-center gap-3 border rounded-md p-3 bg-white/40">
            <div className="w-9 h-9 rounded-md flex items-center justify-center bg-teal-100">
              <IconServerBolt className="text-teal-500" stroke={2} />
            </div>
            <div className="flex flex-col gap-0">
              <h4 className="text-lg font-bold text-black">{totalInstances}</h4>
              <p className="text-xs text-gray-500">Instances
                watched</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border rounded-md p-3 bg-white/40">
            <div className="w-9 h-9 rounded-md flex items-center justify-center bg-red-100">
              <IconAlertCircle className="text-red-500" stroke={2} />
            </div>
            <div className="flex flex-col gap-0">
              <h4 className="text-lg font-bold text-black">50</h4>
              <p className="text-xs text-gray-500">Open errors</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border rounded-md p-3 bg-white/40">
            <div className="w-9 h-9 rounded-md flex items-center justify-center bg-green-100">
              <IconShieldCheck className="text-green-500" stroke={2} />
            </div>
            <div className="flex flex-col gap-0">
              <h4 className="text-lg font-bold text-black">128</h4>
              <p className="text-xs text-gray-500">Healed · 30d</p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Banner ── */}
      <div className="mb-8 flex flex-wrap items-center gap-3 justify-between rounded-md border border-slate-200 bg-white/40 px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-slate-700">
            <IconActivityHeartbeat
              size={18}
              className="text-emerald-500"
              stroke={2}
            />
            <span className="text-xs font-semibold">
              Monitoring Infrastructure
            </span>
          </div>

          <div className="h-5 w-px bg-slate-200" />

          <div className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1">
            <IconFileAnalytics size={15} className="text-slate-500" />
            <span className="text-xs text-slate-800">Logs</span>
            <span className="font-mono text-xs font-semibold text-slate-900">
              {errorApps
                .reduce((sum, app) => sum + (app.totalLogs || 0), 0)
                .toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1">
            <IconServer size={15} className="text-slate-500" />
            <span className="text-xs text-slate-600">Apps</span>
            <span className="font-mono text-xs font-semibold text-slate-900">
              {envData.length}
            </span>
          </div>
        </div>
        <div
          className={`flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1 ${totalErrors > 0
            ? "bg-red-50 text-red-600"
            : "bg-emerald-50 text-emerald-600"
            }`}
        >
          {totalErrors > 0 ? (
            <IconAlertTriangle size={15} />
          ) : (
            <IconCircleCheck size={15} />
          )}

          <span className="text-xs font-medium">
            {totalErrors > 0
              ? `${totalErrors} Active Errors`
              : "All Systems Operational"}
          </span>
        </div>
      </div>

      <section className="mb-9">
        <div className="flex items-baseline justify-between mb-3.5">
          <div className="font-semibold text-[13px]">Environments</div>
          <div className="font-semibold text-[11px] text-ink-mute">
            Updated · 4s ago
          </div>
        </div>

        {envEmphasis === "strip" ? (
          <div className="flex bg-raised border border-line rounded-md overflow-hidden flex-wrap">
            {envData.map((e) => (
              <div
                key={e.id}
                className="flex-1 min-w-[160px] p-4 flex flex-col gap-2.5 border-r border-lines last:border-r-0"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-sm flex items-center justify-center font-mono font-bold text-[10px] text-white tracking-wide ${{ aws: "bg-[#c47d2a]", azure: "bg-[#2a5ec4]", gcp: "bg-[#1e8c4a]", vps: "bg-[#5a3c9a]" }[e.id]}`}
                  >
                    {e.name.slice(0, 3)}
                  </div>
                  <div>
                    <div className="font-bold text-[14px]">{e.name}</div>
                    <div className="font-mono text-[10px] text-ink-mute uppercase tracking-widest">
                      {e.kind}
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-ink-soft">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${e.status === "healthy" ? "bg-teal" : "bg-amber"}`}
                    />
                    {e.status}
                  </div>
                </div>
                <div className="flex gap-4 font-mono text-xs text-ink-soft">
                  <span>
                    <strong className="text-ink">{e.instances}</strong> inst
                  </span>
                  <span className={e.errors > 0 ? "text-coral-deep" : ""}>
                    <strong>{e.errors}</strong> errors
                  </span>
                  <span>
                    <strong className="text-ink">{e.health}%</strong> health
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {loading ? (
              <EnvShimmer />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {envData.map((e) => (
                  <EnvCard key={e.id} env={e} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Apps table ── */}
      <section>
        <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="font-semibold text-[13px]">
              Apps reporting errors
            </div>
            {/* Errors-only toggle */}
            <button
              onClick={() => setErrorsOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${errorsOnly
                ? "bg-red-50 border-red-200 text-red-600"
                : "bg-raised border-line text-ink-mute hover:border-red-200 hover:text-red-500"
                }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${errorsOnly ? "bg-red-500" : "bg-neutral-300"}`}
              />
              Errors only · {errorCount}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <IconSearch className="absolute left-2.5 top-2 w-3.5 h-3.5 text-ink-mute" />
              <input
                className="bg-raised border border-line rounded-md pl-7 pr-3 py-1.5 text-[13px] outline-none focus:border-teal-deep focus:ring-2 focus:ring-teal/20 w-48"
                placeholder="Search app or error"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="bg-raised border border-line rounded-md px-2.5 py-1.5 text-[13px] outline-none focus:border-teal-deep w-40"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All environments</option>
              {envData.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-raised border border-line rounded-md overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            {/* Table header */}
            <div
              className="grid grid-cols-[1.4fr_0.7fr_0.7fr_1.6fr_0.5fr_0.6fr_80px] gap-3 items-center px-4 py-2.5 bg-canvas border-b border-line"
              style={{ minWidth: 700 }}
            >
              {["App", "App Type", "Severity", "Error", "Hits", "Last seen", ""].map(
                (h, i) => (
                  <div
                    key={i}
                    className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-mute"
                  >
                    {h}
                  </div>
                ),
              )}
            </div>

            {/* Rows */}
            <div style={{ minWidth: 700 }}>
              {loading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <ShimmerRow key={i} />
                  ))}
                </>
              ) : (
                paginatedApps.map((a) => (
                  <AppRow key={a.id} app={a} onFix={onFix} />
                ))
              )}
              {!loading && filtered.length === 0 && (
                <div className="py-9 text-center text-ink-mute text-[13px]">
                  No apps match those filters.
                </div>
              )}
            </div>
          </div>

          {/* Pagination footer */}
          {!loading && filtered.length > pageSize && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-lines">
              <div className="font-mono text-[11px] text-ink-mute">
                {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, filtered.length)} of{" "}
                {filtered.length} apps
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-line bg-raised disabled:opacity-40 disabled:cursor-not-allowed hover:bg-canvas flex items-center gap-2 transition-colors"
                >
                  <span>←</span> <span>Prev</span>
                </button>
                <span className="font-mono text-[11px] text-ink-mute px-2">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-line bg-raised disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-canvas transition-colors"
                >
                  <span>Next</span> <span>→</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
