/**
 * Scene Configuration - Centralized scaling and geometry constants for 3D viewer
 *
 * All 3D model geometric scaling values are defined here for easy adjustment.
 * Modify these values to change the appearance of the 3D scene.
 *
 * AUTOMATIC SCALING SYSTEM:
 * The scene automatically scales based on the tallest building height to maintain
 * realistic proportions. All measurements use real-world metrics:
 *
 * - Standard floor height: 3.0 meters (industry standard for planning)
 * - Sun orbit clearance: 10 floors (30m) above tallest building
 * - Ground plane: Scales to provide adequate context for all buildings
 * - Grid: Dynamic spacing based on scene size for readable measurements
 */

// =============================================================================
// REAL-WORLD METRICS (Reference Constants)
// =============================================================================
export const REAL_WORLD_METRICS = {
  /**
   * Standard floor heights by building type (meters)
   * Source: International Building Code, typical construction standards
   */
  floorHeights: {
    residential: 8.0, // Typical apartment/condo
    commercial: 8.5, // Office buildings
    retail: 9.0, // Ground floor retail
    industrial: 10.0, // Warehouse/factory
    default: 10.0, // Planning standard
  },

  /**
   * Typical building heights by category
   * Used for reference when estimating unknown buildings
   */
  typicalBuildings: {
    lowRise: { maxFloors: 3, maxHeight: 9 }, // 1-3 stories
    midRise: { maxFloors: 10, maxHeight: 30 }, // 4-10 stories
    highRise: { maxFloors: 30, maxHeight: 90 }, // 11-30 stories
    skyscraper: { maxFloors: 50, maxHeight: 150 }, // 30+ stories
  },

  /**
   * Sun path visualization standards
   * Based on architectural sun study best practices
   */
  sunStudy: {
    /** Sky dome typically 1.5-3x site diagonal for clear visualization */
    domeToSiteRatio: 1.5,
    /** Minimum clearance above buildings for unobstructed sun paths */
    minClearanceFloors: 10,
    /** At "infinite" distance, but 5-10x building height works visually */
    heightToOrbitRatio: 10,
  },
};

// =============================================================================
// AUTOMATIC SCALING CONFIGURATION
// =============================================================================
/**
 * Auto-scaling formulas based on tallest building height
 *
 * These multipliers create realistic proportions where:
 * - Small buildings (1-3 floors): Intimate neighborhood scale
 * - Medium buildings (4-10 floors): Urban block scale
 * - Tall buildings (10+ floors): District/city scale
 */
export const AUTO_SCALE_CONFIG = {
  /**
   * Sun Orbit Scaling - BUILDING HEIGHT + 10 FLOORS CLEARANCE
   *
   * The sun orbit radius is calculated to position the sun paths at a height
   * equal to the tallest building PLUS 10 additional floors of clearance.
   *
   * Formula: sunOrbitRadius = max(
   *   maxBuildingHeight + (clearanceFloors × floorHeight),
   *   siteSize × siteMultiplier,
   *   minRadius
   * )
   *
   * Examples (with 3m floor height):
   * - 15-floor building (45m) → sun at 25 floors → orbit radius = 75m
   * - 20-floor building (60m) → sun at 30 floors → orbit radius = 90m
   * - 30-floor building (90m) → sun at 40 floors → orbit radius = 120m
   * - 50-floor building (150m) → sun at 60 floors → orbit radius = 180m
   *
   * This ensures the sun paths are always visibly above the tallest building
   * with consistent 10-floor clearance regardless of building height.
   */
  sunOrbit: {
    /**
     * Number of floors clearance above tallest building
     * Sun height = building floors + clearanceFloors
     * Example: 15-floor building → sun at 15 + 10 = 25 floors
     */
    clearanceFloors: 10,
    /** Minimum orbit radius for visual quality (meters) */
    minRadius: 60,
    /**
     * Site coverage multiplier (soft minimum, NOT a scaling factor)
     * Only used to ensure orbit covers site when buildings are very small
     * Building height is the PRIMARY factor for orbit radius
     */
    siteMultiplier: 8.3,
    /** Maximum orbit radius to prevent excessive scale */
    maxRadius: 100000,
  },

  /**
   * Ground Plane Scaling
   * Provides sufficient context area around buildings
   */
  ground: {
    /** Minimum ground size for small scenes (meters) */
    minSize: 500,
    /** Ground extends 3× site footprint for context */
    siteMultiplier: 8.0,
    /** Ground extends 20× building height for shadow context */
    heightMultiplier: 20,
    /** Maximum ground size to prevent performance issues */
    maxSize: 200000,
  },

  /**
   * Grid Scaling
   * Provides readable measurement reference
   */
  grid: {
    /** Minimum grid size (meters) */
    minSize: 300,
    /** Grid extends 2.5× site footprint */
    siteMultiplier: 2.5,
    /** Grid extends 15× building height */
    heightMultiplier: 15,
    /** Maximum grid size */
    maxSize: 200000,
    /**
     * Dynamic grid division spacing based on scene size
     * Smaller scenes = finer grid, larger scenes = coarser grid
     */
    divisionSpacing: [
      { maxSceneSize: 100, divisionSize: 5 }, // 5m grid for small sites
      { maxSceneSize: 300, divisionSize: 10 }, // 10m grid for medium sites
      { maxSceneSize: 500, divisionSize: 20 }, // 20m grid for large sites
      { maxSceneSize: 1000, divisionSize: 25 }, // 25m grid for very large sites
      { maxSceneSize: Infinity, divisionSize: 50 }, // 50m grid for huge sites
    ],
  },

  /**
   * Camera Distance Scaling
   * Ensures all buildings are visible with comfortable margin
   */
  camera: {
    /** Camera distance = max(siteSize × siteMultiplier, maxHeight × heightMultiplier) */
    siteMultiplier: 2.0,
    /** Camera should be at least 3× tallest building height away */
    heightMultiplier: 3.0,
    /** Initial camera height relative to tallest building */
    initialHeightMultiplier: 2.5,
    /** Minimum camera distance */
    minDistance: 50,
    /** Maximum camera distance */
    maxDistance: 200000,
  },

  /**
   * Shadow Map Scaling
   * Ensures shadows are captured for all buildings
   */
  shadow: {
    /** Minimum shadow capture area (meters) */
    minSize: 1000,
    /** Shadow area = siteSize × siteMultiplier */
    siteMultiplier: 2.5,
    /** Height margin for tall building shadows */
    heightMarginMultiplier: 2.0,
    /** Minimum height margin */
    minHeightMargin: 200,
  },
};

