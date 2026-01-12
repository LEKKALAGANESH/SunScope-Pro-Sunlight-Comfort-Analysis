# SunScope Pro - Comprehensive Re-evaluation & Implementation Plan

**Document Version:** 1.0
**Date:** January 2026
**Status:** Production Roadmap

---

## Executive Summary

**Project:** SunScope Pro - Open-Access Site Sunlight, Heat & Comfort Analysis Web Tool
**Current Status:** ~60% complete, functional MVP with significant gaps
**Goal:** Production-ready release serving all user personas
**Timeline:** 5-6 weeks comprehensive implementation
**Focus Areas:** Accuracy + User Experience + Accessibility (all areas)

### Key Findings

| Area | Current State | Gap Severity |
|------|---------------|--------------|
| Core Workflow | Functional | Low |
| Shadow Accuracy | 30-50% error | **Critical** |
| Scenario Integration | UI exists, not connected | **Critical** |
| Error Handling | Almost none | **Critical** |
| Accessibility (WCAG) | Multiple failures | **High** |
| Input Validation | Missing | High |
| Performance | Acceptable | Medium |
| Mobile Support | Untested | Medium |

---

## Part 1: Target User Analysis

### 1.1 Primary User Personas

#### Persona 1: Home Buyer "Priya" (40% of users)
- **Demographics:** 28-45 years, urban professional, first-time/upgrade buyer
- **Goals:** Evaluate natural light in potential apartments before purchase
- **Tech Level:** Basic - comfortable with web apps, not technical
- **Constraints:** Limited time (5-10 min sessions), mobile-first usage, needs simple language
- **Pain Points:**
  - Can't visualize how sunlight changes through the day
  - Doesn't understand technical terms (irradiance, azimuth)
  - Needs actionable advice, not data
- **Success Criteria:** "Will this apartment get morning sun for my plants?"

#### Persona 2: Early-Stage Architect "Raj" (25% of users)
- **Demographics:** 25-40 years, architecture practice, massing/feasibility studies
- **Goals:** Quick shadow studies for client presentations, no CAD setup needed
- **Tech Level:** Advanced - comfortable with 3D tools, understands sun angles
- **Constraints:** Speed matters, needs exportable deliverables, accuracy expectations higher
- **Pain Points:**
  - Professional tools (Revit, Rhino) take too long for quick studies
  - Clients want visual proof of sunlight claims
  - Needs floor-by-floor analysis
- **Success Criteria:** "Generate shadow study in under 10 minutes for client meeting"

#### Persona 3: Real Estate Developer "Meera" (20% of users)
- **Demographics:** 35-55 years, property development/sales
- **Goals:** Marketing collateral showing sunlight benefits, comparison scenarios
- **Tech Level:** Low - delegates technical work, needs polished outputs
- **Constraints:** Needs professional-looking exports, clear value propositions
- **Pain Points:**
  - Can't quantify "great natural light" for marketing
  - Needs to compare different floor units
  - Wants to show before/after scenarios (with shading devices)
- **Success Criteria:** "Export a PDF showing this unit gets 6 hours of sun"

#### Persona 4: Urban Planner "Arun" (15% of users)
- **Demographics:** 30-50 years, municipal planning or consultancy
- **Goals:** Evaluate shadow impact on neighboring properties, daylight compliance
- **Tech Level:** Medium - understands GIS, comfortable with analysis tools
- **Constraints:** Needs data accuracy documentation, must cite methodology
- **Pain Points:**
  - Need to assess shadow impact of new developments
  - Must document assumptions for planning approvals
  - Multiple scenario comparison needed
- **Success Criteria:** "Prove this building won't overshadow the park for more than 2 hours"

### 1.2 User Journey Maps

#### Primary Journey: Home Buyer (Critical Path)
```
1. DISCOVER (5 sec)
   - Land on homepage
   - Understand value proposition immediately
   - See "No login required" promise

2. UPLOAD (30 sec)
   - Drag site plan image
   - See validation feedback
   - Feel confident image is usable

3. CONFIGURE (2 min)
   - Set location (search city)
   - Adjust north orientation
   - Define scale reference

4. MODEL (3-5 min)
   - Trace building outlines
   - Set floor count/heights
   - Validate 3D representation looks right

5. EXPLORE (2-3 min)
   - Play shadow animation
   - Select specific floor
   - Scrub through time of day

6. UNDERSTAND (1-2 min)
   - View results dashboard
   - Read recommendations
   - Check comfort score

7. EXPORT (30 sec)
   - Download PDF report
   - Share with family/agent

Total: ~10 minutes for complete workflow
```

