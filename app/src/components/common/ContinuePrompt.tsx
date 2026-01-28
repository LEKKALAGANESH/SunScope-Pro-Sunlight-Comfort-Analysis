/**
 * ContinuePrompt Component
 *
 * Shows a prompt to continue from where the user left off
 * when there is saved progress in localStorage.
 */

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useProjectStore } from "../../store/projectStore";
import { FocusTrap } from "./FocusTrap";

export function ContinuePrompt() {
  const {
    hasSavedProgress,
    lastSavedAt,
    currentStep,
    project,
    clearSavedProgress,
  } = useProjectStore();

  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show prompt only if:
    // 1. There is saved progress
    // 2. User hasn't dismissed it
    // 3. We're on the upload step (fresh page load)
    // 4. There's actual content saved (image or buildings)
    const hasContent = project.image !== null || project.buildings.length > 0;

    if (
      hasSavedProgress &&
      !dismissed &&
      currentStep === "upload" &&
      hasContent
    ) {
      // Small delay to prevent flash
      const timer = setTimeout(() => setShowPrompt(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowPrompt(false);
    }
  }, [
    hasSavedProgress,
    dismissed,
    currentStep,
    project.image,
    project.buildings.length,
  ]);

  const handleContinue = useCallback(() => {
    setShowPrompt(false);
    setDismissed(true);
    // Navigate to the saved step
    useProjectStore
      .getState()
      .setCurrentStep(
        project.image
          ? project.buildings.length > 0
            ? "editor"
            : "setup"
          : "upload",
      );
  }, [project.image, project.buildings.length]);

  const handleStartFresh = useCallback(() => {
    setShowPrompt(false);
    setDismissed(true);
    clearSavedProgress();
  }, [clearSavedProgress]);

  // Keyboard handler
  useEffect(() => {
    if (!showPrompt) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleContinue();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleStartFresh();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPrompt, handleContinue, handleStartFresh]);

  const formatTimeAgo = (date: Date | null): string => {
    if (!date) return "";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  const getProgressSummary = (): string => {
    const parts: string[] = [];

    if (project.buildings.length > 0) {
      parts.push(
        `${project.buildings.length} building${project.buildings.length > 1 ? "s" : ""}`,
      );
    }

    if (project.site.location.city) {
      parts.push(project.site.location.city);
    }

    return parts.length > 0 ? parts.join(" in ") : "your project";
  };

  if (!showPrompt) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
      style={{ isolation: "isolate" }}
    >
      <FocusTrap active={showPrompt} onEscape={handleStartFresh}>
        <div
          className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="continue-prompt-title"
        >
          {/* Icon */}
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Title */}
          <h2
            id="continue-prompt-title"
            className="text-xl font-bold text-gray-900 text-center mb-2"
          >
            Welcome Back!
          </h2>

          {/* Description */}
          <p className="text-gray-600 text-center mb-6">
            You have unsaved progress from {formatTimeAgo(lastSavedAt)}.
            <br />
            <span className="text-gray-500 text-sm">
              ({getProgressSummary()})
            </span>
          </p>

          {/* Preview if there's an image */}
          {project.image && (
            <div className="mb-6 rounded-lg overflow-hidden border border-gray-200">
              <img
                src={project.image.dataUrl}
                alt="Saved project preview"
                className="w-full h-32 object-cover"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleStartFresh}
              className="flex-1 py-2.5 px-4 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Start Fresh
            </button>
            <button
              onClick={handleContinue}
              className="flex-1 py-2.5 px-4 bg-amber-500 rounded-lg text-white font-medium hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
            >
              Continue
            </button>
          </div>

          {/* Keyboard hint */}
          <p className="text-xs text-gray-600 text-center mt-4">
            Press Enter to continue or Escape to start fresh
          </p>
        </div>
      </FocusTrap>
    </div>,
    document.body,
  );
}
