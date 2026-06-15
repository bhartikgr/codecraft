import { useState } from "react";
import { ProgressStage } from "./ProgressStage.jsx";
import {
  IconClose,
  IconSpark,
  IconCheck,
  IconGit,
  IconBranch,
} from "../../components/Icons.jsx";
import { SevBadge, EnvBadge } from "../../components/Badges.jsx";
import {
  startFixFlow,
  getFixStatus,
  commitFixFlow,
} from "../../services/fixFlowService.jsx";

// Initial steps — all start as not done


export function FixFlow({ app, onClose, onFixed }) {

  const [stage, setStage] = useState("review");
  const [currentStatus, setCurrentStatus] = useState("analyzing");

  const [fixError, setFixError] = useState(null);
  const [succcessMsg, setSucccessMsg] = useState(null);
  const [mainBranch, setMainBranch] = useState("");
  const [instructions, setInstructions] = useState("");
  const [repoUrl, setRepoUrl] = useState(app?.repo ?? "");
  const [branch, setBranch] = useState(
    app?.name?.toLowerCase().replace(/\s+/g, "-") ?? ""
  );
  const [msg, setMsg] = useState(
    app ? `fix: resolve ${app.error} in ${app.name}` : ""
  );
  const [busy, setBusy] = useState(false);

  if (!app) return null;

  // Mark steps done progressively based on a status string from the API
  // Expected statuses (in order): "analyzing" | "detecting" | "patching" | "validating" | "preparing" | "completed"


  const startFix = async () => {
    setFixError(null);

    if (!appRepo.trim() || !appBranch.trim()) {
      setFixError("Repository URL and branch name are required.");
      return;
    }

    try {
      setBusy(true);
      setStage("fixing");
      setCurrentStatus("analyzing");
      setMainBranch(appBranch);

      const res = await startFixFlow({
        appId: app.id,
        projectName: app.name,
        repoUrl: appRepo,
        branch: appBranch,
        error: app.error,
        instructions: instructions.trim() ? instructions : undefined,
      });

      if (res.fixId) {
        pollFixStatus(res.fixId);
      } else {
        throw new Error(res.message || "Failed to start fix");
      }
    } catch (err) {
      console.error(err);
      setBusy(false);
      setFixError(err.message);
      setStage("review");
    }
  };

  const commitFix = async () => {
    try {
      setBusy(true);
      setFixError(null);

      if (!msg.trim()) {
        setFixError("Commit message cannot be empty");
        setBusy(false);
        return;
      }

      await commitFixFlow({
        appId: app.id,
        projectName: app.name,
        repoUrl: appRepo,
        branch: appBranch,
        mainbranch: mainBranch,
        message: msg,
      });

      setBusy(false);
      setStage("committed");
      setSucccessMsg("Patch committed successfully!");
      onFixed?.(app);
    } catch (err) {
      console.error(err);
      setBusy(false);
      setFixError(err.message);
    }
  };

  const pollFixStatus = async (fixId) => {
    const poll = async () => {
      try {
        const res = await getFixStatus(fixId);

        setCurrentStatus(res.status); // ← single source of truth

        if (res.status === "completed") {
          setBusy(false);
          setSucccessMsg("Fix completed successfully! No regressions detected.");
          setStage("success");
          return;
        }

        if (res.status === "failed") {
          setBusy(false);
          setFixError(res.error);
          setStage("review");
          return;
        }

        setTimeout(poll, 8000);
      } catch (err) {
        setFixError(err.message);
        setBusy(false);
      }
    };

    poll();
  };

  const appBranch = branch || app.name?.toLowerCase().replace(/\s+/g, "-") || "fix-branch";
  const appRepo = repoUrl || app.repo || "";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-raised border border-line rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl max-h-[92dvh] flex flex-col animate-slidein overflow-hidden">
        {fixError && (
          <div className="bg-coral-soft border border-coral/30 rounded-md px-3.5 py-2.5 text-[12px] text-coral-deep font-mono">
            ⚠ {fixError}
          </div>
        )}
        {succcessMsg && (
          <div className="flex items-center gap-2 bg-green-800/10 border border-green-800/20 rounded-md px-3.5 py-3 text-[12px] font-mono text-green-800">
            <svg
              className="w-5 h-5 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>

            <span>{succcessMsg}</span>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-line shrink-0">
          <div className="w-8 h-8 rounded-md bg-teal-soft flex items-center justify-center shrink-0">
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
            className="p-1.5 rounded-md text-ink-mute hover:text-ink hover:bg-sunken transition-colors"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="font-semibold">{app.name}</span>
            <SevBadge sev={app.sev} />
            <EnvBadge env={app.env} />
          </div>

          <div className="bg-coral-soft border border-coral/30 rounded-md px-3.5 py-2.5 text-[12px] text-coral-deep font-mono">
            {app.error}
          </div>

          {stage === "review" && (
            <div className="space-y-3">
              <div className="text-[12px] text-ink-mute">
                Auro will apply an AI-generated patch, open a pull request, and watch for regressions.
              </div>
              <div className="bg-sunken rounded-md divide-y divide-line text-[12px]">
                {app.logs?.slice(0, 4).map((l, i) => (
                  <div key={i} className="px-3.5 py-2 font-mono text-ink-mute flex gap-3">
                    {typeof l !== "string" && (
                      <span className="text-[#4a6a58] shrink-0 text-[10px]">
                        {new Date(l.timestamp).toISOString()}
                      </span>
                    )}
                    <span style={{ wordBreak: "break-all" }}>
                      {typeof l === "string" ? l : l.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage === "config" && (
            <div className="space-y-4">

              <div className="text-[12px] text-ink-mute">
                Configure repository before applying AI fix.
              </div>

              {/* REPO URL */}
              <div className="space-y-2">
                <label className="block font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                  Git Repository URL
                </label>

                <div className="bg-canvas border border-line rounded-md px-3 py-2">
                  <input
                    type="text"
                    value={appRepo}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/user/repo"
                    className="w-full bg-transparent outline-none text-[13px] font-mono"
                    required
                  />
                </div>
              </div>

              {/* BRANCH */}
              <div className="space-y-2">
                <label className="block font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                  Branch Name
                </label>

                <div className="flex items-center gap-2 bg-canvas border border-line rounded-md px-3 py-2">
                  <IconBranch className="w-3.5 h-3.5 text-ink-mute shrink-0" />

                  <input
                    type="text"
                    value={appBranch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-[13px] font-mono"
                    required
                  />
                </div>
              </div>

              {/* OPTIONAL INSTRUCTIONS */}
              <div className="space-y-2">
                <label className="block font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                  Instructions (optional)
                </label>

                <div className="bg-canvas border border-line rounded-xl p-3">
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder={`Example:
- User Id is minimum 5 characters
- fix auth failure without changing database schema
`}
                    rows={3}
                    className="w-full resize-none bg-transparent outline-none text-[13px] leading-6 font-mono placeholder:text-ink-mute"
                    required
                  />
                </div>

                <div className="text-[11px] text-ink-mute">
                  Extra requirements for AI fix engine.
                </div>
              </div>

              {/* PREVIEW */}
              <div className="bg-[#0e1210] border border-[#1e2620] rounded-xl p-4">
                <div className="text-[11px] font-mono text-[#4a6a58] mb-2">
        // fix target
                </div>

                <div className="space-y-1 text-[12px] font-mono">
                  <div className="text-[#c8ddd0] break-all">
                    repo: {appRepo}
                  </div>

                  <div className="text-[#7a9a88]">
                    branch: {appBranch}
                  </div>

                  <div className="text-coral break-all">
                    error: {app.error}
                  </div>

                  {instructions && (
                    <div className="text-[#9fb7aa] whitespace-pre-wrap pt-2 border-t border-[#1e2620] mt-2">
                      instructions: {instructions}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {(stage === "fixing" || stage === "success") && (
            <ProgressStage currentStatus={currentStatus} />
          )}

          {(stage === "commit" || stage === "committed") && (
            <div className="space-y-3">
              {stage === "committed" && (
                <div className="flex items-center gap-3 bg-teal-soft border border-teal/30 rounded-md px-4 py-3">
                  <div className="w-7 h-7 rounded-full bg-teal flex items-center justify-center shrink-0">
                    <IconCheck className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-[13px] text-teal-deep">Patch committed</div>
                    <div className="text-[11px] text-teal-deep/70">
                      PR opened — monitoring for regressions
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                  Commit to branch
                </label>
                <div className="flex items-center gap-2 bg-canvas border border-line rounded-md px-3 py-2">
                  <IconBranch className="w-3.5 h-3.5 text-ink-mute shrink-0" />
                  <input
                    className="flex-1 bg-transparent font-mono text-[12px] outline-none"
                    value={appBranch}
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
                  className="w-full bg-canvas border border-line rounded-md px-3 py-2 font-mono text-[12px] outline-none focus:border-teal-deep focus:ring-2 focus:ring-teal/20 resize-none"
                  rows={2}
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  disabled={stage === "committed"} required
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-4 border-t border-line bg-raised">
          {stage === "review" && (
            <>
              <button onClick={onClose} className="px-3.5 py-2 rounded-md border border-line text-[13px] font-semibold text-ink-soft hover:bg-sunken transition-colors">
                Cancel
              </button>
              <button onClick={() => setStage("config")} className="px-4 py-2 rounded-full bg-teal-deep text-white text-[13px] font-semibold hover:bg-teal-deep/90 transition-colors flex items-center gap-2">
                <IconSpark className="w-3.5 h-3.5" /> Apply fix
              </button>
            </>
          )}

          {stage === "config" && (
            <>
              <button onClick={() => setStage("review")} className="px-4 py-2 rounded-full border border-line text-[13px] font-semibold text-ink-soft hover:bg-sunken transition-colors">
                Back
              </button>
              <button onClick={startFix} className="px-4 py-2 rounded-full bg-teal-deep text-white text-[13px] font-semibold hover:bg-teal-deep/90 transition-colors flex items-center gap-2">
                <IconSpark className="w-3.5 h-3.5" /> Start AI Fix
              </button>
            </>
          )}

          {stage === "fixing" && (
            <button disabled className="px-3.5 py-2 rounded-md bg-teal-deep/60 text-white text-[13px] font-semibold flex items-center gap-2 cursor-not-allowed">
              <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Fixing…
            </button>
          )}

          {stage === "success" && (
            <>
              <button onClick={onClose} className="px-4 py-2 rounded-full border border-line text-[13px] font-semibold text-ink-soft hover:bg-sunken transition-colors">
                Discard
              </button>
              <button onClick={() => setStage("commit")} className="px-4 py-2 rounded-full bg-teal-deep text-white text-[13px] font-semibold hover:bg-teal-deep/90 transition-colors flex items-center gap-2">
                <IconGit className="w-3.5 h-3.5" /> Review & commit
              </button>
            </>
          )}

          {stage === "commit" && (
            <>
              <button onClick={() => setStage("success")} className="px-4 py-2 rounded-full border border-line text-[13px] font-semibold text-ink-soft hover:bg-sunken transition-colors">
                Back
              </button>
              <button onClick={commitFix} disabled={busy} className="px-3.5 py-2 rounded-md bg-teal-deep text-white text-[13px] font-semibold hover:bg-teal-deep/90 disabled:opacity-60 transition-colors flex items-center gap-2">
                {busy ? (
                  <><span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> Committing…</>
                ) : (
                  <><IconGit className="w-3.5 h-3.5" /> Commit patch</>
                )}
              </button>
            </>
          )}

          {stage === "committed" && (
            <button onClick={onClose} className="px-3.5 py-2 rounded-md bg-teal-deep text-white text-[13px] font-semibold hover:bg-teal-deep/90 transition-colors">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}