// =============================================================================
// HELPER FUNCTIONS FOR AUTOMATIC SCALING
// =============================================================================

/**
 * Calculate the optimal sun orbit radius based on building height
 *
 * FORMULA: Sun height = Building height + 10 floors clearance
 *
 * PRIORITY: Building height is the PRIMARY factor. Site size only provides
 * a minimum floor to ensure the orbit covers the site footprint, but does
 * NOT scale up the orbit beyond what building height requires.
 *
 * @param siteSize - The diagonal or maximum dimension of the site (meters)
 * @param maxBuildingHeight - Height of the tallest building (meters)
 * @returns Optimal sun orbit radius in meters
 *
 * Examples (with 8m floor height, 10-floor clearance = 80m):
 * - 15-floor building (120m) → sun orbit = 120m + 80m = 200m (25 floors)
 * - 20-floor building (160m) → sun orbit = 160m + 80m = 240m (30 floors)
 * - 50-floor building (400m) → sun orbit = 400m + 80m = 480m (60 floors)
 *
 * The orbit radius equals the max sun height because at solar noon
 * (altitude ~90°), sunHeight = orbitRadius × sin(90°) = orbitRadius
 */
export function calculateSunOrbitRadius(
  siteSize: number,
  maxBuildingHeight: number,
  scaledFloorHeight: number = 10.0, // Visual floor height (default 10m if not provided)
): number {
  const { sunOrbit } = AUTO_SCALE_CONFIG;

  // Calculate clearance in meters (10 floors × scaledFloorHeight)
  // scaledFloorHeight should be the actual visual floor height (building.floorHeight × heightScale)
  // Example: 3m base floor × 1.5 scale = 4.5m visual floor height
  // Clearance = 10 × 4.5m = 45m (10 floors visually)
  const clearanceMeters = sunOrbit.clearanceFloors * scaledFloorHeight;

  // PRIMARY: Sun orbit radius = (building height + 10-floor clearance) × 2
  // Doubled for better visual separation from buildings
  // Example: 15-floor building (120m) + 10 floors (80m) = 200m × 2 = 400m
  const fromHeight = (maxBuildingHeight + clearanceMeters) * 2;

  // SECONDARY: Ensure orbit is proportional to site size when scale changes
  // This prevents tiny orbits on large sites (when site.scale increases)
  // 30% of site size keeps orbit balanced without being too large
  const minSiteOrbit = siteSize * 0.3;

  // Use the larger of: height-based orbit, site-proportional orbit, or minimum
  const calculated = Math.max(fromHeight, minSiteOrbit, sunOrbit.minRadius);

  // Clamp to max radius
  return Math.min(calculated, sunOrbit.maxRadius);
}

