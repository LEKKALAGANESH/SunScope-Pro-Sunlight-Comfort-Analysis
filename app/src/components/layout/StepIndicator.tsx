import { useProjectStore } from '../../store/projectStore';
import type { AppStep } from '../../types';

interface StepConfig {
  key: AppStep;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  accentColor: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

const steps: StepConfig[] = [
  {
    key: 'upload',
    label: 'Upload',
    shortLabel: '1',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    accentColor: 'bg-amber-500',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-700',
  },
  {
    key: 'setup',
    label: 'Setup',
    shortLabel: '2',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    accentColor: 'bg-orange-500',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-700',
  },
  {
    key: 'validate',
    label: 'Validate',
    shortLabel: '3',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    accentColor: 'bg-emerald-500',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-300',
    textColor: 'text-emerald-700',
  },
  {
    key: 'editor',
    label: 'Buildings',
    shortLabel: '4',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    accentColor: 'bg-blue-500',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700',
  },
  {
    key: 'viewer',
    label: 'Analyze',
    shortLabel: '5',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    accentColor: 'bg-sky-500',
    bgColor: 'bg-sky-100',
    borderColor: 'border-sky-300',
    textColor: 'text-sky-700',
  },
  {
    key: 'results',
    label: 'Results',
    shortLabel: '6',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    accentColor: 'bg-rose-500',
    bgColor: 'bg-rose-100',
    borderColor: 'border-rose-300',
    textColor: 'text-rose-700',
  },
];

const stepOrder: AppStep[] = ['upload', 'setup', 'validate', 'editor', 'viewer', 'results'];

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
    <nav
      className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-4 py-3 sticky top-[60px] z-30"
      aria-label="Progress"
    >
      <div className="max-w-5xl mx-auto">
        {/* Desktop View */}
        <div className="hidden md:block">
          <ol className="flex items-center justify-between">
            {steps.map((step, index) => {
              const status = getStepStatus(step.key);
              const canClick = canNavigateTo(step.key);
              const isLast = index === steps.length - 1;

              return (
                <li key={step.key} className="flex items-center flex-1">
                  <button
                    onClick={() => canClick && setCurrentStep(step.key)}
                    disabled={!canClick}
                    className={`
                      group relative flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300
                      ${status === 'current'
                        ? `${step.bgColor} ${step.borderColor} border-2 shadow-sm`
                        : status === 'completed'
                        ? 'hover:bg-gray-50'
                        : ''
                      }
                      ${canClick && status !== 'current' ? 'cursor-pointer hover:scale-[1.02]' : ''}
                      ${!canClick ? 'cursor-not-allowed opacity-60' : ''}
                    `}
                    aria-current={status === 'current' ? 'step' : undefined}
                  >
                    {/* Step Circle */}
                    <span
                      className={`
                        relative flex items-center justify-center w-10 h-10 rounded-full
                        transition-all duration-300 flex-shrink-0
                        ${status === 'current'
                          ? `${step.accentColor} text-white shadow-lg ring-4 ring-white`
                          : status === 'completed'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                        }
                        ${canClick && status !== 'current' ? 'group-hover:scale-110' : ''}
                      `}
                    >
                      {status === 'completed' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        step.icon
                      )}

                      {/* Glow effect for current step */}
                      {status === 'current' && (
                        <span className={`absolute inset-0 rounded-full ${step.accentColor} opacity-30 animate-ping`} />
                      )}
                    </span>

                    {/* Step Label */}
                    <div className="flex flex-col items-start min-w-0">
                      <span
                        className={`
                          text-sm font-semibold truncate
                          ${status === 'current'
                            ? step.textColor
                            : status === 'completed'
                            ? 'text-gray-700'
                            : 'text-gray-400'
                          }
                        `}
                      >
                        {step.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        Step {index + 1}
                      </span>
                    </div>
                  </button>

                  {/* Connector Line */}
                  {!isLast && (
                    <div className="flex-1 mx-2">
                      <div className="h-1 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out ${
                            stepOrder.indexOf(step.key) < currentIndex
                              ? 'bg-gradient-to-r from-green-400 to-green-500 w-full'
                              : 'w-0'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Mobile View - Compact horizontal scroll */}
        <div className="md:hidden">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {steps.map((step, index) => {
              const status = getStepStatus(step.key);
              const canClick = canNavigateTo(step.key);

              return (
                <button
                  key={step.key}
                  onClick={() => canClick && setCurrentStep(step.key)}
                  disabled={!canClick}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
                    whitespace-nowrap flex-shrink-0
                    ${status === 'current'
                      ? `${step.bgColor} ${step.borderColor} border-2 shadow-sm`
                      : status === 'completed'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-gray-50 border border-gray-200'
                    }
                    ${canClick && status !== 'current' ? 'active:scale-95' : ''}
                    ${!canClick ? 'opacity-50' : ''}
                  `}
                  aria-current={status === 'current' ? 'step' : undefined}
                >
                  <span
                    className={`
                      flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                      ${status === 'current'
                        ? `${step.accentColor} text-white`
                        : status === 'completed'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                      }
                    `}
                  >
                    {status === 'completed' ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className={`
                      text-sm font-medium
                      ${status === 'current'
                        ? step.textColor
                        : status === 'completed'
                        ? 'text-green-700'
                        : 'text-gray-500'
                      }
                    `}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Progress bar for mobile */}
          <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-blue-400 to-rose-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
