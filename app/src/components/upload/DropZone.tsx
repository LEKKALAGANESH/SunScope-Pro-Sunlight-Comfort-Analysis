import { useState, useCallback, useRef } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { sampleProjects } from '../../data/sampleProjects';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MIN_RESOLUTION = 800;

interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

export function DropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSampleModal, setShowSampleModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setImage, setLoading, loadSampleProject } = useProjectStore();

  const validateFile = (file: File): ValidationResult => {
    // Check file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'Unsupported format. Please upload JPG, PNG, or PDF.',
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: 'File exceeds 10MB limit. Please upload a smaller image.',
      };
    }

    return { valid: true };
  };

  /**
   * Extract first page from PDF as image
   */
  const processPdf = async (file: File): Promise<{ dataUrl: string; width: number; height: number }> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    // Render at 2x scale for better quality
    const scale = 2;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    // Use the correct RenderParameters interface
    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: viewport.width,
      height: viewport.height,
    };
  };

  const processImage = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setError(null);
      setLoading(true);

      try {
        const validation = validateFile(file);
        if (!validation.valid) {
          setError(validation.error || 'Invalid file');
          return;
        }

        let dataUrl: string;
        let dimensions: { width: number; height: number };

        // Handle PDF files differently
        if (file.type === 'application/pdf') {
          try {
            const pdfResult = await processPdf(file);
            dataUrl = pdfResult.dataUrl;
            dimensions = { width: pdfResult.width, height: pdfResult.height };
          } catch (pdfError) {
            console.error('PDF processing error:', pdfError);
            setError('Unable to process PDF. Please try converting it to an image first.');
            return;
          }
        } else {
          // Read file as data URL for images
          dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          // Get image dimensions
          dimensions = await new Promise<{ width: number; height: number }>(
            (resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve({ width: img.width, height: img.height });
              img.onerror = reject;
              img.src = dataUrl;
            }
          );
        }

        // Check resolution warning
        if (dimensions.width < MIN_RESOLUTION || dimensions.height < MIN_RESOLUTION) {
          // We'll still allow it but show warning in validation step
          console.warn('Low resolution image detected');
        }

        // Set image in store
        setImage({
          dataUrl,
          width: dimensions.width,
          height: dimensions.height,
          originalName: file.name,
        });
      } catch (err) {
        console.error('Error processing image:', err);
        setError('Unable to read this file. Please try a different image.');
      } finally {
        setIsProcessing(false);
        setLoading(false);
      }
    },
    [setImage, setLoading]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        processImage(file);
      }
    },
    [processImage]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processImage(file);
      }
    },
    [processImage]
  );

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleLoadSampleProject = (projectId: string) => {
    setIsProcessing(true);
    setLoading(true);
    setShowSampleModal(false);

    try {
      loadSampleProject(projectId);
    } catch (err) {
      console.error('Error loading sample:', err);
      setError('Failed to load sample project');
    } finally {
      // Small delay to show loading state
      setTimeout(() => {
        setIsProcessing(false);
        setLoading(false);
      }, 500);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center transition-colors
          ${isDragging ? 'border-amber-500 bg-amber-50' : 'border-gray-300 hover:border-gray-400'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          {isProcessing ? (
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}

          <div>
            <p className="text-lg font-medium text-gray-900">
              {isProcessing ? 'Processing...' : 'Drag & drop your site plan image here'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or{' '}
              <button
                onClick={handleBrowseClick}
                className="text-amber-600 hover:text-amber-700 font-medium"
                disabled={isProcessing}
              >
                browse files
              </button>
            </p>
          </div>

          <p className="text-xs text-gray-600">
            Supported: JPG, PNG, PDF (max 10MB)
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mt-6 text-center">
        <button
          onClick={() => setShowSampleModal(true)}
          disabled={isProcessing}
          className="text-amber-600 hover:text-amber-700 font-medium text-sm"
        >
          Try Sample Project
        </button>
      </div>

      {/* Sample Project Selector Modal */}
      {showSampleModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowSampleModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sample-modal-title"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 id="sample-modal-title" className="text-xl font-semibold text-gray-900">
                  Choose a Sample Project
                </h2>
                <button
                  onClick={() => setShowSampleModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Select a pre-configured project to explore the tool
              </p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid gap-4">
                {sampleProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleLoadSampleProject(project.id)}
                    className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                  >
                    <div className="w-24 h-18 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0">
                      <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {project.location}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          {project.buildings.length} buildings
                        </span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Sample projects include pre-defined buildings, locations, and configurations
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">How it works:</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-amber-600 font-bold">1</span>
            </div>
            <p className="text-xs text-gray-600">Upload a site plan</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-amber-600 font-bold">2</span>
            </div>
            <p className="text-xs text-gray-600">Define buildings</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-amber-600 font-bold">3</span>
            </div>
            <p className="text-xs text-gray-600">Get sunlight insights</p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-center text-gray-600">
        No login required. Your data stays private.
      </p>
    </div>
  );
}