/**
 * Calculate optimal ground plane size
 *
 * @param siteSize - Site footprint size (meters)
 * @param maxBuildingHeight - Tallest building height (meters)
 * @returns Ground plane size in meters
 */
export function calculateGroundSize(
  siteSize: number,
  maxBuildingHeight: number,
): number {
  const { ground } = AUTO_SCALE_CONFIG;

  const fromSite = siteSize * ground.siteMultiplier;
  const fromHeight = maxBuildingHeight * ground.heightMultiplier;

  return Math.min(
    Math.max(Math.max(fromSite, fromHeight), ground.minSize),
    ground.maxSize,
  );
}

/**
 * Calculate optimal grid size and division count
 *
 * @param siteSize - Site footprint size (meters)
 * @param maxBuildingHeight - Tallest building height (meters)
 * @returns { size: number, divisions: number, divisionSize: number }
 */
export function calculateGridDimensions(
  siteSize: number,
  maxBuildingHeight: number,
): { size: number; divisions: number; divisionSize: number } {
  const { grid } = AUTO_SCALE_CONFIG;

  // Calculate grid size
  const fromSite = siteSize * grid.siteMultiplier;
  const fromHeight = maxBuildingHeight * grid.heightMultiplier;
  const size = Math.min(
    Math.max(Math.max(fromSite, fromHeight), grid.minSize),
    grid.maxSize,
  );

  // Determine division size based on scene scale
  let divisionSize = 50; // Default for large scenes
  for (const tier of grid.divisionSpacing) {
    if (siteSize <= tier.maxSceneSize) {
      divisionSize = tier.divisionSize;
      break;
    }
  }

  // Calculate number of divisions
  const divisions = Math.round(size / divisionSize);

  return { size, divisions, divisionSize };
}

/**
 * Calculate optimal camera positioning
 *
 * @param siteSize - Site footprint size (meters)
 * @param maxBuildingHeight - Tallest building height (meters)
 * @returns { distance: number, height: number }
 */
export function calculateCameraPosition(
  siteSize: number,
  maxBuildingHeight: number,
): { distance: number; height: number } {
  const { camera } = AUTO_SCALE_CONFIG;

  const fromSite = siteSize * camera.siteMultiplier;
  const fromHeight = maxBuildingHeight * camera.heightMultiplier;

  const distance = Math.min(
    Math.max(Math.max(fromSite, fromHeight), camera.minDistance),
    camera.maxDistance,
  );

  const height = maxBuildingHeight * camera.initialHeightMultiplier;

  return { distance, height };
}

/**
 * Calculate shadow map dimensions
 *
 * @param siteSize - Site footprint size (meters)
 * @param maxBuildingHeight - Tallest building height (meters)
 * @returns { size: number, heightMargin: number }
 */
export function calculateShadowDimensions(
  siteSize: number,
  maxBuildingHeight: number,
): { size: number; heightMargin: number } {
  const { shadow } = AUTO_SCALE_CONFIG;

  const size = Math.max(siteSize * shadow.siteMultiplier, shadow.minSize);
  const heightMargin = Math.max(
    maxBuildingHeight * shadow.heightMarginMultiplier,
    shadow.minHeightMargin,
  );

  return { size, heightMargin };
}

/**
 * Get all auto-scaled scene dimensions from building data
 *
 * @param siteSize - Site footprint size (meters)
 * @param maxBuildingHeight - Tallest building height (meters)
 * @returns Complete set of scaled dimensions for the scene
 */
export function getAutoScaledDimensions(
  siteSize: number,
  maxBuildingHeight: number,
): {
  sunOrbitRadius: number;
  groundSize: number;
  grid: { size: number; divisions: number; divisionSize: number };
  camera: { distance: number; height: number };
  shadow: { size: number; heightMargin: number };
  referenceHeight: number;
  floorCount: number;
} {
  // Ensure minimum values for empty scenes
  const effectiveSiteSize = Math.max(siteSize, 100);
  const effectiveHeight = Math.max(
    maxBuildingHeight,
    REAL_WORLD_METRICS.floorHeights.default * 3,
  ); // Min 3 floors

  return {
    sunOrbitRadius: calculateSunOrbitRadius(effectiveSiteSize, effectiveHeight),
    groundSize: calculateGroundSize(effectiveSiteSize, effectiveHeight),
    grid: calculateGridDimensions(effectiveSiteSize, effectiveHeight),
    camera: calculateCameraPosition(effectiveSiteSize, effectiveHeight),
    shadow: calculateShadowDimensions(effectiveSiteSize, effectiveHeight),
    referenceHeight: effectiveHeight,
    floorCount: Math.ceil(
      effectiveHeight / REAL_WORLD_METRICS.floorHeights.default,
    ),
  };
}

