import { FocusTrap } from "../../common/FocusTrap";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildingsCount: number;
  groupsCount: number;
  onExport: () => void;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (content: string) => void;
}

// Export Modal Component
export function ExportModal({
  isOpen,
  onClose,
  buildingsCount,
  groupsCount,
  onExport,
}: ExportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <FocusTrap active={isOpen} onEscape={onClose}>
        <div
          className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-modal-title"
        >
          <h3
            id="export-modal-title"
            className="text-lg font-semibold text-gray-900 mb-4"
          >
            Export Buildings
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Download your building configuration as a JSON file. This includes
            all building footprints, floors, heights, and groups.
          </p>

          <div className="bg-green-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-green-700">
              <span className="font-medium">{buildingsCount}</span> building(s)
              will be exported
              {groupsCount > 0 && (
                <>
                  {" "}
                  with <span className="font-medium">{groupsCount}</span>{" "}
                  group(s)
                </>
              )}
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 btn-outline">
              Cancel
            </button>
            <button onClick={onExport} className="flex-1 btn-primary">
              Download JSON
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}

// Import Modal Component
export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        onImport(content);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <FocusTrap active={isOpen} onEscape={onClose}>
        <div
          className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-modal-title"
        >
          <h3
            id="import-modal-title"
            className="text-lg font-semibold text-gray-900 mb-4"
          >
            Import Buildings
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Import building configuration from a JSON file. Buildings will be
            added to your current project.
          </p>

          <div className="space-y-4">
            <div>
              <label className="label">Select JSON File</label>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
            </div>
            <p className="text-xs text-gray-400">
              Supported format: JSON files exported from this tool
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 btn-outline">
              Cancel
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
