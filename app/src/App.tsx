import { lazy, Suspense } from 'react';
import { useProjectStore } from './store/projectStore';
import { Header } from './components/layout/Header';
import { StepIndicator } from './components/layout/StepIndicator';
import { DropZone } from './components/upload/DropZone';
import { DetectionPreviewPanel } from './components/upload/DetectionPreviewPanel';
import { SiteSetup } from './components/setup/SiteSetup';
import { MassingEditor } from './components/editor/MassingEditor';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/Toast';
import { ContinuePrompt } from './components/common/ContinuePrompt';
import { FirstTimeHints } from './components/common/FirstTimeHints';

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

function App() {
  const { currentStep } = useProjectStore();

  const renderStep = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <div className="py-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                Upload Your Site Plan
              </h2>
              <p className="text-gray-600 mt-2">
                Start by uploading an image of your site plan
              </p>
            </div>
            <DropZone />
          </div>
        );

      case 'validate':
        return (
          <div className="py-8">
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
          <div className="py-8">
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
          <div className="py-8">
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
          <div className="py-8">
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
          <div className="py-8">
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
        <div className="min-h-screen bg-gray-50 flex flex-col">
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
          <StepIndicator />

          <main id="main-content" className="flex-1 container mx-auto px-4">
            {renderStep()}
          </main>

          <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
            <div className="container mx-auto px-4 text-center text-sm text-gray-500">
              <p>
                SunScope Pro - Open-access sunlight and comfort analysis tool.
                No login required.
              </p>
              <p className="mt-1 text-xs">
                Results are conceptual estimates for early-stage exploration.
              </p>
            </div>
          </footer>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