#### Secondary Journey: Quick Analysis (Architect)
```
1. UPLOAD existing CAD screenshot
2. SKIP detection, manual trace (faster)
3. Configure multiple buildings at once
4. Jump directly to specific date (winter solstice)
5. Export GLTF for client's 3D viewer
```

#### Tertiary Journey: Comparison Study (Developer)
```
1. Complete primary journey for Building A
2. Modify scenario (add exterior shading)
3. Compare comfort scores
4. Export comparison PDF with both scenarios
```

### 1.3 Key Problems to Solve

| Problem | User Segment | Current State | Target State |
|---------|--------------|---------------|--------------|
| "When should I open windows?" | Home Buyer | Generic recommendation | Time-specific advice based on actual analysis |
| "How much sun does floor 8 get?" | Architect | Rough estimate | Accurate floor-level analysis with confidence |
| "Will this building overshadow the park?" | Planner | No shadow overlap detection | Clear shadow impact visualization |
| "How does Low-E glass help?" | Developer | Scenario controls exist but don't affect results | Real-time scenario comparison |
| "Is this analysis reliable?" | All | No accuracy info | Transparent assumptions + confidence levels |

---

## Part 2: Gap Analysis & Research Findings

### 2.1 Competitive Analysis

**Industry Leaders Benchmarked:**
- **Shadowmap.org** - 3D shadow visualization, professional-grade accuracy
- **Aurora Solar** - AI-assisted design, comprehensive reports
- **HelioScope** - Engineering-grade calculations, commercial focus

**SunScope Differentiators:**
1. **Zero barrier to entry** - No login, no download, instant browser access
2. **Image-assisted massing** - Start from site plan photo (unique feature)
3. **Comfort-focused insights** - Daily life recommendations, not just technical data
4. **Transparent assumptions** - Honest about limitations

**Competitive Gaps to Address:**
- Shadowmap: Higher accuracy shadow calculations
- Aurora: Better PDF report quality
- All: Mobile optimization

### 2.2 UX Gaps

| Aspect | Current State | Best Practice | Gap Severity |
|--------|---------------|---------------|--------------|
| **Onboarding** | Help modal with static text | Interactive tutorial, sample project walkthrough | Medium |
| **Progress Feedback** | Loading spinner only | Step-by-step progress with time estimates | Low |
| **Error Messages** | Silent failures or console.log | Contextual inline errors with recovery suggestions | **High** |
| **Mobile Experience** | Not tested/optimized | Responsive with touch-optimized controls | Medium |
| **Accessibility** | Basic keyboard shortcuts | Full WCAG 2.2 AA compliance | **High** |
| **Undo/Redo** | Only for current drawing | Full action history across session | Medium |

### 2.3 Functionality Gaps

| Feature | Current State | Required State | Priority |
|---------|---------------|----------------|----------|
| **Scenario Integration** | UI exists but doesn't affect analysis | Scenarios modify comfort/heat calculations | **P0** |
| **Shadow Accuracy** | Simple direction-based estimation | Proper raycasting or shadow volume calculation | **P0** |
| **Input Validation** | None | All fields validated with clear feedback | **P0** |
| **Error Handling** | Console.log only | User-visible errors with recovery | **P0** |
| **Diffuse Radiation** | Not calculated | Add ~15% for diffuse component | P1 |
| **Accuracy Disclosure** | None | Show confidence levels and assumptions | P1 |
| **Multi-Day Analysis** | Single day only | Weekly/monthly summaries | P2 |
| **Building Comparison** | None | Side-by-side floor comparison | P2 |

### 2.4 Data Accuracy Issues

**Current Algorithm Problems:**

#### Shadow Estimation (AnalysisEngine.ts:200-230)
```typescript
// Current: Simple angle check (INACCURATE)
const angleDiff = Math.abs(obstacleAngle - sunAzimuth);
if (angleDiff < 45) inShadow = true;
```

