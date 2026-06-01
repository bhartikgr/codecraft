// ProgressStage.jsx
const STAGE_STEPS = {
  analyzing: [
    { id: "clone", label: "Cloning repository" },
    { id: "read", label: "Reading project structure" },
    { id: "logs", label: "Parsing error logs" },
  ],
  detecting: [
    { id: "lang", label: "Detecting language & framework" },
    { id: "deps", label: "Scanning dependencies" },
    { id: "version", label: "Identifying version constraints" },
  ],
  patching: [
    { id: "ctx", label: "Building context window" },
    { id: "prompt", label: "Generating fix prompt" },
    { id: "ai", label: "Calling AI engine" },
  ],
  validating: [
    { id: "parse", label: "Parsing AI response" },
    { id: "apply", label: "Applying patch to files" },
    { id: "build", label: "Running build check" },
  ],
  preparing: [
    { id: "diff", label: "Generating diff" },
    { id: "pr", label: "Preparing pull request" },
    { id: "ready", label: "Almost ready…" },
  ],
  completed: [],
};

const STAGE_ORDER = ["analyzing", "detecting", "patching", "validating", "preparing"];

export function ProgressStage({ currentStatus }) {
  const allSteps = STAGE_ORDER.flatMap((stage) =>
    STAGE_STEPS[stage].map((step) => ({ ...step, stage }))
  );

  const currentStageIndex = STAGE_ORDER.indexOf(currentStatus);
  const firstActiveIndex = allSteps.findIndex((s) => s.stage === currentStatus);

  return (
    <div className="space-y-1 py-1">
      {allSteps.map((step, i) => {
        const stepStageIndex = STAGE_ORDER.indexOf(step.stage);

        const isDone = stepStageIndex < currentStageIndex;
        const isActive = step.stage === currentStatus && i === firstActiveIndex;
        const isFuture = stepStageIndex > currentStageIndex;

        if (isFuture) return null;

        return (
          <div
            key={step.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-500 ${isActive ? "bg-teal-soft/60" : ""
              }`}
          >
            <div className="w-5 h-5 shrink-0 flex items-center justify-center">
              {isDone ? (
                <svg className="w-4 h-4 text-teal-deep" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : isActive ? (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-teal-deep border-t-transparent animate-spin block" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-line block mx-auto" />
              )}
            </div>

            <span
              className={`text-[12px] font-mono transition-colors duration-300 ${isDone
                  ? "text-ink-mute"
                  : isActive
                    ? "text-teal-deep font-semibold"
                    : "text-ink-mute/50"
                }`}
            >
              {step.label}
              {isActive && (
                <span className="ml-1 inline-flex gap-0.5">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="inline-block w-0.5 h-0.5 rounded-full bg-teal-deep animate-bounce"
                      style={{ animationDelay: `${d * 150}ms` }}
                    />
                  ))}
                </span>
              )}
            </span>
          </div>
        );
      })}

      {currentStatus === "completed" && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-teal-soft/40 mt-2">
          <svg className="w-5 h-5 text-teal-deep shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-[13px] font-semibold text-teal-deep">Patch ready to commit</span>
        </div>
      )}
    </div>
  );
}