// =============================================================================
// STORE DEFAULTS
// =============================================================================
export const STORE_DEFAULTS = {
  /** Meters per pixel - site plan scale */
  siteScale: 1,
  /** Site scale limits (meters per pixel) */
  siteScaleLimits: {
    min: 0.1, // Minimum: 10cm per pixel (detailed close-up)
    max: 10, // Maximum: 10m per pixel (city-scale overview)
  },
  /** Building height multiplier for visual impact */
  buildingHeightScale: 8.5,
  /** Building height scale limits */
  buildingHeightScaleLimits: {
    min: 1, // Minimum: actual height
    max: 5, // Maximum: 5× visual exaggeration
  },
  /** Shadow darkness (0.3-1.0) */
  shadowIntensity: 0.7,
  /** Floor transparency (0-1) */
  floorTransparency: 1,
  /** Heatmap overlay opacity */
  heatmapOpacity: 0.5,
  /** Default shadow visualization mode */
  shadowVisualizationMode: "natural" as const,
  /** Default location settings */
  defaultLocation: {
    latitude: 17.385,
    longitude: 78.4867,
    timezone: "Asia/Kolkata",
    city: "Hyderabad",
  },
  /** Default north angle (degrees) */
  northAngle: 0,
  /** Default analysis time range */
  analysisTimeRange: { start: 6, end: 20 },
  /** Default scenario settings */
  defaultScenario: {
    window: { state: "closed" as const, ventilationFactor: 0 },
    glazing: { type: "double" as const, solarTransmittance: 0.76 },
    shading: {
      interior: "none" as const,
      exterior: "none" as const,
      reductionFactor: 1,
    },
  },
};

// =============================================================================
// GROUND & GRID
// =============================================================================
export const GROUND_CONFIG = {
  /**
   * Base ground plane size (PlaneGeometry)
   * Note: Use calculateGroundSize() for dynamic scaling based on buildings
   */
  basePlaneSize: 10000,
  /** Minimum ground size (meters) - from AUTO_SCALE_CONFIG.ground.minSize */
  minGroundSize: AUTO_SCALE_CONFIG.ground.minSize,
  /** Ground size multiplier relative to site size */
  groundSizeMultiplier: AUTO_SCALE_CONFIG.ground.siteMultiplier,
  /** Ground size multiplier relative to max building height */
  groundHeightMultiplier: AUTO_SCALE_CONFIG.ground.heightMultiplier,
  /** Ground plane Y position */
  groundY: 0,
  /**
   * Ground color - warm beige/tan for architectural visualization
   * Visible enough to show shadows clearly, subtle enough not to overpower buildings
   * Previous: 0xf5f5f5 (almost white)
   */
  groundColor: 0xe0d8cc,
};

export const GRID_CONFIG = {
  /**
   * Base grid size
   * Note: Use calculateGridDimensions() for dynamic scaling based on buildings
   */
  baseGridSize: 5000,
  /** Base grid divisions */
  baseGridDivisions: 200,
  /** Minimum grid size (meters) */
  minGridSize: AUTO_SCALE_CONFIG.grid.minSize,
  /** Grid size multiplier relative to site size */
  gridSizeMultiplier: AUTO_SCALE_CONFIG.grid.siteMultiplier,
  /** Grid size multiplier relative to max building height */
  gridHeightMultiplier: AUTO_SCALE_CONFIG.grid.heightMultiplier,
  /** Grid Y position (slightly above ground) */
  gridY: 0.1,
  /**
   * Main grid line color - medium gray for visibility against beige ground
   * Darker than before to contrast with new ground color
   */
  gridColor: 0x9a9a9a,
  /**
   * Sub grid line color - lighter gray for secondary lines
   * Still visible but less prominent than main grid
   */
  subGridColor: 0xbcbcbc,
  /**
   * Division spacing thresholds (meters)
   * Maps scene size to appropriate grid division size for readability
   */
  divisionSpacing: AUTO_SCALE_CONFIG.grid.divisionSpacing,
};

