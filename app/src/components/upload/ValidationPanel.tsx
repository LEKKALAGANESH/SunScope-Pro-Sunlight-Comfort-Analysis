import { useMemo } from 'react';
import { useProjectStore } from '../../store/projectStore';
import type { ValidationItem } from '../../types';

export function ValidationPanel() {
  const { project, setCurrentStep, clearImage } = useProjectStore();
  const image = project.image;

  const validationItems = useMemo<ValidationItem[]>(() => {
    if (!image) return [];

    const items: ValidationItem[] = [];

    // Detected items
    items.push({
      label: 'Site layout visible',
      status: 'detected',
      description: 'Image loaded successfully',
    });

    items.push({
      label: 'Image resolution',
      status: image.width >= 800 && image.height >= 800 ? 'detected' : 'needs-confirmation',
      description: `${image.width} x ${image.height} px`,
    });

    items.push({
      label: 'Building shapes identifiable',
      status: 'detected',
      description: 'Review and trace in editor',
    });

    // Needs confirmation
    items.push({
      label: 'North orientation',
      status: 'needs-confirmation',
      description: 'Set in next step',
    });

    items.push({
      label: 'Scale / dimensions',
      status: 'needs-confirmation',
      description: 'Define real-world measurements',
    });

    items.push({
      label: 'Geographic location',
      status: 'needs-confirmation',
      description: 'Specify city or coordinates',
    });

    // Missing (user must provide)
    items.push({
      label: 'Number of floors',
      status: 'missing',
      description: 'Cannot be detected from image',
    });

    items.push({
      label: 'Floor heights',
      status: 'missing',
      description: 'You will provide this',
    });

    return items;
  }, [image]);

  const detectedItems = validationItems.filter((i) => i.status === 'detected');
  const confirmItems = validationItems.filter((i) => i.status === 'needs-confirmation');
  const missingItems = validationItems.filter((i) => i.status === 'missing');

  if (!image) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Image Preview */}
        <div className="card">
          <h3 className="font-medium text-gray-900 mb-3">Uploaded Image</h3>
          <div className="relative aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={image.dataUrl}
              alt="Site plan preview"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="mt-3 text-sm text-gray-500">
            <p>{image.originalName}</p>
            <p>{image.width} x {image.height} px</p>
          </div>
        </div>

        {/* Validation Checklist */}
        <div className="card">
          <h3 className="font-medium text-gray-900 mb-4">Validation Checklist</h3>

          {/* Detected */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">
              Detected
            </h4>
            <ul className="space-y-2">
              {detectedItems.map((item) => (
                <li key={item.label} className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-900">{item.label}</p>
                    {item.description && (
                      <p className="text-xs text-gray-500">{item.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Needs Confirmation */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-2">
              Needs Confirmation
            </h4>
            <ul className="space-y-2">
              {confirmItems.map((item) => (
                <li key={item.label} className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-900">{item.label}</p>
                    {item.description && (
                      <p className="text-xs text-gray-500">{item.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Missing */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              You Will Provide
            </h4>
            <ul className="space-y-2">
              {missingItems.map((item) => (
                <li key={item.label} className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-900">{item.label}</p>
                    {item.description && (
                      <p className="text-xs text-gray-500">{item.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-between items-center">
        <button onClick={clearImage} className="btn-outline">
          Upload Different Image
        </button>
        <button onClick={() => setCurrentStep('setup')} className="btn-primary">
          Continue to Setup
        </button>
      </div>
    </div>
  );
}