**Issues:**
- Uses angle comparison (±45°) instead of proper geometry
- Doesn't account for building distance or height ratio
- Will produce false positives in dense sites
- **Impact:** 30-50% error in shadow timing

**Required Fix:**
```typescript
// Proper shadow projection calculation
const shadowLength = buildingHeight / Math.tan(sunAltitudeRad);
const shadowEndPoint = projectShadow(building, sunDirection, shadowLength);
const targetInShadow = isPointInShadowVolume(targetPoint, shadowPolygon);
```

#### Irradiance Calculation (AnalysisEngine.ts:100-120)
- Clear-sky only, no diffuse component
- Simplified air mass formula
- Doesn't account for surface orientation
- **Impact:** 15-25% underestimate of total radiation

#### Comfort Score (AnalysisEngine.ts:280-320)
- Hardcoded thresholds not validated against standards
- Doesn't incorporate scenario settings
- Same formula for all climates
- **Impact:** Comfort score not actionable

### 2.5 Performance Analysis

| Metric | Current | Target | Issue |
|--------|---------|--------|-------|
| Initial Load (LCP) | ~3s | <2s | Three.js bundle size |
| 3D Scene Init | ~1.5s | <1s | Full geometry rebuild |
| Shadow Update | ~150ms | <100ms | No caching |
| Analysis Run | ~800ms | <500ms | Synchronous, no Web Worker |
| PDF Export | ~4s | <3s | html2canvas overhead |

### 2.6 Accessibility Audit (WCAG 2.2 AA)

**Critical Failures:**
- [ ] Canvas-based drawing has no keyboard alternative (1.1.1 Non-text Content)
- [ ] Color-only status indicators (red/amber/green) (1.4.1 Use of Color)
- [ ] Modals lack focus trapping (2.4.3 Focus Order)
- [ ] Time slider requires mouse drag (2.5.7 Dragging Movements - NEW in 2.2)
- [ ] No skip navigation link (2.4.1 Bypass Blocks)
- [ ] SVG icons missing aria-labels (1.1.1 Non-text Content)

**Partial Compliance:**
- [~] Some keyboard shortcuts exist (Escape, Delete)
- [~] Form inputs have labels (but not all)
- [~] Contrast ratios mostly OK (some gray text fails)

---

## Part 3: Requirements & Success Metrics

### 3.1 Functional Requirements

#### P0 - Must Have (Week 1-2)
1. **Scenario-aware analysis** - Glazing/shading settings affect comfort calculations
2. **Improved shadow accuracy** - Proper shadow volume or raycasting
3. **Error handling system** - User-visible errors for all failure points
4. **Input validation** - Prevent invalid lat/lon, floor counts, etc.
5. **Accuracy disclosure** - Show confidence levels on results

#### P1 - Should Have (Week 3-4)
6. Diffuse radiation component
7. Floor-level shadow visualization in 3D
8. Seasonal summary (winter vs summer stats)
9. Keyboard-accessible building editor
10. Full WCAG 2.2 AA accessibility

#### P2 - Nice to Have (Week 5-6)
11. Multi-building comparison view
12. Mobile touch optimization
13. Performance optimization (Web Workers)
14. Animated shadow export
15. Session persistence (localStorage)

### 3.2 Non-Functional Requirements

| Category | Requirement | Metric |
|----------|-------------|--------|
| **Performance** | Initial load | LCP < 2.5s on 4G |
| **Performance** | Analysis execution | < 500ms for 10 buildings |
| **Accessibility** | WCAG compliance | Level AA (100% criteria) |
| **Reliability** | Error recovery | No silent failures |
| **Accuracy** | Shadow timing | ±15 minutes vs Shadowmap |
| **Accuracy** | Irradiance | ±20% vs clear-sky models |
| **Usability** | Task completion | 90% complete without help |
| **Usability** | Time to result | < 10 minutes for new user |

### 3.3 Success Metrics

**Quantitative:**
- Task completion rate: >85% of users who upload reach results
- Export rate: >50% of completed analyses result in export
- Performance: Core Web Vitals all "Good" (green)

**Qualitative:**
- Recommendations rated "helpful" by >70% users
- Users can explain limitations (understand assumptions)

---

