interface EditorActionsProps {
  buildingsCount: number;
  onBack: () => void;
  onContinue: () => void;
}

export function EditorActions({
  buildingsCount,
  onBack,
  onContinue,
}: EditorActionsProps) {
  return (
    <div className="mt-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
      <button
        onClick={onBack}
        className="btn-editor-secondary order-2 sm:order-1"
      >
        Back
      </button>
      <button
        onClick={onContinue}
        disabled={buildingsCount === 0}
        className="btn-editor-primary order-1 sm:order-2"
      >
        Continue to 3D View
      </button>
    </div>
  );
}