// =============================================================================
// CAMERA & VIEW
// =============================================================================
export const CAMERA_CONFIG = {
  /** Field of view in degrees */
  fov: 50,
  /** Near clipping plane */
  near: 0.1,
  /** Far clipping plane - increased for large-scale scenes */
  far: 500000,
  /** Scene bounds size multiplier */
  sceneBoundsMultiplier: 1.5,
  /** Minimum scene size */
  minSceneSize: 100,
  /**
   * Camera distance multiplier relative to scene size
   * Note: Use calculateCameraPosition() for height-based scaling
   */
  cameraDistanceMultiplier: AUTO_SCALE_CONFIG.camera.siteMultiplier,
  /** Camera height multiplier relative to scene size */
  cameraHeightMultiplier: 0.8,
  /**
   * Camera height multiplier relative to max building height
   * Ensures camera is positioned high enough to see all buildings
   */
  cameraHeightFromBuildingMultiplier: AUTO_SCALE_CONFIG.camera.heightMultiplier,
  /** Initial camera height relative to tallest building */
  cameraInitialHeightMultiplier:
    AUTO_SCALE_CONFIG.camera.initialHeightMultiplier,
  /** Minimum camera distance */
  minCameraDistance: AUTO_SCALE_CONFIG.camera.minDistance,
  /** Maximum camera distance */
  maxCameraDistance: AUTO_SCALE_CONFIG.camera.maxDistance,
  /** Maximum polar angle (prevents underground view) */
  maxPolarAngle: Math.PI / 2 - 0.05,
  /** Damping factor for smooth camera movement */
  dampingFactor: 0.08,
};

// =============================================================================
// SUN ORBIT PATHS
// =============================================================================
/**
 * Sun Orbit Configuration
 *
 * CORE FORMULA: Sun height = Building height + 10 floors
 *
 * The sun orbit radius is calculated so that sun paths appear at a height
 * equal to the tallest building PLUS 10 floors of clearance.
 *
 * Formula: orbitRadius = maxBuildingHeight + (10 floors × 3m) = maxBuildingHeight + 30m
 *
 * Examples (with 3m floor height):
 * ┌─────────────────┬────────────────┬───────────────┬─────────────────┐
 * │ Building Floors │ Building Height│ Sun Height    │ Orbit Radius    │
 * ├─────────────────┼────────────────┼───────────────┼─────────────────┤
 * │ 10 floors       │ 30m            │ 20 floors     │ 60m             │
 * │ 15 floors       │ 45m            │ 25 floors     │ 75m             │
 * │ 20 floors       │ 60m            │ 30 floors     │ 90m             │
 * │ 30 floors       │ 90m            │ 40 floors     │ 120m            │
 * │ 50 floors       │ 150m           │ 60 floors     │ 180m            │
 * └─────────────────┴────────────────┴───────────────┴─────────────────┘
 *
 * Use calculateSunOrbitRadius() for dynamic calculation based on actual buildings.
 */
export const SUN_ORBIT_CONFIG = {
  /**
   * Site coverage multiplier (soft minimum only)
   * Building height is the PRIMARY factor for orbit radius
   * This only ensures minimum coverage when buildings are very small
   */
  arcRadiusMultiplier: AUTO_SCALE_CONFIG.sunOrbit.siteMultiplier,
  /**
   * Number of floors clearance above tallest building
   * Sun orbit height = building height + (clearanceFloors × 3m)
   */
  clearanceFloors: AUTO_SCALE_CONFIG.sunOrbit.clearanceFloors,
  /**
   * Minimum arc radius for any scene (meters)
   * Ensures usable visualization even for small buildings
   */
  minArcRadius: AUTO_SCALE_CONFIG.sunOrbit.minRadius,
  /**
   * Maximum arc radius (meters)
   * Prevents excessively large orbits that may affect performance
   */
  maxArcRadius: AUTO_SCALE_CONFIG.sunOrbit.maxRadius,
  /**
   * Z-axis elliptical compression (makes orbit elliptical)
   * 0.5 creates a realistic perspective view of the sky dome
   */
  ellipseCompression: 0.5,
  /**
   * Sun sphere size relative to arc radius
   * Keeps sun visually proportional regardless of orbit size
   */
  sunSizeMultiplier: 0.05,
  /** Sun glow size relative to sun size */
  sunGlowMultiplier: 1.4,
  /** Sun ray length relative to sun size */
  sunRayLengthMultiplier: 2,
  /** Number of sun rays */
  sunRayCount: 8,
  /** Number of samples for arc smoothness */
  arcSamples: 48,
  /** Arc line opacity */
  arcOpacity: 0.8,
  /** Horizon ellipse segments */
  horizonSegments: 64,
  /** Season colors */
  seasonColors: {
    summer: 0xff6600,
    springAutumn: 0x66cc66,
    winter: 0x3399ff,
    currentDay: 0xffcc00,
  },
  /** Current day path dash settings */
  currentDayDash: {
    dashSize: 3,
    gapSize: 2,
  },
};

// =============================================================================
// SHADOWS
// =============================================================================
/**
 * Shadow Configuration
 *
 * Shadow map size and coverage scales with building heights to ensure:
 * - All building shadows are captured
 * - Shadow quality is maintained regardless of scene size
 * - Long shadows from tall buildings are fully rendered
 *
 * Use calculateShadowDimensions() for dynamic calculation.
 */