## Part 4: Implementation Plan

### Phase 1: Critical Fixes (Week 1-2)

#### 1.1 Error Handling System
**Files to Create/Modify:**
- NEW: `src/utils/errors.ts`
- NEW: `src/components/common/ErrorBoundary.tsx`
- NEW: `src/components/common/Toast.tsx`
- UPDATE: `src/store/projectStore.ts`
- UPDATE: All components with async operations

**Implementation:**
```typescript
// Error types
enum ErrorType {
  IMAGE_LOAD_FAILED,
  ANALYSIS_FAILED,
  EXPORT_FAILED,
  INVALID_INPUT,
  WEBGL_NOT_SUPPORTED
}

// Error boundary wrapping app
// Toast notifications for async errors
// Inline form validation errors
```

**Tasks:**
- [ ] Create typed error utility module
- [ ] Add ErrorBoundary component at app root
- [ ] Implement toast notification system
- [ ] Add try/catch with user feedback to all file operations
- [ ] Add form validation to SiteSetup, MassingEditor

#### 1.2 Scenario Integration
**Files:** `src/modules/analysis/AnalysisEngine.ts`, `src/components/results/ResultsPage.tsx`

**Implementation:**
- Pass active scenario to `runAnalysis()`
- Apply `glazing.solarTransmittance` to irradiance calculations
- Apply `shading.reductionFactor` to heat gain
- Adjust comfort score based on window ventilation state
- Display scenario name on results

**Tasks:**
- [ ] Add scenario parameter to runAnalysis function
- [ ] Modify irradiance calculation: `effectiveIrradiance = dni * glazing.solarTransmittance`
- [ ] Modify heat calculation: `effectiveHeat = heat * shading.reductionFactor`
- [ ] Modify comfort: if window.state === 'open', add ventilation bonus
- [ ] Update ResultsPage to show active scenario settings

#### 1.3 Input Validation
**Files:** `src/components/setup/SiteSetup.tsx`, `src/components/editor/MassingEditor.tsx`

**Validation Rules:**
- Latitude: -90 to 90
- Longitude: -180 to 180
- Floor count: 1 to 100
- Floor height: 2m to 10m
- North angle: 0 to 360
- Scale: 0.01 to 100 m/px

**Tasks:**
- [ ] Create validation helper functions
- [ ] Add inline error messages for invalid inputs
- [ ] Block step navigation if required fields missing
- [ ] Show validation summary before continuing

### Phase 2: Accuracy Improvements (Week 2-3)

#### 2.1 Shadow Algorithm Rewrite
**Files:**
- `src/modules/analysis/AnalysisEngine.ts`
- NEW: `src/modules/analysis/ShadowCalculator.ts`

**Algorithm:**
```typescript
class ShadowCalculator {
  // For each building, calculate shadow polygon at given sun position
  calculateShadowPolygon(building: Building, sunAltitude: number, sunAzimuth: number): Point2D[] {
    const shadowLength = building.totalHeight / Math.tan(sunAltitude);
    const shadowDirection = { x: -Math.sin(sunAzimuth), y: -Math.cos(sunAzimuth) };

    // Project each footprint vertex by shadow length in shadow direction
    const shadowVertices = building.footprint.map(vertex => ({
      x: vertex.x + shadowDirection.x * shadowLength,
      y: vertex.y + shadowDirection.y * shadowLength
    }));

    // Create shadow polygon (building footprint + projected vertices)
    return createShadowPolygon(building.footprint, shadowVertices);
  }

  // Test if target point is inside any building's shadow
  isPointInShadow(point: Point2D, buildings: Building[], sunAlt: number, sunAz: number): boolean {
    for (const building of buildings) {
      const shadowPoly = this.calculateShadowPolygon(building, sunAlt, sunAz);
      if (isPointInPolygon(point, shadowPoly)) {
        return true;
      }
    }
    return false;
  }
}
```

**Tasks:**
- [ ] Implement ShadowCalculator class
- [ ] Add shadow polygon calculation
- [ ] Implement point-in-polygon test
- [ ] Cache shadow polygons when sun position unchanged
- [ ] Validate against Shadowmap for 3 test cases
- [ ] Document accuracy improvement

