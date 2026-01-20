import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useProjectStore } from '../../store/projectStore';
import { FocusTrap } from '../common/FocusTrap';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import type { AppStep } from '../../types';

// Step configuration with short labels for mobile
const steps: { key: AppStep; label: string; shortLabel: string }[] = [
  { key: 'upload', label: 'Upload', shortLabel: 'Upload' },
  { key: 'setup', label: 'Setup', shortLabel: 'Setup' },
  { key: 'validate', label: 'Validate', shortLabel: 'Check' },
  { key: 'editor', label: 'Buildings', shortLabel: 'Edit' },
  { key: 'viewer', label: 'Analyze', shortLabel: '3D' },
  { key: 'results', label: 'Results', shortLabel: 'Done' },
];

const stepOrder: AppStep[] = ['upload', 'setup', 'validate', 'editor', 'viewer', 'results'];

const stepColors: Record<AppStep, { bg: string; text: string; accent: string; ring: string }> = {
  upload: { bg: 'bg-amber-50', text: 'text-amber-700', accent: 'bg-amber-500', ring: 'ring-amber-400' },
  setup: { bg: 'bg-orange-50', text: 'text-orange-700', accent: 'bg-orange-500', ring: 'ring-orange-400' },
  validate: { bg: 'bg-emerald-50', text: 'text-emerald-700', accent: 'bg-emerald-500', ring: 'ring-emerald-400' },
  editor: { bg: 'bg-blue-50', text: 'text-blue-700', accent: 'bg-blue-500', ring: 'ring-blue-400' },
  viewer: { bg: 'bg-sky-50', text: 'text-sky-700', accent: 'bg-sky-500', ring: 'ring-sky-400' },
  results: { bg: 'bg-rose-50', text: 'text-rose-700', accent: 'bg-rose-500', ring: 'ring-rose-400' },
};

