import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  Project,
  Building,
  Amenity,
  ProjectImage,
  SiteConfig,
  AnalysisResults,
  Scenario,
  AppStep,
  Point2D,
  ImageAnalysisResult,
  DisplaySettings,
  Measurement,
  Vector3,
  ImportSummary,
} from '../types';

// Storage version for migrations
const STORAGE_VERSION = 1;
const STORAGE_KEY = 'sunscope-project';

interface ProjectState {
  // Current project
  project: Project;

  // UI state
  currentStep: AppStep;
  isLoading: boolean;
  error: string | null;

  // Image analysis detection
  detectionResult: ImageAnalysisResult | null;
  isAnalyzing: boolean;

  // Analysis results
  analysisResults: AnalysisResults | null;

  // 3D View snapshot for export
  viewerSnapshot: string | null; // Base64 data URL

  // Scenarios
  scenarios: Scenario[];
  activeScenarioId: string | null;

  // Time control
  currentTime: Date;
  isAnimating: boolean;
  animationSpeed: number;

  // Display settings for 3D viewer
  displaySettings: DisplaySettings;

  // Measurement tool
  measurements: Measurement[];
  measurementMode: boolean;

  // Persistence state
  lastSavedAt: Date | null;
  hasSavedProgress: boolean;
  hasSeenWelcome: boolean;

  // Actions
  setImage: (image: ProjectImage) => void;
  clearImage: () => void;
  setSiteConfig: (config: Partial<SiteConfig>) => void;
  setLocation: (lat: number, lon: number, city?: string) => void;
  addBuilding: (footprint: Point2D[], name?: string) => void;
  updateBuilding: (id: string, updates: Partial<Building>) => void;
  removeBuilding: (id: string) => void;
  selectBuilding: (id: string | undefined) => void;
  selectFloor: (floor: number | undefined) => void;
  setAnalysisDate: (date: Date) => void;
  setCurrentTime: (time: Date) => void;
  setCurrentStep: (step: AppStep) => void;
  setAnalysisResults: (results: AnalysisResults | null) => void;
  addScenario: (scenario: Omit<Scenario, 'id'>) => void;
  updateScenario: (id: string, updates: Partial<Scenario>) => void;
  setActiveScenario: (id: string | null) => void;
  setIsAnimating: (isAnimating: boolean) => void;
  setAnimationSpeed: (speed: number) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setViewerSnapshot: (snapshot: string | null) => void;
  resetProject: () => void;
  clearSavedProgress: () => void;
  setHasSeenWelcome: (seen: boolean) => void;

  // Detection actions
  setDetectionResult: (result: ImageAnalysisResult | null) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  toggleDetectedBuilding: (buildingId: string) => void;
  selectAllDetectedBuildings: (selected: boolean) => void;
  toggleDetectedAmenity: (amenityId: string) => void;
  selectAllDetectedAmenities: (selected: boolean) => void;
  importSelectedElements: () => ImportSummary;
  importSelectedBuildings: () => void; // Legacy - calls importSelectedElements

  // Sample project loading
  loadSampleProject: (projectId: string) => void;

  // Display settings actions
  setDisplaySettings: (settings: Partial<DisplaySettings>) => void;
  setFloorTransparency: (opacity: number) => void;
  toggleShadowHeatmap: (show: boolean) => void;
  setHeatmapOpacity: (opacity: number) => void;

  // Measurement actions
  setMeasurementMode: (enabled: boolean) => void;
  addMeasurement: (point1: Vector3, point2: Vector3) => void;
  removeMeasurement: (id: string) => void;
  clearMeasurements: () => void;
}

const getDefaultProject = (): Project => ({
  id: uuidv4(),
  createdAt: new Date(),
  image: null,
  site: {
    northAngle: 0,
    scale: 1, // meters per pixel
    location: {
      latitude: 40.7128,
      longitude: -74.006,
      timezone: 'America/New_York',
      city: 'New York',
    },
  },
  buildings: [],
  amenities: [],
  importSummary: null,
  analysis: {
    date: new Date(),
    timeRange: { start: 6, end: 20 },
    selectedBuildingId: undefined,
    selectedFloor: undefined,
  },
});

const getDefaultScenario = (): Scenario => ({
  id: uuidv4(),
  name: 'Default',
  isActive: true,
  window: { state: 'closed', ventilationFactor: 0 },
  glazing: { type: 'double', solarTransmittance: 0.76 },
  shading: { interior: 'none', exterior: 'none', reductionFactor: 1 },
});

const getDefaultDisplaySettings = (): DisplaySettings => ({
  floorTransparency: 0.6,
  showFloorLabels: true,
  showShadowHeatmap: false,
  heatmapOpacity: 0.5,
});

// Helper to calculate polygon area
const calculatePolygonArea = (points: Point2D[]): number => {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
};

