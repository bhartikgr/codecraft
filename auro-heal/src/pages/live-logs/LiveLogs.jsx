import { useState, useEffect, useRef, useCallback } from "react";
import { EnvBadge } from "../../components/Badges.jsx";

const LEVEL_STYLE = {
  ERROR: { text: "text-coral", bg: "bg-coral-soft", border: "border-coral/30" },
  WARN: { text: "text-amber", bg: "bg-amber-soft", border: "border-amber/30" },
  INFO: { text: "text-teal", bg: "bg-teal-soft", border: "border-teal/30" },
  DEBUG: { text: "text-ink-mute", bg: "bg-sunken", border: "border-line" },
};

const LOGS_PER_APP = 200;

export function LiveLogs() {
  const [logs, setLogs] = useState([]);
  const [paused, setPaused] = useState(false);
  const [envFilter, setEnvFilter] = useState("all");
  const [appFilter, setAppFilter] = useState("all");
  const [lvlFilter, setLvlFilter] = useState("all");
  const [search, setSearch] = useState("");
  const bottomRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_LINK}/api/logs/recent`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": import.meta.env.VITE_API_KEY,
          },
        }
      );

      const data = await res.json();

      if (!isMountedRef.current) return;

      setLoading(false);

      if (Array.isArray(data.logs)) {
        setLogs((prev) => {
          const seen = new Set(
            prev.map((l) => `${l.env}-${l.app}-${l.level}-${l.msg}`)
          );

          const newLogs = data.logs.filter((l) => {
            const key = `${l.env}-${l.app}-${l.level}-${l.msg}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          // Keep at most 2000 raw logs in memory across all apps
          return [...prev, ...newLogs].slice(-2000);
        });
      }
    } catch (err) {
      console.error("Log fetch error", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    let initialFetchTimeout = null;

    if (!paused) {
      initialFetchTimeout = setTimeout(() => {
        if (isMountedRef.current) fetchLogs();
      }, 0);

      intervalRef.current = setInterval(fetchLogs, 10000);
    }

    return () => {
      if (initialFetchTimeout) clearTimeout(initialFetchTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [paused, fetchLogs]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Reset scroll to bottom whenever the app selection changes
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [appFilter]);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  // Derive unique app names only from logs that match the current env filter
  // so switching to AWS only shows AWS apps, not Azure/GCP apps
  const appNames = [
    "all",
    ...Array.from(
      new Set(
        logs
          .filter((l) => envFilter === "all" || l.env === envFilter)
          .map((l) => l.app)
      )
    ).sort(),
  ];

  // Filter → sort latest-first → cap at LOGS_PER_APP for the selected app
  const visible = logs
    .filter((l) => {
      if (envFilter !== "all" && l.env !== envFilter) return false;
      if (appFilter !== "all" && l.app !== appFilter) return false;
      if (lvlFilter !== "all" && l.level !== lvlFilter) return false;
      if (
        search &&
        !l.msg.toLowerCase().includes(search.toLowerCase()) &&
        !l.app.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => new Date(b.ts) - new Date(a.ts))
    .slice(0, LOGS_PER_APP);

  const envs = ["all", "aws", "azure", "gcp", "vps"];
  const levels = ["all", "ERROR", "WARN", "INFO", "DEBUG"];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-end justify-between gap-6 mb-7 pb-5 border-b border-line flex-wrap">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-mute mb-1.5">
            Real-time
          </div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight m-0">
            Live logs
          </h1>
          <p className="text-ink-soft mt-1.5 text-sm">
            Streaming log feed across all monitored environments. Errors are
            highlighted in red.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-1.5 font-mono text-[11px] px-3 py-1.5 rounded-full ${paused
                ? "bg-amber-soft text-amber-deep"
                : "bg-teal-soft text-teal-deep"
              }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${paused ? "bg-amber" : "bg-teal animate-pulse2"
                }`}
            />
            {paused ? "Paused" : "Live"}
          </span>
          <button
            onClick={() => setPaused((p) => !p)}
            className="bg-raised border border-line px-3 py-1.5 rounded-md text-xs font-semibold text-ink-soft hover:bg-sunken transition-colors"
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          className="bg-raised border border-line rounded-md px-3 py-1.5 text-[13px] outline-none focus:border-teal-deep w-48"
          placeholder="Search logs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Env filter */}
        <select
          className="bg-raised border border-line rounded-md px-2.5 py-1.5 text-[13px] outline-none focus:border-teal-deep"
          value={envFilter}
          onChange={(e) => {
            setEnvFilter(e.target.value);
            setAppFilter("all"); // reset app when env changes
          }}
        >
          {envs.map((e) => (
            <option key={e} value={e}>
              {e === "all" ? "All envs" : e.toUpperCase()}
            </option>
          ))}
        </select>

        {/* App filter — sits right beside env */}
        <select
          className="bg-raised border border-line rounded-md px-2.5 py-1.5 text-[13px] outline-none focus:border-teal-deep"
          value={appFilter}
          onChange={(e) => setAppFilter(e.target.value)}
        >
          {appNames.map((a) => (
            <option key={a} value={a}>
              {a === "all" ? "All apps" : a}
            </option>
          ))}
        </select>

        {/* Level filter */}
        <select
          className="bg-raised border border-line rounded-md px-2.5 py-1.5 text-[13px] outline-none focus:border-teal-deep"
          value={lvlFilter}
          onChange={(e) => setLvlFilter(e.target.value)}
        >
          {levels.map((l) => (
            <option key={l} value={l}>
              {l === "all" ? "All levels" : l}
            </option>
          ))}
        </select>

        <label className="ml-auto flex items-center gap-2 text-xs text-ink-soft cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="accent-teal-deep"
          />
          Auto-scroll
        </label>
      </div>

      {/* Log stream */}
      <div
        className="flex-1 bg-[#0e1210] rounded-md border border-[#1e2620] overflow-hidden flex flex-col"
        style={{ minHeight: 400 }}
      >
        {/* Terminal chrome bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1e2620] bg-[#141812]">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2d3630]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#2d3630]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#2d3630]" />
          </div>
          <span className="font-mono text-[11px] text-[#5a6b62] ml-2">
            auro-heal · log stream ·{" "}
            {appFilter !== "all" ? (
              <span className="text-teal-deep">{appFilter}</span>
            ) : (
              "all apps"
            )}{" "}
            · {visible.length}
            {visible.length === LOGS_PER_APP ? `/${LOGS_PER_APP}` : ""} lines
          </span>
          <span className="ml-auto font-mono text-[11px] text-[#3a4d42]">
            {new Date().toLocaleTimeString()}
          </span>
        </div>

        {/* At-cap notice */}
        {visible.length === LOGS_PER_APP && (
          <div className="px-4 py-1.5 bg-[#1a2018] border-b border-[#1e2620] font-mono text-[11px] text-amber flex items-center gap-2">
            <span className="opacity-60">⚠</span>
            Showing the {LOGS_PER_APP} most recent lines. Use filters or search
            to narrow results.
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="overflow-y-auto p-4 space-y-1 scrollbar-thin h-[80vh]">
            {loading && (
              <div className="flex items-center justify-center h-[200px] text-[#7a9688]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-teal rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-teal rounded-full animate-bounce delay-150" />
                  <div className="w-2 h-2 bg-teal rounded-full animate-bounce delay-300" />
                  <span className="ml-2 text-sm">Loading logs...</span>
                </div>
              </div>
            )}

            {!loading && visible.length === 0 && (
              <div className="text-center text-[#5d6d65] py-10">
                No logs found 😴
              </div>
            )}

            {!loading &&
              visible.map((log) => {
                const st = LEVEL_STYLE[log.level] ?? LEVEL_STYLE.DEBUG;
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 font-mono text-[11.5px]"
                  >
                    <span className="text-[#5d6d65] shrink-0">{log.ts}</span>
                    <span
                      className={`shrink-0 px-1.5 py-px rounded text-[10px] font-bold ${st.bg} ${st.text} border ${st.border}`}
                    >
                      {log.level}
                    </span>
                    <EnvBadge env={log.env} />
                    {/* Only show app column when viewing all apps */}
                    {appFilter === "all" && (
                      <span className="text-[#7a9688] shrink-0">{log.app}</span>
                    )}
                    <span style={{wordBreak:"break-word"}}
                      className={`flex-1 ${st.text !== "text-ink-mute"
                          ? st.text
                          : "text-[#adc4b8]"
                        }`}
                    >
                      {log.msg}
                    </span>
                  </div>
                );
              })}

            <div ref={bottomRef} />
          </div>
        </div>
      </div>
    </div>
  );
}