#### 2.2 Diffuse Radiation Addition
**Files:** `src/modules/analysis/AnalysisEngine.ts`

**Implementation:**
```typescript
// Add diffuse horizontal irradiance (simplified isotropic model)
function calculateTotalIrradiance(sunAltitude: number, inShadow: boolean): number {
  const dni = calculateDirectNormalIrradiance(sunAltitude);
  const dhi = dni * 0.15; // ~15% diffuse component (clear sky)

  if (inShadow) {
    return dhi; // Only diffuse when in shadow
  }
  return dni * Math.sin(sunAltitude) + dhi; // Direct + diffuse
}
```

**Tasks:**
- [ ] Add diffuse irradiance calculation
- [ ] Apply diffuse even when in shadow (sky light)
- [ ] Document formula and source

#### 2.3 Accuracy Disclosure
**Files:** `src/components/results/ResultsPage.tsx`

**Implementation:**
- Show accuracy ranges: "6.2 hours (±30 min)"
- List assumptions used: Clear sky, no terrain, simplified geometry
- Add expandable "Methodology" section
- Link to detailed documentation

### Phase 3: Accessibility (Week 3-4)

#### 3.1 Keyboard Navigation
**Files:** All components

**Tasks:**
- [ ] Add skip navigation link at top of page
- [ ] Implement focus trapping in all modals
- [ ] Add keyboard controls for time slider:
  - Arrow keys: ±15 minutes
  - Page Up/Down: ±1 hour
  - Home/End: Sunrise/Sunset
- [ ] Make building list navigable with arrow keys
- [ ] Add coordinate input as alternative to canvas drawing

#### 3.2 Screen Reader Support
**Tasks:**
- [ ] Add aria-labels to all icon-only buttons
- [ ] Add aria-live regions for:
  - Analysis completion
  - Error messages
  - Time updates during animation
- [ ] Add role="img" and aria-label to canvas visualizations
- [ ] Create text descriptions of charts for screen readers

#### 3.3 Visual Accessibility
**Tasks:**
- [ ] Add text labels alongside color indicators (e.g., "High Risk" not just red)
- [ ] Fix contrast ratio on gray text (currently ~3:1, need 4.5:1)
- [ ] Add visible focus indicators (2px solid outline)
- [ ] Respect `prefers-reduced-motion` (disable animations)
- [ ] Test with Windows High Contrast mode

### Phase 4: UX Improvements (Week 4-5)

#### 4.1 Onboarding Enhancement
**Tasks:**
- [ ] Create interactive sample project tutorial
- [ ] Add first-visit tooltip hints on key controls
- [ ] Implement localStorage progress saving
- [ ] Add "Continue where you left off" prompt on return

#### 4.2 Results Enhancement
**Tasks:**
- [ ] Add seasonal comparison panel (Winter vs Summer side-by-side)
- [ ] Make recommendations time-specific (e.g., "Open windows 6:00-10:30 AM")
- [ ] Add shareable results link (encode state in URL)
- [ ] Add floor comparison mode for same building

#### 4.3 Mobile Optimization
**Tasks:**
- [ ] Audit and fix responsive layout issues
- [ ] Add touch gestures for 3D (pinch zoom, two-finger rotate)
- [ ] Simplify editor toolbar for small screens
- [ ] Test and optimize performance on mid-range Android

### Phase 5: Performance & Polish (Week 5-6)

#### 5.1 Performance Optimization
**Tasks:**
- [ ] Move analysis to Web Worker (non-blocking)
- [ ] Implement LOD for 3D (simplify distant buildings)
- [ ] Lazy load export modules (jsPDF, GLTFExporter)
- [ ] Add shadow map caching
- [ ] Tree-shake Three.js imports

#### 5.2 Testing & Documentation
**Tasks:**
- [ ] Write unit tests for ShadowCalculator
- [ ] Write unit tests for AnalysisEngine
- [ ] Create E2E test for complete user journey
- [ ] Document module interfaces
- [ ] Create accuracy validation test suite

---