export const SHADOW_CONFIG = {
  /** Shadow map resolution (pixels) - higher = better quality but more VRAM */
  mapSize: 4096,
  /** Low quality shadow map size for performance mode */
  lowQualityMapSize: 1024,
  /**
   * Shadow size multiplier relative to scene size
   * Ensures shadow coverage extends beyond building footprints
   */
  shadowSizeMultiplier: AUTO_SCALE_CONFIG.shadow.siteMultiplier,
  /** Minimum shadow capture area (meters) */
  minShadowSize: AUTO_SCALE_CONFIG.shadow.minSize,
  /**
   * Height margin multiplier for tall buildings
   * Ensures shadows from tall buildings are fully captured
   */
  heightMarginMultiplier: AUTO_SCALE_CONFIG.shadow.heightMarginMultiplier,
  /** Minimum height margin (meters) */
  minHeightMargin: AUTO_SCALE_CONFIG.shadow.minHeightMargin,
  /** Shadow camera far multiplier (relative to shadow size) */
  shadowFarMultiplier: 6,
  /** Shadow camera far multiplier (relative to height margin) */
  heightFarMultiplier: 10,
  /** Shadow radius for soft shadows */
  shadowRadius: 1.5,
  /** Sharp shadow radius */
  sharpShadowRadius: 0.5,
  /** Medium shadow radius */
  mediumShadowRadius: 1.0,
};

// =============================================================================
// SUN RAY DIRECTION INDICATOR
// =============================================================================
export const SUN_RAY_CONFIG = {
  /** Ray length as percentage of distance to ground */
  rayLengthPercent: 0.8,
  /** Ray start offset percent */
  rayStartOffsetPercent: 0.1,
  /** Arrow size multiplier relative to ray length */
  arrowSizeMultiplier: 0.02,
  /** Minimum arrow size */
  minArrowSize: 5,
  /** Ray dash settings */
  dash: {
    dashSize: 10,
    gapSize: 5,
  },
  /** Ray line color */
  rayColor: 0xffaa00,
  /** Ray opacity */
  rayOpacity: 0.6,
};

// =============================================================================
// SCALE BAR
// =============================================================================
export const SCALE_BAR_CONFIG = {
  /** Target length as percentage of scene size */
  targetLengthPercent: 0.25,
  /** Possible scale bar lengths in meters */
  possibleLengths: [10, 20, 25, 50, 100, 200, 250, 500, 1000],
  /** X position offset multiplier */
  positionXMultiplier: 0.2,
  /** Z position offset multiplier */
  positionZMultiplier: 0.45,
  /** Bar height/thickness */
  barHeight: 2,
  /** Bar depth */
  barDepth: 3,
  /** Cap width */
  capWidth: 2,
  /** Cap height multiplier relative to bar height */
  capHeightMultiplier: 3,
  /** Label scale multiplier (width) */
  labelScaleWidth: 0.3,
  /** Label scale multiplier (height) */
  labelScaleHeight: 0.15,
  /** Zero label scale multiplier */
  zeroLabelScale: 0.1,
  /** Label Y position multiplier relative to bar height */
  labelYMultiplier: 4,
};

// =============================================================================
// NORTH ARROW
// =============================================================================
export const NORTH_ARROW_CONFIG = {
  /** Arrow size multiplier relative to scene size */
  arrowSizeMultiplier: 0.15,
  /** Minimum arrow size */
  minArrowSize: 30,
  /** Position offset multiplier (negative = west/north side) */
  positionOffsetMultiplier: -0.45,
  /** Base scale normalization factor */
  baseScaleNormalization: 20,
  /** Arrow length */
  arrowLength: 15,
  /** Arrow radius */
  arrowRadius: 1,
  /** Cone radius multiplier */
  coneRadiusMultiplier: 1.5,
  /** Cone height multiplier */
  coneHeightMultiplier: 4,
  /** Y position above ground */
  yPosition: 3,
};

// =============================================================================
// CARDINAL DIRECTIONS (N/S/E/W)
// =============================================================================
export const CARDINAL_DIRECTIONS_CONFIG = {
  /** Offset from center as multiplier of scene size */
  offsetMultiplier: 0.85,
  /** Label size multiplier relative to scene size */
  labelSizeMultiplier: 0.06,
  /** Minimum label size */
  minLabelSize: 18,
  /** Compass arrow size multiplier */
  compassSizeMultiplier: 0.04,
  /** Direction label Y position */
  labelYPosition: 2.5,
  /** Direction colors */
  colors: {
    north: 0xcc3333,
    south: 0x888888,
    east: 0x888888,
    west: 0x888888,
  },
  /** North indicator offset multipliers for N/S/E/W */
  directionOffsets: {
    north: { x: 0, zMultiplier: -0.55 },
    south: { x: 0, zMultiplier: 0.55 },
    east: { xMultiplier: 1.1, z: 0 },
    west: { xMultiplier: -1.1, z: 0 },
  },
};