// Generate building colors
const buildingColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      project: getDefaultProject(),
      currentStep: 'upload',
      isLoading: false,
      error: null,
      detectionResult: null,
      isAnalyzing: false,
      analysisResults: null,
      viewerSnapshot: null,
      scenarios: [getDefaultScenario()],
      activeScenarioId: null,
      currentTime: new Date(),
      isAnimating: false,
      animationSpeed: 1,
      displaySettings: getDefaultDisplaySettings(),
      measurements: [],
      measurementMode: false,
      lastSavedAt: null,
      hasSavedProgress: false,
      hasSeenWelcome: false,

  setImage: (image) =>
    set((state) => ({
      project: { ...state.project, image },
      currentStep: 'validate',
      hasSavedProgress: true,
      lastSavedAt: new Date(),
    })),

  clearImage: () =>
    set((state) => ({
      project: { ...state.project, image: null },
      currentStep: 'upload',
    })),

  setSiteConfig: (config) =>
    set((state) => ({
      project: {
        ...state.project,
        site: { ...state.project.site, ...config },
      },
    })),

  setLocation: (latitude, longitude, city) =>
    set((state) => ({
      project: {
        ...state.project,
        site: {
          ...state.project.site,
          location: {
            ...state.project.site.location,
            latitude,
            longitude,
            city: city || state.project.site.location.city,
          },
        },
      },
    })),

  addBuilding: (footprint, name) =>
    set((state) => {
      const buildingCount = state.project.buildings.length;
      const newBuilding: Building = {
        id: uuidv4(),
        name: name || `Building ${buildingCount + 1}`,
        footprint,
        floors: 4,
        floorHeight: 3,
        baseElevation: 0,
        totalHeight: 12,
        area: calculatePolygonArea(footprint),
        color: buildingColors[buildingCount % buildingColors.length],
      };
      return {
        project: {
          ...state.project,
          buildings: [...state.project.buildings, newBuilding],
        },
      };
    }),

  updateBuilding: (id, updates) =>
    set((state) => ({
      project: {
        ...state.project,
        buildings: state.project.buildings.map((b) => {
          if (b.id !== id) return b;
          const updated = { ...b, ...updates };
          // Recalculate derived values
          if (updates.floors !== undefined || updates.floorHeight !== undefined) {
            updated.totalHeight = updated.floors * updated.floorHeight;
          }
          if (updates.footprint !== undefined) {
            updated.area = calculatePolygonArea(updated.footprint);
          }
          return updated;
        }),
      },
    })),

  removeBuilding: (id) =>
    set((state) => ({
      project: {
        ...state.project,
        buildings: state.project.buildings.filter((b) => b.id !== id),
        analysis: {
          ...state.project.analysis,
          selectedBuildingId:
            state.project.analysis.selectedBuildingId === id
              ? undefined
              : state.project.analysis.selectedBuildingId,
        },
      },
    })),

  selectBuilding: (id) =>
    set((state) => ({
      project: {
        ...state.project,
        analysis: { ...state.project.analysis, selectedBuildingId: id },
      },
    })),

  selectFloor: (floor) =>
    set((state) => ({
      project: {
        ...state.project,
        analysis: { ...state.project.analysis, selectedFloor: floor },
      },
    })),

  setAnalysisDate: (date) =>
    set((state) => ({
      project: {
        ...state.project,
        analysis: { ...state.project.analysis, date },
      },
    })),

  setCurrentTime: (time) => set({ currentTime: time }),

  setCurrentStep: (step) => set({ currentStep: step }),

  setAnalysisResults: (results) => set({ analysisResults: results }),

  addScenario: (scenario) =>
    set((state) => ({
      scenarios: [...state.scenarios, { ...scenario, id: uuidv4() }],
    })),

  updateScenario: (id, updates) =>
    set((state) => ({
      scenarios: state.scenarios.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),

  setActiveScenario: (id) => set({ activeScenarioId: id }),

  setIsAnimating: (isAnimating) => set({ isAnimating }),

  setAnimationSpeed: (speed) => set({ animationSpeed: speed }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setViewerSnapshot: (snapshot) => set({ viewerSnapshot: snapshot }),

  resetProject: () =>
    set({
      project: getDefaultProject(),
      currentStep: 'upload',
      analysisResults: null,
      detectionResult: null,
      viewerSnapshot: null,
      scenarios: [getDefaultScenario()],
      activeScenarioId: null,
      displaySettings: getDefaultDisplaySettings(),
      measurements: [],
      measurementMode: false,
      hasSavedProgress: false,
      lastSavedAt: null,
    }),

  clearSavedProgress: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({
      project: getDefaultProject(),
      currentStep: 'upload',
      analysisResults: null,
      detectionResult: null,
      viewerSnapshot: null,
      scenarios: [getDefaultScenario()],
      activeScenarioId: null,
      displaySettings: getDefaultDisplaySettings(),
      measurements: [],
      measurementMode: false,
      hasSavedProgress: false,
      lastSavedAt: null,
    });
  },

  setHasSeenWelcome: (seen) => set({ hasSeenWelcome: seen }),

  // Detection actions
  setDetectionResult: (result) => set({ detectionResult: result }),

  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),

  toggleDetectedBuilding: (buildingId) =>
    set((state) => {
      if (!state.detectionResult) return state;
      return {
        detectionResult: {
          ...state.detectionResult,
          buildings: state.detectionResult.buildings.map((b) =>
            b.id === buildingId ? { ...b, selected: !b.selected } : b
          ),
        },
      };
    }),

  selectAllDetectedBuildings: (selected) =>
    set((state) => {
      if (!state.detectionResult) return state;
      return {
        detectionResult: {
          ...state.detectionResult,
          buildings: state.detectionResult.buildings.map((b) => ({
            ...b,
            selected,
          })),
        },
      };
    }),

  toggleDetectedAmenity: (amenityId) =>
    set((state) => {
      if (!state.detectionResult) return state;
      return {
        detectionResult: {
          ...state.detectionResult,
          amenities: state.detectionResult.amenities.map((a) =>
            a.id === amenityId ? { ...a, selected: !a.selected } : a
          ),
        },
      };
    }),

  selectAllDetectedAmenities: (selected) =>
    set((state) => {
      if (!state.detectionResult) return state;
      return {
        detectionResult: {
          ...state.detectionResult,
          amenities: state.detectionResult.amenities.map((a) => ({
            ...a,
            selected,
          })),
        },
      };
    }),

  importSelectedElements: () => {
    const state = get();
    const summary: ImportSummary = {
      buildingsImported: 0,
      amenitiesImported: 0,
      compassApplied: false,
      scaleApplied: false,
      importedAt: new Date(),
    };

    if (!state.detectionResult) return summary;

    // Import selected buildings
    const selectedBuildings = state.detectionResult.buildings.filter(
      (b) => b.selected
    );
    const existingBuildingCount = state.project.buildings.length;
    const newBuildings: Building[] = selectedBuildings.map((detected, index) => ({
      id: uuidv4(),
      name: detected.suggestedName || `Building ${existingBuildingCount + index + 1}`,
      footprint: detected.footprint,
      floors: 4,
      floorHeight: 3,
      baseElevation: 0,
      totalHeight: 12,
      area: detected.area,
      color: buildingColors[(existingBuildingCount + index) % buildingColors.length],
    }));
    summary.buildingsImported = newBuildings.length;

    // Import selected amenities
    const selectedAmenities = state.detectionResult.amenities.filter(
      (a) => a.selected
    );
    const amenityLabels: Record<string, string> = {
      swimming_pool: 'Swimming Pool',
      tennis_court: 'Tennis Court',
      basketball_court: 'Basketball Court',
      playground: 'Playground',
      clubhouse: 'Clubhouse',
      parking: 'Parking',
      garden: 'Garden',
      water_body: 'Water Body',
      jogging_track: 'Jogging Track',
      unknown: 'Unknown Amenity',
    };
    const newAmenities: Amenity[] = selectedAmenities.map((detected, index) => ({
      id: uuidv4(),
      type: detected.type,
      name: detected.label || amenityLabels[detected.type] || `Amenity ${index + 1}`,
      position: detected.position,
      boundingBox: detected.boundingBox,
      confidence: detected.confidence,
    }));
    summary.amenitiesImported = newAmenities.length;

    // Apply compass if detected with good confidence
    let newNorthAngle = state.project.site.northAngle;
    if (state.detectionResult.compass && state.detectionResult.compass.confidence > 0.5) {
      newNorthAngle = state.detectionResult.compass.northAngle;
      summary.compassApplied = true;
    }

    // Apply scale if detected with good confidence
    let newScale = state.project.site.scale;
    if (state.detectionResult.scale && state.detectionResult.scale.suggestedMeters && state.detectionResult.scale.confidence > 0.5) {
      newScale = state.detectionResult.scale.suggestedMeters / state.detectionResult.scale.pixelLength;
      summary.scaleApplied = true;
    }

    set((state) => ({
      project: {
        ...state.project,
        buildings: [...state.project.buildings, ...newBuildings],
        amenities: [...state.project.amenities, ...newAmenities],
        importSummary: summary,
        site: {
          ...state.project.site,
          northAngle: newNorthAngle,
          scale: newScale,
        },
      },
      hasSavedProgress: true,
      lastSavedAt: new Date(),
      // Clear selection after import
      detectionResult: state.detectionResult
        ? {
            ...state.detectionResult,
            buildings: state.detectionResult.buildings.map((b) => ({
              ...b,
              selected: false,
            })),
            amenities: state.detectionResult.amenities.map((a) => ({
              ...a,
              selected: false,
            })),
          }
        : null,
    }));

    return summary;
  },

  // Legacy function - calls importSelectedElements
  importSelectedBuildings: () => {
    get().importSelectedElements();
  },

  // Sample project loading
  loadSampleProject: (projectId: string) => {
    // Dynamic import to avoid circular dependency
    import('../data/sampleProjects').then(({ getSampleProjectById, generateSampleImage }) => {
      const sample = getSampleProjectById(projectId);
      if (!sample) {
        console.error(`Sample project not found: ${projectId}`);
        return;
      }

      const image = generateSampleImage(sample);

      set({
        project: {
          id: uuidv4(),
          createdAt: new Date(),
          image,
          site: sample.site,
          buildings: sample.buildings.map(b => ({
            ...b,
            id: uuidv4(), // Generate new IDs
          })),
          amenities: [], // Sample projects don't have amenities
          importSummary: null,
          analysis: {
            date: new Date(),
            timeRange: { start: 6, end: 20 },
            selectedBuildingId: undefined,
            selectedFloor: undefined,
          },
        },
        currentStep: 'viewer', // Skip to viewer since buildings are pre-configured
        detectionResult: null,
        analysisResults: null,
        hasSavedProgress: true,
        lastSavedAt: new Date(),
      });
    });
  },

  // Display settings actions
  setDisplaySettings: (settings) =>
    set((state) => ({
      displaySettings: { ...state.displaySettings, ...settings },
    })),

  setFloorTransparency: (opacity) =>
    set((state) => ({
      displaySettings: { ...state.displaySettings, floorTransparency: opacity },
    })),

  toggleShadowHeatmap: (show) =>
    set((state) => ({
      displaySettings: { ...state.displaySettings, showShadowHeatmap: show },
    })),

  setHeatmapOpacity: (opacity) =>
    set((state) => ({
      displaySettings: { ...state.displaySettings, heatmapOpacity: opacity },
    })),

  // Measurement actions
  setMeasurementMode: (enabled) => set({ measurementMode: enabled }),

  addMeasurement: (point1, point2) => {
    const distance = Math.sqrt(
      Math.pow(point2.x - point1.x, 2) +
      Math.pow(point2.y - point1.y, 2) +
      Math.pow(point2.z - point1.z, 2)
    );
    const newMeasurement: Measurement = {
      id: uuidv4(),
      point1,
      point2,
      distance,
      createdAt: new Date(),
    };
    set((state) => ({
      measurements: [...state.measurements, newMeasurement],
    }));
  },

  removeMeasurement: (id) =>
    set((state) => ({
      measurements: state.measurements.filter((m) => m.id !== id),
    })),

  clearMeasurements: () => set({ measurements: [] }),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      // Only persist essential state, not transient UI state
      // Exclude large image data to avoid localStorage quota errors
      partialize: (state) => ({
        project: {
          ...state.project,
          // Exclude the image dataUrl - it's too large for localStorage
          // Users will need to re-upload on page refresh
          image: state.project.image
            ? {
                ...state.project.image,
                dataUrl: '', // Store empty string, not the full base64
              }
            : null,
        },
        currentStep: state.currentStep,
        scenarios: state.scenarios,
        displaySettings: state.displaySettings,
        hasSavedProgress: state.hasSavedProgress,
        lastSavedAt: state.lastSavedAt,
        hasSeenWelcome: state.hasSeenWelcome,
      }),
      // Handle Date serialization and missing image data
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Restore Date objects from ISO strings
          if (state.project?.createdAt) {
            state.project.createdAt = new Date(state.project.createdAt);
          }
          if (state.project?.analysis?.date) {
            state.project.analysis.date = new Date(state.project.analysis.date);
          }
          if (state.lastSavedAt) {
            state.lastSavedAt = new Date(state.lastSavedAt);
          }
          // Restore current time to now, not saved time
          state.currentTime = new Date();

          // Handle missing image data (excluded from persistence to avoid quota errors)
          // If there's saved image metadata but no dataUrl, clear the image and reset step
          if (state.project?.image && !state.project.image.dataUrl) {
            state.project.image = null;
            // Reset to upload step if we were past upload but lost the image
            if (state.currentStep !== 'upload' && state.currentStep !== 'results') {
              state.currentStep = 'upload';
            }
          }
        }
      },
      // Migration for future versions
      migrate: (persistedState, version) => {
        if (version === 0) {
          // Migration from v0 to v1 if needed
          return persistedState as ProjectState;
        }
        return persistedState as ProjectState;
      },
    }
  )
);
