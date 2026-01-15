import { useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { FocusTrap } from '../common/FocusTrap';

export function Header() {
  const [showHelp, setShowHelp] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { resetProject } = useProjectStore();

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center" aria-hidden="true">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">SunScope Pro</h1>
            <p className="text-xs text-gray-500">Sunlight & Comfort Analysis</p>
          </div>
        </div>

        {/* Desktop menu */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Help
          </button>
          <button
            onClick={() => setShowAbout(true)}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            About
          </button>
          <button
            onClick={resetProject}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            New Project
          </button>
        </div>

        {/* Mobile hamburger menu */}
        <div className="sm:hidden relative">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Open menu"
            aria-expanded={showMobileMenu}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {showMobileMenu ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Mobile dropdown */}
          {showMobileMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
              <button
                onClick={() => {
                  setShowHelp(true);
                  setShowMobileMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-100"
              >
                Help
              </button>
              <button
                onClick={() => {
                  setShowAbout(true);
                  setShowMobileMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-100"
              >
                About
              </button>
              <button
                onClick={() => {
                  resetProject();
                  setShowMobileMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-100"
              >
                New Project
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <FocusTrap active={showHelp} onEscape={() => setShowHelp(false)}>
            <div
              className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto"
              role="dialog"
              aria-modal="true"
              aria-labelledby="help-modal-title"
            >
              <div className="flex justify-between items-start mb-4">
                <h2 id="help-modal-title" className="text-xl font-bold">How to Use</h2>
                <button
                  onClick={() => setShowHelp(false)}
                  aria-label="Close help dialog"
                  className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-lg p-1"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            <div className="space-y-4 text-sm text-gray-600">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">1. Upload a Site Plan</h3>
                <p>Drag and drop or browse to upload a site plan image (JPG, PNG, or PDF).</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">2. Set Up Your Site</h3>
                <p>Confirm north orientation, set the scale, and specify your location.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">3. Define Buildings</h3>
                <p>Trace building footprints on the image and set floor counts and heights.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">4. Analyze Sunlight</h3>
                <p>Select a building and floor, choose a date, and explore sun movement.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">5. View Results</h3>
                <p>Get insights on sunlight timing, heat impact, and comfort recommendations.</p>
              </div>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full btn-primary"
            >
              Got it
            </button>
            </div>
          </FocusTrap>
        </div>
      )}

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <FocusTrap active={showAbout} onEscape={() => setShowAbout(false)}>
            <div
              className="bg-white rounded-xl max-w-lg w-full p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="about-modal-title"
            >
              <div className="flex justify-between items-start mb-4">
                <h2 id="about-modal-title" className="text-xl font-bold">About SunScope Pro</h2>
                <button
                  onClick={() => setShowAbout(false)}
                  aria-label="Close about dialog"
                  className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-lg p-1"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            <div className="space-y-4 text-sm text-gray-600">
              <p>
                SunScope Pro is an open-access tool for analyzing sunlight exposure
                and comfort for buildings. No login required.
              </p>
              <p>
                Upload a site plan, define building massing, and get insights on
                sunlight timing, solar heat, and daily comfort recommendations.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
                <strong>Disclaimer:</strong> This tool provides conceptual estimates
                based on simplified assumptions. Results are for early-stage
                exploration, not engineering analysis.
              </div>
            </div>
            <button
              onClick={() => setShowAbout(false)}
              className="mt-6 w-full btn-primary"
            >
              Close
            </button>
            </div>
          </FocusTrap>
        </div>
      )}
    </>
  );
}