## Part 5: File Modification Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `src/utils/errors.ts` | Error types and handling utilities |
| `src/utils/validation.ts` | Input validation helpers |
| `src/components/common/ErrorBoundary.tsx` | App-wide error catching |
| `src/components/common/Toast.tsx` | Toast notification component |
| `src/components/common/AccessibleSlider.tsx` | WCAG-compliant slider |
| `src/modules/analysis/ShadowCalculator.ts` | Accurate shadow computation |
| `src/components/results/AccuracyDisclaimer.tsx` | Methodology disclosure |
| `src/components/results/SeasonalComparison.tsx` | Winter/Summer comparison |

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add ErrorBoundary, skip nav link |
| `src/store/projectStore.ts` | Add error state, validation |
| `src/modules/analysis/AnalysisEngine.ts` | Shadow rewrite, scenario integration, diffuse radiation |
| `src/components/setup/SiteSetup.tsx` | Input validation |
| `src/components/editor/MassingEditor.tsx` | Input validation, keyboard support |
| `src/components/viewer/TimeControls.tsx` | Keyboard controls, aria-labels |
| `src/components/viewer/Scene3D.tsx` | Performance optimization |
| `src/components/results/ResultsPage.tsx` | Scenario display, accuracy, accessibility |
| `src/components/layout/Header.tsx` | Keyboard navigation |

---

## Part 6: Verification Plan

### 6.1 Accuracy Validation
1. Create 3 reference test cases with known shadow times:
   - Single building, equator, equinox
   - Two buildings, 40°N latitude, summer solstice
   - Dense site (5 buildings), 51°N latitude, winter solstice
2. Compare SunScope results with Shadowmap.org for same inputs
3. Document variance and confirm within ±15 minute tolerance
4. Add automated regression tests

### 6.2 Accessibility Testing
1. Run axe DevTools on every page
2. Complete full workflow using keyboard only
3. Test with NVDA (Windows) and VoiceOver (Mac)
4. Verify color contrast with WebAIM Contrast Checker
5. Test with `prefers-reduced-motion: reduce`
6. Test with Windows High Contrast mode

### 6.3 Performance Testing
1. Run Lighthouse on production build (target: 90+ score)
2. Measure Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
3. Profile 3D rendering with Chrome DevTools Performance tab
4. Test with 10, 15, 25 buildings (verify no degradation)
5. Test on physical mobile device (mid-range Android)

### 6.4 User Testing Protocol
1. Recruit 5 users matching personas (1 per type + 1 extra home buyer)
2. Task: "Analyze sunlight for floor 5 of the tallest building"
3. Measure:
   - Time to completion
   - Error/retry count
   - Task success rate
4. Collect:
   - Qualitative feedback on recommendations
   - Understanding of accuracy limitations
   - Likelihood to recommend (NPS)

---

## Part 7: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Shadow algorithm complexity | Medium | High | Start with simplified 2D projection, iterate |
| WCAG compliance effort | Medium | Medium | Use established accessible component libraries |
| Performance regression | Low | Medium | Benchmark before/after each phase |
| Browser compatibility | Low | High | Test on Safari/Firefox early |
| User adoption of new features | Medium | Low | A/B test with subset of features |

---

## Appendix A: Technical References

### Shadow Calculation
- NOAA Solar Calculator: https://gml.noaa.gov/grad/solcalc/
- SunCalc.js documentation: https://github.com/mourner/suncalc

### Accessibility
- WCAG 2.2 Quick Reference: https://www.w3.org/WAI/WCAG22/quickref/
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- axe DevTools: https://www.deque.com/axe/devtools/

### Competitive Tools
- Shadowmap: https://shadowmap.org/
- Aurora Solar: https://www.aurorasolar.com/
- HelioScope: https://helioscope.aurorasolar.com/

### Performance
- Web Vitals: https://web.dev/vitals/
- Three.js Performance Tips: https://threejs.org/manual/#en/optimize-lots-of-objects

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **DNI** | Direct Normal Irradiance - solar power per unit area on surface perpendicular to sun |
| **DHI** | Diffuse Horizontal Irradiance - scattered sky radiation on horizontal surface |
| **LCP** | Largest Contentful Paint - Core Web Vital for load performance |
| **WCAG** | Web Content Accessibility Guidelines |
| **LOD** | Level of Detail - rendering optimization technique |
| **Massing** | Simplified 3D representation of building volumes |

---

*Document prepared as part of SunScope Pro production roadmap.*
*Next step: Begin Phase 1 implementation.*
