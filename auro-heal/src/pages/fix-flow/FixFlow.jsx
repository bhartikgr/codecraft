import { useEffect, useState } from "react";
import { fixSteps } from "../../data/seed.js";
import { ProgressStage } from "./ProgressStage.jsx";
import {
  IconClose,
  IconSpark,
  IconCheck,
  IconGit,
  IconBranch,
} from "../../components/Icons.jsx";
import { SevBadge, EnvBadge } from "../../components/Badges.jsx";

export function FixFlow({ app, onClose, onFixed }) {
  const [stage, setStage] = useState("review");
  const [branch, setBranch] = useState("fix/memory-leak-api");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (app) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStage("review");
      setBranch(`fix/${app.name.toLowerCase().replace(/\s+/g, "-")}`);
      setMsg(`fix: resolve ${app.error} in ${app.name}`);
    }
  }, [app]);

  if (!app) return null;

  const startFix = () => {
    setStage("fixing");
    setTimeout(() => setStage("success"), fixSteps.length * 420 + 600);
  };

  const commitFix = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setStage("committed");
      onFixed?.(app);
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-raised border border-line rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl max-h-[92dvh] flex flex-col animate-slidein overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-line shrink-0">
          <div className="w-8 h-8 rounded-lg bg-teal-soft flex items-center justify-center shrink-0">
            <IconSpark className="w-4 h-4 text-teal-deep" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[14px] leading-tight">
              {stage === "committed" ? "Fix committed" : "Auro Fix"}
            </div>
            <div className="text-[11px] text-ink-mute truncate">{app.name}</div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-mute hover:text-ink hover:bg-sunken transition-colors"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* App info */}
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="font-semibold">{app.name}</span>
            <SevBadge sev={app.sev} />
            <EnvBadge env={app.env} />
          </div>

          {/* Error banner */}
          <div className="bg-coral-soft border border-coral/30 rounded-lg px-3.5 py-2.5 text-[12px] text-coral-deep font-mono">
            {app.error}
          </div>

          {/* Review stage */}
          {stage === "review" && (
            <div className="space-y-3">
              <div className="text-[12px] text-ink-mute">
                Auro will apply an AI-generated patch, open a pull request, and
                watch for regressions.
              </div>
              <div className="bg-sunken rounded-lg divide-y divide-line text-[12px]">
                {app.logs?.slice(0, 4).map((l, i) => (
                  <div
                    key={i}
                    className="px-3.5 py-2 font-mono text-ink-mute flex gap-3"
                  >
                    {typeof l !== "string" && (
                      <span className="text-[#4a6a58] shrink-0 text-[10px]" style={{ wordBreak: "break-all" }}>
                        {new Date(l.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                    <span style={{ wordBreak: "break-all" }}>{typeof l === "string" ? l : l.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fixing / success stage */}
          {(stage === "fixing" || stage === "success") && (
            <ProgressStage
              steps={fixSteps}
              active={stage === "fixing" || stage === "success"}
            />
          )}

          {/* Commit stage */}
          {(stage === "commit" || stage === "committed") && (
            <div className="space-y-3">
              {stage === "committed" ? (
                <div className="flex items-center gap-3 bg-teal-soft border border-teal/30 rounded-lg px-4 py-3">
                  <div className="w-7 h-7 rounded-full bg-teal flex items-center justify-center shrink-0">
                    <IconCheck className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-[13px] text-teal-deep">
                      Patch committed
                    </div>
                    <div className="text-[11px] text-teal-deep/70">
                      PR opened — monitoring for regressions
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <label className="block font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                  Branch
                </label>
                <div className="flex items-center gap-2 bg-canvas border border-line rounded-lg px-3 py-2">
                  <IconBranch className="w-3.5 h-3.5 text-ink-mute shrink-0" />
                  <input
                    className="flex-1 bg-transparent font-mono text-[12px] outline-none"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    disabled={stage === "committed"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                  Commit message
                </label>
                <textarea
                  className="w-full bg-canvas border border-line rounded-lg px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-deep focus:ring-2 focus:ring-teal/20 resize-none"
                  rows={2}
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  disabled={stage === "committed"}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-4 border-t border-line bg-raised">
          {stage === "review" && (
            <>
              <button
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg border border-line text-[13px] font-semibold text-ink-soft hover:bg-sunken transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={startFix}
                className="px-4 py-2 rounded-full bg-teal-deep text-white text-[13px] font-semibold hover:bg-teal-deep/90 transition-colors flex items-center gap-2"
              >
                <IconSpark className="w-3.5 h-3.5" />
                Apply fix
              </button>
            </>
          )}
          {stage === "fixing" && (
            <button
              disabled
              className="px-3.5 py-2 rounded-lg bg-teal-deep/60 text-white text-[13px] font-semibold flex items-center gap-2 cursor-not-allowed"
            >
              <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Fixing…
            </button>
          )}
          {stage === "success" && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full border border-line text-[13px] font-semibold text-ink-soft hover:bg-sunken transition-colors"
              >
                Discard
              </button>
              <button
                onClick={() => setStage("commit")}
                className="px-4 py-2 rounded-full bg-teal-deep text-white text-[13px] font-semibold hover:bg-teal-deep/90 transition-colors flex items-center gap-2"
              >
                <IconGit className="w-3.5 h-3.5" />
                Review & commit
              </button>
            </>
          )}
          {stage === "commit" && (
            <>
              <button
                onClick={() => setStage("success")}
                className="px-4 py-2 rounded-full border border-line text-[13px] font-semibold text-ink-soft hover:bg-sunken transition-colors"
              >
                Back
              </button>
              <button
                onClick={commitFix}
                disabled={busy}
                className="px-3.5 py-2 rounded-lg bg-teal-deep text-white text-[13px] font-semibold hover:bg-teal-deep/90 disabled:opacity-60 transition-colors flex items-center gap-2"
              >
                {busy ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Committing…
                  </>
                ) : (
                  <>
                    <IconGit className="w-3.5 h-3.5" />
                    Commit patch
                  </>
                )}
              </button>
            </>
          )}
          {stage === "committed" && (
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-teal-deep text-white text-[13px] font-semibold hover:bg-teal-deep/90 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
