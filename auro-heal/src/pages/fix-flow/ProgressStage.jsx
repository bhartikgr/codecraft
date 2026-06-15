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

const STAGE_ORDER = [
  "analyzing",
  "detecting",
  "patching",
  "validating",
  "preparing",
];

export function ProgressStage({ currentStatus }) {
  const allSteps = STAGE_ORDER.flatMap((stage) =>
    STAGE_STEPS[stage].map((step) => ({
      ...step,
      stage,
    }))
  );

  const currentStageIndex = STAGE_ORDER.indexOf(currentStatus);

  const visibleSteps = allSteps.filter((step) => {
    const stepStageIndex = STAGE_ORDER.indexOf(step.stage);
    return stepStageIndex <= currentStageIndex;
  });

  const activeStep = visibleSteps.find(
    (step) => step.stage === currentStatus
  );

  const completedSteps = visibleSteps
    .filter((step) => step.stage !== currentStatus)
    .reverse();

  return (
    <div className="space-y-3">
      {/* Current Step */}
      {currentStatus !== "completed" && activeStep && (
        <div className="rounded-xl border border-teal-soft bg-teal-soft/40 p-4">
          <div className="text-[10px] uppercase tracking-[0.12em] font-mono text-teal-deep pb-3">
            Current Step
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full border-2 border-teal-deep border-t-transparent animate-spin block shrink-0" />

              <span className="text-[13px] font-semibold text-teal-deep">
                {activeStep.label}
              </span>
            </div>
            <span className="inline-flex gap-1 ml-1">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="w-1 h-1 rounded-full bg-teal-deep animate-bounce"
                  style={{
                    animationDelay: `${d * 150}ms`,
                  }}
                />
              ))}
            </span>
          </div>
        </div>
      )}

      {/* Completed Steps */}
      {completedSteps.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] font-mono text-ink-mute mb-2 px-1">
            Completed
          </div>

          <div className="space-y-1">
            {completedSteps.map((step) => (
              <div
                key={step.id}
                className="flex items-center gap-3 px-3 py-2 rounded-md bg-sunken/40"
              >
                <svg
                  className="w-4 h-4 text-teal-deep shrink-0"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="7"
                    fill="currentColor"
                    fillOpacity="0.15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M5 8l2 2 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <span className="text-[12px] font-mono text-ink-mute">
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed State */}
      {currentStatus === "completed" && (
        <div className="rounded-xl border border-teal-soft bg-teal-soft/40 p-4">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-teal-deep shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>

            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] font-mono text-teal-deep">
                Completed
              </div>

              <div className="text-[13px] font-semibold text-teal-deep">
                Patch ready to commit
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}