export function Header() {
  const [showHelp, setShowHelp] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { resetProject, currentStep, setCurrentStep, project } = useProjectStore();
  const { isVisible, isAtTop } = useScrollDirection({ threshold: 10, topOffset: 50 });
  const headerRef = useRef<HTMLElement>(null);

  const currentIndex = stepOrder.indexOf(currentStep);

  const canNavigateTo = (step: AppStep): boolean => {
    const targetIndex = stepOrder.indexOf(step);
    if (targetIndex < currentIndex) return true;
    switch (step) {
      case 'upload': return true;
      case 'validate':
      case 'setup':
      case 'editor': return project.image !== null;
      case 'viewer':
      case 'results': return project.image !== null && project.buildings.length > 0;
      default: return false;
    }
  };

  const getStepStatus = (step: AppStep): 'completed' | 'current' | 'upcoming' => {
    const stepIndex = stepOrder.indexOf(step);
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640 && showMobileMenu) {
        setShowMobileMenu(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showMobileMenu]);

  return (
    <>
      <header
        ref={headerRef}
        className={`
          fixed top-0 left-0 right-0 z-40
          bg-white/98 backdrop-blur-xl
          border-b border-gray-200/80
          shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)]
          transition-transform duration-300 ease-out
          ${isVisible || isAtTop ? 'translate-y-0' : '-translate-y-full'}
        `}
      >
        {/* Main Header Row */}
        <div className="px-3 sm:px-4 lg:px-6 h-12 sm:h-14 flex items-center justify-between gap-2">
          {/* Logo & Brand */}
          <button
            onClick={resetProject}
            className="flex items-center gap-2.5 group flex-shrink-0 hover:opacity-80 transition-opacity"
            title="SunScope Pro - Click for new project"
          >
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:shadow-amber-500/40 group-hover:scale-105 transition-all duration-200"
              aria-hidden="true"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
              </svg>
            </div>
            <div className="hidden xs:block">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight tracking-tight">
                SunScope<span className="text-amber-500">Pro</span>
              </h1>
            </div>
          </button>

          {/* Desktop Step Indicator */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center max-w-2xl mx-4" aria-label="Progress">
            {steps.map((step, index) => {
              const status = getStepStatus(step.key);
              const canClick = canNavigateTo(step.key);
              const colors = stepColors[step.key];
              const isLast = index === steps.length - 1;

              return (
                <div key={step.key} className="flex items-center">
                  <button
                    onClick={() => canClick && setCurrentStep(step.key)}
                    disabled={!canClick}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
                      transition-all duration-200 border
                      ${status === 'current'
                        ? `${colors.bg} ${colors.text} border-current/20 shadow-sm`
                        : status === 'completed'
                        ? 'text-emerald-600 bg-emerald-50/50 border-emerald-200/50 hover:bg-emerald-50'
                        : 'text-gray-400 bg-transparent border-transparent'
                      }
                      ${canClick && status !== 'current' ? 'hover:bg-gray-50 cursor-pointer' : ''}
                      ${!canClick ? 'cursor-not-allowed opacity-50' : ''}
                    `}
                    aria-current={status === 'current' ? 'step' : undefined}
                    title={step.label}
                  >
                    <span className={`
                      w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
                      ${status === 'current'
                        ? `${colors.accent} text-white shadow-sm`
                        : status === 'completed'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                      }
                    `}>
                      {status === 'completed' ? (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="hidden xl:inline">{step.label}</span>
                  </button>

                  {!isLast && (
                    <div className="w-6 xl:w-8 h-0.5 mx-1 rounded-full bg-gray-200 overflow-hidden">
                      <div className={`h-full transition-all duration-500 ease-out ${
                        stepOrder.indexOf(step.key) < currentIndex ? 'w-full bg-emerald-400' : 'w-0'
                      }`} />
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Tablet Step Indicator */}
          <nav className="hidden md:flex lg:hidden items-center gap-1 flex-1 justify-center max-w-md mx-2" aria-label="Progress">
            {steps.map((step, index) => {
              const status = getStepStatus(step.key);
              const canClick = canNavigateTo(step.key);
              const colors = stepColors[step.key];

              return (
                <button
                  key={step.key}
                  onClick={() => canClick && setCurrentStep(step.key)}
                  disabled={!canClick}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    transition-all duration-200 border-2
                    ${status === 'current'
                      ? `${colors.accent} text-white border-white shadow-md ${colors.ring} ring-2 ring-offset-1`
                      : status === 'completed'
                      ? 'bg-emerald-500 text-white border-emerald-400'
                      : 'bg-gray-100 text-gray-400 border-gray-200'
                    }
                    ${canClick && status !== 'current' ? 'hover:scale-110 cursor-pointer' : ''}
                    ${!canClick ? 'cursor-not-allowed opacity-50' : ''}
                  `}
                  aria-current={status === 'current' ? 'step' : undefined}
                  title={step.label}
                >
                  {status === 'completed' ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </button>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <nav className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              aria-label="Help"
              title="Help"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={() => setShowAbout(true)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              aria-label="About"
              title="About"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <button
              onClick={resetProject}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all text-sm font-medium"
              title="New Project"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden xl:inline">New</span>
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <div className="sm:hidden flex items-center gap-1.5">
            {/* Mobile Step Badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${stepColors[currentStep].bg} border border-current/10`}>
              <span className={`w-5 h-5 rounded-full ${stepColors[currentStep].accent} text-white flex items-center justify-center text-[10px] font-bold shadow-sm`}>
                {currentIndex + 1}
              </span>
              <span className={`text-xs font-semibold ${stepColors[currentStep].text}`}>{steps[currentIndex].shortLabel}</span>
            </div>

            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className={`p-2 rounded-lg transition-all ${
                showMobileMenu
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              aria-label={showMobileMenu ? 'Close menu' : 'Open menu'}
              aria-expanded={showMobileMenu}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Step Progress Bar */}
        <div className="md:hidden h-0.5 bg-gray-100">
          <div
            className={`h-full transition-all duration-500 ease-out ${stepColors[currentStep].accent}`}
            style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Mobile Dropdown Menu */}
        {showMobileMenu && (
          <>
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => setShowMobileMenu(false)}
              style={{ top: headerRef.current?.offsetHeight || 52 }}
            />
            <div className="absolute left-0 right-0 bg-white border-b border-gray-200 shadow-xl z-50 animate-slide-in-down">
              {/* Mobile Steps Grid */}
              <div className="p-4">
                <div className="grid grid-cols-6 gap-1.5">
                  {steps.map((step, index) => {
                    const status = getStepStatus(step.key);
                    const canClick = canNavigateTo(step.key);
                    const colors = stepColors[step.key];

                    return (
                      <button
                        key={step.key}
                        onClick={() => {
                          if (canClick) {
                            setCurrentStep(step.key);
                            setShowMobileMenu(false);
                          }
                        }}
                        disabled={!canClick}
                        className={`
                          flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all
                          ${status === 'current'
                            ? `${colors.bg} ${colors.text} ring-2 ${colors.ring} ring-offset-1`
                            : status === 'completed'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-gray-50 text-gray-400'
                          }
                          ${canClick ? 'active:scale-95' : 'opacity-40'}
                        `}
                      >
                        <span className={`
                          w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm
                          ${status === 'current'
                            ? `${colors.accent} text-white`
                            : status === 'completed'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                          }
                        `}>
                          {status === 'completed' ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : index + 1}
                        </span>
                        <span className="text-[9px] font-semibold leading-tight">{step.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100 mx-4" />

              {/* Mobile Actions */}
              <div className="p-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setShowHelp(true); setShowMobileMenu(false); }}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Help</span>
                  </button>
                  <button
                    onClick={() => { setShowAbout(true); setShowMobileMenu(false); }}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">About</span>
                  </button>
                </div>
                <button
                  onClick={() => { resetProject(); setShowMobileMenu(false); }}
                  className="w-full mt-2 px-3 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Project
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Spacer to prevent content from going under fixed header */}
      <div className="h-[50px] sm:h-14" />

      {/* Help Modal - using Portal to escape stacking context */}
      {showHelp && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in" style={{ isolation: 'isolate' }}>
          <FocusTrap active={showHelp} onEscape={() => setShowHelp(false)}>
            <div
              className="bg-white/95 backdrop-blur-xl rounded-2xl max-w-lg w-full p-0 max-h-[85vh] overflow-hidden shadow-2xl border border-gray-200/60 animate-scale-in"
              role="dialog"
              aria-modal="true"
              aria-labelledby="help-modal-title"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-200/60 bg-gradient-to-r from-amber-50 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 id="help-modal-title" className="text-lg font-bold text-gray-900">How to Use</h2>
                </div>
                <button
                  onClick={() => setShowHelp(false)}
                  aria-label="Close help dialog"
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-5 overflow-y-auto max-h-[55vh]">
                <div className="space-y-4">
                  {[
                    { step: 1, title: 'Upload a Site Plan', desc: 'Drag and drop or browse to upload a site plan image (JPG, PNG, or PDF).', icon: '📤' },
                    { step: 2, title: 'Set Up Your Site', desc: 'Confirm north orientation, set the scale, and specify your location.', icon: '⚙️' },
                    { step: 3, title: 'Validate Detection', desc: 'Review auto-detected buildings and amenities.', icon: '✅' },
                    { step: 4, title: 'Define Buildings', desc: 'Trace building footprints and set floor counts.', icon: '🏢' },
                    { step: 5, title: 'Analyze Sunlight', desc: 'Explore sun movement and shadows throughout the day.', icon: '☀️' },
                    { step: 6, title: 'View Results', desc: 'Get insights on sunlight timing and comfort.', icon: '📊' },
                  ].map(({ step, title, desc, icon }) => (
                    <div key={step} className="flex gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200/60 flex items-center justify-center text-base">
                        {icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                          <span className="text-[10px] text-gray-400">Step {step}</span>
                          {title}
                        </h3>
                        <p className="text-xs text-gray-600 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t border-gray-200/60 bg-gray-50/50">
                <button onClick={() => setShowHelp(false)} className="w-full btn-primary py-2">
                  Got it
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>,
        document.body
      )}

      {/* About Modal - using Portal to escape stacking context */}
      {showAbout && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in" style={{ isolation: 'isolate' }}>
          <FocusTrap active={showAbout} onEscape={() => setShowAbout(false)}>
            <div
              className="bg-white/95 backdrop-blur-xl rounded-2xl max-w-lg w-full p-0 overflow-hidden shadow-2xl border border-gray-200/60 animate-scale-in"
              role="dialog"
              aria-modal="true"
              aria-labelledby="about-modal-title"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-200/60 bg-gradient-to-r from-amber-50 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h2 id="about-modal-title" className="text-lg font-bold text-gray-900">About SunScope Pro</h2>
                </div>
                <button
                  onClick={() => setShowAbout(false)}
                  aria-label="Close about dialog"
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-5">
                <div className="space-y-4 text-sm text-gray-600">
                  <p className="text-gray-700">
                    SunScope Pro is an open-access tool for analyzing sunlight exposure and thermal comfort. <strong>No login required.</strong>
                  </p>
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex -space-x-1">
                      <div className="w-7 h-7 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-amber-600">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-green-100 border-2 border-white flex items-center justify-center text-green-600">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">Your data stays private - all processing in browser</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex gap-2">
                      <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <strong className="text-amber-800 text-xs font-semibold">Disclaimer</strong>
                        <p className="text-amber-700 text-xs mt-0.5">
                          Conceptual estimates only. For early-stage exploration, not engineering analysis.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200/60 bg-gray-50/50">
                <button onClick={() => setShowAbout(false)} className="w-full btn-primary py-2">
                  Close
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>,
        document.body
      )}
    </>
  );
}