// =============================================================================
// BUILDING MESH
// =============================================================================
/**
 * Building Configuration
 *
 * Uses real-world metrics for accurate building representation:
 * - Standard floor height: 3.0 meters (international planning standard)
 * - Residential buildings: typically 2.8-3.0m per floor
 * - Commercial buildings: typically 3.5-4.0m per floor
 * - Industrial buildings: typically 4.0-5.0m per floor
 *
 * Building height = floors × floorHeight
 * Example: 10-story building = 10 × 3.0m = 30m total height
 */
export const BUILDING_CONFIG = {
  /**
   * Default floor height in meters
   * 3.0m is the international standard for planning calculations
   * Matches REAL_WORLD_METRICS.floorHeights.default
   */
  defaultFloorHeight: REAL_WORLD_METRICS.floorHeights.default,
  /**
   * Floor heights by building type (for future use)
   * Allows more accurate height calculations based on building purpose
   */
  floorHeightsByType: REAL_WORLD_METRICS.floorHeights,
  /**
   * Reference building categories
   * Used for classification and default assumptions
   */
  buildingCategories: REAL_WORLD_METRICS.typicalBuildings,
  /** Floor line gap for visual separation */
  floorLineGap: 0.1,
  /** Roof offset above building top */
  roofOffset: 0.1,
  /** Floor label X offset */
  floorLabelXOffset: 8,
  /** Floor label sprite scale (tripled for better visibility) */
  floorLabelScale: { width: 22.5, height: 22.5 },
  /** Building name label Y offset above building */
  nameLabelYOffset: 5,
  /** Building name label base scale */
  nameLabelBaseScale: 12,
  /** Building colors palette */
  colors: [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#84CC16",
    "#F97316",
    "#6366F1",
  ],
};

// =============================================================================
// HEATMAP
// =============================================================================
export const HEATMAP_CONFIG = {
  /** Heatmap plane base size */
  baseSize: 500,
  /** Heatmap grid resolution */
  gridResolution: 32,
  /** Heatmap Y position (slightly above ground) */
  yPosition: 0.2,
  /** Shadow color (dark) */
  shadowColor: { r: 0, g: 0, b: 100 },
  /** Sunlit color (bright) */
  sunlitColor: { r: 255, g: 255, b: 200 },
};

// =============================================================================
// LIGHTING
// =============================================================================
export const LIGHTING_CONFIG = {
  /** Ambient light intensity */
  ambientIntensity: 0.25,
  /** Sun light base intensity */
  sunLightBaseIntensity: 0.6,
  /** Sun light max additional intensity based on altitude */
  sunLightAltitudeBonus: 0.6,
  /** Hemisphere light sky color */
  hemisphereSkyColor: 0xb4d4e8,
  /** Hemisphere light ground color */
  hemisphereGroundColor: 0xe8e0d4,
  /** Hemisphere light intensity */
  hemisphereIntensity: 0.35,
  /** Background sky color */
  backgroundColor: 0xe8f4fc,
};

// =============================================================================
// LABELS & SPRITES
// =============================================================================
export const LABEL_CONFIG = {
  /** Season label sprite scale */
  seasonLabel: { width: 18, height: 6 },
  /** Direction label sprite scale */
  directionLabel: { width: 15, height: 15 },
  /** Time label sprite scale */
  timeLabel: { width: 10, height: 3 },
  /** Surface label sprite scale */
  surfaceLabel: { width: 20, height: 8 },
  /** Sun icon sprite scale */
  sunIcon: { width: 8, height: 8 },
  /** Label canvas sizes */
  canvasSizes: {
    seasonLabel: { width: 120, height: 40 },
    directionLabel: { width: 128, height: 128 },
    timeLabel: { width: 100, height: 30 },
    buildingName: { width: 256, height: 64 },
  },
};

// =============================================================================
// ANIMATION & PERFORMANCE
// =============================================================================
export const PERFORMANCE_CONFIG = {
  /** Target frame rate */
  targetFPS: 60,
  /** LOD distance thresholds */
  lodDistances: {
    high: 100,
    medium: 300,
    low: 500,
  },
  /** Maximum buildings before performance optimization */
  maxBuildingsBeforeOptimization: 50,
};

