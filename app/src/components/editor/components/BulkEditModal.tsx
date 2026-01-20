import { createPortal } from 'react-dom';
import { FocusTrap } from "../../common/FocusTrap";
import type { BulkEditValidationErrors } from "../types";

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildingsCount: number;
  bulkFloors: number;
  setBulkFloors: (value: number) => void;
  bulkFloorHeight: number;
  setBulkFloorHeight: (value: number) => void;
  bulkEditErrors: BulkEditValidationErrors;
  setBulkEditErrors: React.Dispatch<React.SetStateAction<BulkEditValidationErrors>>;
  validateFloorCount: (value: number) => { valid: boolean; error?: string };
  validateFloorHeight: (value: number) => { valid: boolean; error?: string };
  onApply: () => void;
}

export function BulkEditModal({
  isOpen,
  onClose,
  buildingsCount,
  bulkFloors,
  setBulkFloors,
  bulkFloorHeight,
  setBulkFloorHeight,
  bulkEditErrors,
  setBulkEditErrors,
  validateFloorCount,
  validateFloorHeight,
  onApply,
}: BulkEditModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" style={{ isolation: 'isolate' }}>
      <FocusTrap active={isOpen} onEscape={onClose}>
        <div
          className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-edit-title"
        >
          <h3
            id="bulk-edit-title"
            className="text-lg font-semibold text-gray-900 mb-4"
          >
            Bulk Edit All Buildings
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Apply these values to all {buildingsCount} buildings:
          </p>

          <div className="space-y-4">
            <div>
              <label className="label">Number of Floors</label>
              <input
                type="number"
                value={bulkFloors}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  setBulkFloors(value);
                  const validation = validateFloorCount(value);
                  setBulkEditErrors((prev) => ({
                    ...prev,
                    floors: validation.valid ? undefined : validation.error,
                  }));
                }}
                className={`input ${bulkEditErrors.floors ? "border-red-500" : ""}`}
                min="1"
                max="100"
                aria-invalid={!!bulkEditErrors.floors}
              />
              {bulkEditErrors.floors && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {bulkEditErrors.floors}
                </p>
              )}
            </div>
            <div>
              <label className="label">Floor Height (meters)</label>
              <input
                type="number"
                step="0.1"
                value={bulkFloorHeight}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 3;
                  setBulkFloorHeight(value);
                  const validation = validateFloorHeight(value);
                  setBulkEditErrors((prev) => ({
                    ...prev,
                    floorHeight: validation.valid ? undefined : validation.error,
                  }));
                }}
                className={`input ${bulkEditErrors.floorHeight ? "border-red-500" : ""}`}
                min="2"
                max="10"
                aria-invalid={!!bulkEditErrors.floorHeight}
              />
              {bulkEditErrors.floorHeight && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {bulkEditErrors.floorHeight}
                </p>
              )}
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                Total height per building:{" "}
                <span className="font-medium">
                  {(bulkFloors * bulkFloorHeight).toFixed(1)}m
                </span>
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 btn-outline">
              Cancel
            </button>
            <button onClick={onApply} className="flex-1 btn-primary">
              Apply to All
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>,
    document.body
  );
}
