import { useState, useEffect, useRef, useCallback } from "react";
import { EnvBadge } from "../../components/Badges.jsx";

const LEVEL_STYLE = {
  ERROR: { text: "text-coral", bg: "bg-coral-soft", border: "border-coral/30" },
  WARN: { text: "text-amber", bg: "bg-amber-soft", border: "border-amber/30" },
  INFO: { text: "text-teal", bg: "bg-teal-soft", border: "border-teal/30" },
  DEBUG: { text: "text-ink-mute", bg: "bg-sunken", border: "border-line" },
};

export function LiveLogs() {
  const [logs, setLogs] = useState([]);
  const [paused, setPaused] = useState(false);
  const [envFilter, setEnvFilter] = useState("all");
  const [lvlFilter, setLvlFilter] = useState("all");
  const [search, setSearch] = useState("");
  const bottomRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  // Define fetchLogs as a useCallback to avoid recreating it
  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/api/logs/recent");
      const data = await res.json();

      if (!isMountedRef.current) return;

      setLoading(false);

      if (data.logs && Array.isArray(data.logs)) {
        setLogs((prev) => {
          const seen = new Set(
            prev.map((l) => `${l.env}-${l.app}-${l.level}-${l.msg}`),
          );

          const newLogs = data.logs.filter((l) => {
            const key = `${l.env}-${l.app}-${l.level}-${l.msg}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          return [...newLogs, ...prev].slice(0, 500);
        });
      }
    } catch (err) {
      console.error("Log fetch error", err);
      setLoading(false);
    }
  }, []);

  // Set up polling as a separate effect
  useEffect(() => {
    // Mark component as mounted
    isMountedRef.current = true;

    let initialFetchTimeout = null;

    // Don't start polling if paused
    if (!paused) {
      initialFetchTimeout = setTimeout(() => {
        if (isMountedRef.current) {
          fetchLogs();
        }
      }, 0);

      // Set up interval
      intervalRef.current = setInterval(fetchLogs, 10000);
    }

    // Cleanup function
    return () => {
      if (initialFetchTimeout) {
        clearTimeout(initialFetchTimeout);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [paused, fetchLogs]); // Re-run when paused changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Auto-scroll behaviour
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const visible = logs.filter((l) => {
    if (envFilter !== "all" && l.env !== envFilter) return false;
    if (lvlFilter !== "all" && l.level !== lvlFilter) return false;
    if (
      search &&
      !l.msg.toLowerCase().includes(search.toLowerCase()) &&
      !l.app.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

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
            className={`flex items-center gap-1.5 font-mono text-[11px] px-3 py-1.5 rounded-full ${paused ? "bg-amber-soft text-amber-deep" : "bg-teal-soft text-teal-deep"}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${paused ? "bg-amber" : "bg-teal animate-pulse2"}`}
            />
            {paused ? "Paused" : "Live"}
          </span>
          <button
            onClick={() => setPaused((p) => !p)}
            className="bg-raised border border-line px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-soft hover:bg-sunken transition-colors"
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          className="bg-raised border border-line rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-teal-deep w-48"
          placeholder="Search logs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="bg-raised border border-line rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-teal-deep"
          value={envFilter}
          onChange={(e) => setEnvFilter(e.target.value)}
        >
          {envs.map((e) => (
            <option key={e} value={e}>
              {e === "all" ? "All envs" : e.toUpperCase()}
            </option>
          ))}
        </select>
        <select
          className="bg-raised border border-line rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-teal-deep"
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
        className="flex-1 bg-[#0e1210] rounded-lg border border-[#1e2620] overflow-hidden flex flex-col"
        style={{ minHeight: 400 }}
      >
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1e2620] bg-[#141812]">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2d3630]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#2d3630]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#2d3630]" />
          </div>
          <span className="font-mono text-[11px] text-[#5a6b62] ml-2">
            auro-heal · log stream · {visible.length} lines
          </span>
          <span className="ml-auto font-mono text-[11px] text-[#3a4d42]">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
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
                    <span className="text-[#7a9688] shrink-0">{log.app}</span>
                    <span
                      className={`flex-1 ${st.text !== "text-ink-mute" ? st.text : "text-[#adc4b8]"}`}
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
