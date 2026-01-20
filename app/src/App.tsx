import { lazy, Suspense } from 'react';
import { useProjectStore } from './store/projectStore';
import { Header } from './components/layout/Header';
import { DropZone } from './components/upload/DropZone';
import { DetectionPreviewPanel } from './components/upload/DetectionPreviewPanel';
import { SiteSetup } from './components/setup/SiteSetup';
import { MassingEditor } from './components/editor/MassingEditor';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/Toast';
import { ContinuePrompt } from './components/common/ContinuePrompt';
import { FirstTimeHints } from './components/common/FirstTimeHints';
import { useScrollPreservation } from './hooks/useScrollPreservation';

// Lazy load heavy components to reduce initial bundle size
// ViewerPage contains Three.js (~500KB), ResultsPage has charts
const ViewerPage = lazy(() => import('./components/viewer/ViewerPage').then(m => ({ default: m.ViewerPage })));
const ResultsPage = lazy(() => import('./components/results/ResultsPage').then(m => ({ default: m.ResultsPage })));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Get background class based on current step - each section has unique theme
function getStepBackground(step: string): string {
  switch (step) {
    case 'upload':
      return 'bg-gradient-upload'; // Warm amber - welcoming for first impression
    case 'setup':
      return 'bg-gradient-setup'; // Earth tones - grounding for configuration
    case 'validate':
      return 'bg-gradient-validate'; // Fresh green - verification/confirmation
    case 'editor':
      return 'bg-gradient-editor'; // Blueprint blue - technical precision
    case 'viewer':
      return 'bg-gradient-viewer'; // Sky blue - open atmosphere for analysis
    case 'results':
      return 'bg-gradient-results'; // Rose/sunset - celebration of completion
    default:
      return 'bg-gradient-upload';
  }
}

function App() {
  const { currentStep } = useProjectStore();

  // Preserve scroll position when switching between sections
  // This prevents the disruptive auto-scroll-to-top behavior
  useScrollPreservation({
    currentStep,
    restoreOnReturn: true,
    // Upload is the only section that should always start at top
    alwaysScrollTopSections: ['upload'],
  });

  const renderStep = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <div className="py-12 animate-fade-in">
            <DropZone />
          </div>
        );

      case 'validate':
        return (
          <div className="py-8 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Auto-Detection Results
              </h2>
              <p className="text-gray-600 mt-2">
                Review detected buildings, amenities, and site elements
              </p>
            </div>
            <DetectionPreviewPanel />
          </div>
        );

      case 'setup':
        return (
          <div className="py-8 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Site Setup
              </h2>
              <p className="text-gray-600 mt-2">
                Configure orientation, scale, and location
              </p>
            </div>
            <SiteSetup />
          </div>
        );

      case 'editor':
        return (
          <div className="py-8 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Define Buildings
              </h2>
              <p className="text-gray-600 mt-2">
                Draw building footprints and set floor counts
              </p>
            </div>
            <MassingEditor />
          </div>
        );

      case 'viewer':
        return (
          <div className="py-8 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                3D Sunlight Analysis
              </h2>
              <p className="text-gray-600 mt-2">
                Explore sun movement and shadows throughout the day
              </p>
            </div>
            <Suspense fallback={<PageLoader />}>
              <ViewerPage />
            </Suspense>
          </div>
        );

      case 'results':
        return (
          <div className="py-8 animate-fade-in">
            <Suspense fallback={<PageLoader />}>
              <ResultsPage />
            </Suspense>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className={`min-h-screen flex flex-col transition-colors duration-500 ${getStepBackground(currentStep)}`}>
          {/* Continue Prompt for saved progress */}
          <ContinuePrompt />

          {/* First-time user hints */}
          <FirstTimeHints />

          {/* Skip Navigation Link for Accessibility */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-amber-500 focus:text-white focus:rounded-lg focus:outline-none"
          >
            Skip to main content
          </a>

          <Header />

          <main
            id="main-content"
            className="flex-1 container mx-auto px-4"
            style={{ overflowAnchor: 'none' }}
          >
            {renderStep()}
          </main>

          <footer className="bg-white/80 backdrop-blur-md border-t border-gray-200/50 py-6 mt-auto">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Brand */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">SunScope Pro</p>
                    <p className="text-xs text-gray-500">Open-access sunlight analysis</p>
                  </div>
                </div>

                {/* Info badges */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    No login required
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Data stays private
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Conceptual estimates only
                  </span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
