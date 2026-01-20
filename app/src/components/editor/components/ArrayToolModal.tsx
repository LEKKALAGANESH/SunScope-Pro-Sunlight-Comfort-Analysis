import { createPortal } from 'react-dom';
import { FocusTrap } from "../../common/FocusTrap";
import type { ArrayConfig } from "../types";

interface ArrayToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  arrayConfig: ArrayConfig;
  setArrayConfig: React.Dispatch<React.SetStateAction<ArrayConfig>>;
  onApply: () => void;
}

export function ArrayToolModal({
  isOpen,
  onClose,
  arrayConfig,
  setArrayConfig,
  onApply,
}: ArrayToolModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" style={{ isolation: 'isolate' }}>
      <FocusTrap active={isOpen} onEscape={onClose}>
        <div
          className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="array-modal-title"
        >
          <h3
            id="array-modal-title"
            className="text-lg font-semibold text-gray-900 mb-4"
          >
            Create Building Array
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Create a grid of copies from the selected building.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Rows</label>
                <input
                  type="number"
                  value={arrayConfig.rows}
                  onChange={(e) =>
                    setArrayConfig((prev) => ({
                      ...prev,
                      rows: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                  className="input"
                  min="1"
                  max="10"
                />
              </div>
              <div>
                <label className="label">Columns</label>
                <input
                  type="number"
                  value={arrayConfig.columns}
                  onChange={(e) =>
                    setArrayConfig((prev) => ({
                      ...prev,
                      columns: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                  className="input"
                  min="1"
                  max="10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">X Spacing (px)</label>
                <input
                  type="number"
                  value={arrayConfig.spacingX}
                  onChange={(e) =>
                    setArrayConfig((prev) => ({
                      ...prev,
                      spacingX: Math.max(0, parseInt(e.target.value) || 0),
                    }))
                  }
                  className="input"
                  min="0"
                />
              </div>
              <div>
                <label className="label">Y Spacing (px)</label>
                <input
                  type="number"
                  value={arrayConfig.spacingY}
                  onChange={(e) =>
                    setArrayConfig((prev) => ({
                      ...prev,
                      spacingY: Math.max(0, parseInt(e.target.value) || 0),
                    }))
                  }
                  className="input"
                  min="0"
                />
              </div>
            </div>
            <div className="bg-indigo-50 p-3 rounded-lg">
              <p className="text-sm text-indigo-700">
                This will create{" "}
                <span className="font-medium">
                  {arrayConfig.rows * arrayConfig.columns - 1}
                </span>{" "}
                new buildings
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 btn-outline">
              Cancel
            </button>
            <button onClick={onApply} className="flex-1 btn-primary">
              Create Array
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>,
    document.body
  );
}
