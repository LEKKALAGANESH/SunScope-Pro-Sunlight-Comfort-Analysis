import { useProjectStore } from '../../store/projectStore';
import type { AppStep } from '../../types';

const steps: { key: AppStep; label: string; shortLabel: string }[] = [
  { key: 'upload', label: 'Upload', shortLabel: '1' },
  { key: 'validate', label: 'Validate', shortLabel: '2' },
  { key: 'setup', label: 'Setup', shortLabel: '3' },
  { key: 'editor', label: 'Buildings', shortLabel: '4' },
  { key: 'viewer', label: 'Analyze', shortLabel: '5' },
  { key: 'results', label: 'Results', shortLabel: '6' },
];

const stepOrder: AppStep[] = ['upload', 'validate', 'setup', 'editor', 'viewer', 'results'];

export function StepIndicator() {
  const { currentStep, setCurrentStep, project } = useProjectStore();
  const currentIndex = stepOrder.indexOf(currentStep);

  const canNavigateTo = (step: AppStep): boolean => {
    const targetIndex = stepOrder.indexOf(step);

    // Can always go back
    if (targetIndex < currentIndex) return true;

    // Check requirements for forward navigation
    switch (step) {
      case 'upload':
        return true;
      case 'validate':
        return project.image !== null;
      case 'setup':
        return project.image !== null;
      case 'editor':
        return project.image !== null;
      case 'viewer':
        return project.image !== null && project.buildings.length > 0;
      case 'results':
        return project.image !== null && project.buildings.length > 0;
      default:
        return false;
    }
  };

  const getStepStatus = (step: AppStep): 'completed' | 'current' | 'upcoming' => {
    const stepIndex = stepOrder.indexOf(step);
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-1 flex-wrap lg:flex-nowrap lg:justify-between">
          {steps.map((step, index) => {
            const status = getStepStatus(step.key);
            const canClick = canNavigateTo(step.key);

            return (
              <div key={step.key} className="flex items-center">
                <button
                  onClick={() => canClick && setCurrentStep(step.key)}
                  disabled={!canClick}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors
                    ${status === "current" ? "bg-amber-100 text-amber-700" : ""}
                    ${
                      status === "completed"
                        ? "text-green-600 hover:bg-green-50"
                        : ""
                    }
                    ${status === "upcoming" ? "text-gray-400" : ""}
                    ${
                      canClick && status !== "current"
                        ? "cursor-pointer hover:bg-gray-100"
                        : ""
                    }
                    ${!canClick ? "cursor-not-allowed" : ""}
                  `}
                >
                  <span
                    className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                      ${status === "current" ? "bg-amber-500 text-white" : ""}
                      ${status === "completed" ? "bg-green-500 text-white" : ""}
                      ${
                        status === "upcoming" ? "bg-gray-200 text-gray-500" : ""
                      }
                    `}
                  >
                    {status === "completed" ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      step.shortLabel
                    )}
                  </span>
                  <span className="hidden lg:inline text-sm font-medium">
                    {step.label}
                  </span>
                </button>

                {index < steps.length - 1 && (
                  <div
                    className={`
                      hidden md:block md:w-8 md:h-0.5 md:mx-1 lg:block lg:w-8 lg:h-0.5 lg:mx-1
                      ${
                        stepOrder.indexOf(step.key) < currentIndex
                          ? "bg-green-500"
                          : "bg-gray-200"
                      }
                    `}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