// =============================================================================
// EXPORT ALL CONFIGS
// =============================================================================
export const SCENE_CONFIG = {
  store: STORE_DEFAULTS,
  ground: GROUND_CONFIG,
  grid: GRID_CONFIG,
  camera: CAMERA_CONFIG,
  sunOrbit: SUN_ORBIT_CONFIG,
  shadow: SHADOW_CONFIG,
  sunRay: SUN_RAY_CONFIG,
  scaleBar: SCALE_BAR_CONFIG,
  northArrow: NORTH_ARROW_CONFIG,
  cardinalDirections: CARDINAL_DIRECTIONS_CONFIG,
  building: BUILDING_CONFIG,
  heatmap: HEATMAP_CONFIG,
  lighting: LIGHTING_CONFIG,
  label: LABEL_CONFIG,
  performance: PERFORMANCE_CONFIG,
  // Auto-scaling system
  autoScale: AUTO_SCALE_CONFIG,
  realWorldMetrics: REAL_WORLD_METRICS,
};

export default SCENE_CONFIG;

// =============================================================================
// SCALING SYSTEM DOCUMENTATION
// =============================================================================
/**
 * # AUTO-SCALING SYSTEM FOR REALISTIC 3D VISUALIZATION
 *
 * This module provides automatic scaling based on building heights to create
 * realistic 3D visualizations that maintain proper proportions regardless of
 * the site or building scale.
 *
 * ## Core Principle
 *
 * All scene dimensions are calculated relative to the TALLEST BUILDING in the
 * scene. This ensures that:
 * - Sun paths are always visually clear of buildings
 * - Shadows are fully captured
 * - Camera positions provide proper context
 * - Grid spacing is readable at any scale
 *
 * ## Key Formula: Sun Orbit Radius
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │  SUN HEIGHT = BUILDING HEIGHT + 10 FLOORS                             │
 * │                                                                        │
 * │  orbitRadius = maxBuildingHeight + (10 floors × 3m/floor)             │
 * │              = maxBuildingHeight + 30m                                 │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ### Examples (with 3m floor height):
 *
 * | Building Floors | Building Height | Sun Height | Orbit Radius |
 * |-----------------|-----------------|------------|--------------|
 * | 10 floors       | 30m             | 20 floors  | 60m          |
 * | 15 floors       | 45m             | 25 floors  | 75m          |
 * | 20 floors       | 60m             | 30 floors  | 90m          |
 * | 30 floors       | 90m             | 40 floors  | 120m         |
 * | 50 floors       | 150m            | 60 floors  | 180m         |
 *
 * The 10-floor clearance ensures sun paths are always visibly above
 * the tallest building, regardless of building height.
 *
 * ## How to Use
 *
 * ### Simple Usage (Recommended):
 * ```typescript
 * import { getAutoScaledDimensions } from './sceneConfig';
 *
 * const dimensions = getAutoScaledDimensions(siteSize, maxBuildingHeight);
 * // Returns: { sunOrbitRadius, groundSize, grid, camera, shadow, ... }
 * ```
 *
 * ### Individual Calculations:
 * ```typescript
 * import {
 *   calculateSunOrbitRadius,
 *   calculateGroundSize,
 *   calculateGridDimensions,
 *   calculateCameraPosition,
 *   calculateShadowDimensions,
 * } from './sceneConfig';
 *
 * // For 15-floor building (45m): returns 75m (25 floors)
 * const orbitRadius = calculateSunOrbitRadius(siteSize, 45);
 * ```
 *
 * ## Real-World Metrics Reference
 *
 * ### Floor Heights (meters):
 * - Residential: 3.0m (standard planning value)
 * - Commercial: 3.5m
 * - Retail (ground floor): 4.0m
 * - Industrial: 5.0m
 *
 * ### Building Categories:
 * - Low-rise: 1-3 floors (up to 9m)
 * - Mid-rise: 4-10 floors (12-30m)
 * - High-rise: 11-30 floors (33-90m)
 * - Skyscraper: 30+ floors (90m+)
 *
 * ### Sun Study Best Practices:
 * - Sun height = Building height + 10 floors (30m clearance)
 * - This ensures sun paths are always visible above buildings
 * - The 3D scene automatically adjusts when building heights change
 *
 * ## Configuration Adjustments
 *
 * The clearance can be adjusted in AUTO_SCALE_CONFIG:
 *
 * ```typescript
 * AUTO_SCALE_CONFIG.sunOrbit.clearanceFloors = 10; // 10 floors above building
 * AUTO_SCALE_CONFIG.sunOrbit.siteMultiplier = 1.2; // 1.2× site size minimum
 * AUTO_SCALE_CONFIG.sunOrbit.minRadius = 200;        // 200m minimum
 * ```
 */
