# Acceptance Criteria & QA Checklist

## Open-Access Site Sunlight & Massing Tool

---

## 1. Feature Acceptance Criteria

### 1.1 Image Upload & Validation

| ID | Criterion | Test Method | Pass Criteria |
|----|-----------|-------------|---------------|
| UP-01 | Drag-and-drop upload works | Drag JPG/PNG to upload zone | File accepted, preview shown |
| UP-02 | File browser upload works | Click "Browse Files" button | File dialog opens, selection works |
| UP-03 | JPG format accepted | Upload .jpg file | File processed successfully |
| UP-04 | PNG format accepted | Upload .png file | File processed successfully |
| UP-05 | PDF format accepted | Upload .pdf file | First page extracted and shown |
| UP-06 | File size limit enforced | Upload >10MB file | Error message shown, upload rejected |
| UP-07 | Invalid format rejected | Upload .doc, .exe, etc. | Error message shown |
| UP-08 | Low resolution warning | Upload <800px image | Warning shown with option to continue |
| UP-09 | Validation checklist displays | Upload valid image | Detected/Needs Confirmation/Missing items shown |
| UP-10 | Sample project loads | Click "Try Sample Project" | Sample site plan loads with pre-filled data |

### 1.2 Site Setup

| ID | Criterion | Test Method | Pass Criteria |
|----|-----------|-------------|---------------|
| SS-01 | North orientation adjustable | Drag compass or enter degrees | Image rotates, value updates |
| SS-02 | Scale line drawable | Draw line on image | Length input becomes active |
| SS-03 | Scale value saves | Enter scale (e.g., 50m) | Scale persists, measurements convert |
| SS-04 | Location search works | Search "New York" | Location found, lat/lon populated |
| SS-05 | Manual coordinates work | Enter lat: 40.7, lon: -74.0 | Location accepted and shown |
| SS-06 | Timezone auto-detected | Select location | Timezone populated from coordinates |
| SS-07 | Invalid coordinates rejected | Enter lat: 200 | Error message shown |

### 1.3 Massing Editor

| ID | Criterion | Test Method | Pass Criteria |
|----|-----------|-------------|---------------|
| ME-01 | Drawing tool creates footprint | Click points to draw polygon | Polygon closes on double-click |
| ME-02 | Footprint editable | Select and drag vertex | Shape updates |
| ME-03 | Building deletable | Select and press Delete | Building removed |
| ME-04 | Floor count input works | Enter "10" in floors field | Building shows 10 floors |
| ME-05 | Floor height input works | Enter "3.5" in height field | Total height = floors × 3.5m |
| ME-06 | Building name editable | Type in name field | Name updates in list and 3D |
| ME-07 | Multiple buildings supported | Create 5 buildings | All buildings displayed |
| ME-08 | Undo/redo works | Make changes, click Undo | Previous state restored |
| ME-09 | 2D/3D view toggle | Click 2D/3D buttons | View switches correctly |
| ME-10 | Image overlay visible | Enable in editor | Site plan image visible under buildings |

### 1.4 3D Viewer

| ID | Criterion | Test Method | Pass Criteria |
|----|-----------|-------------|---------------|
| 3D-01 | Buildings rendered | Complete massing | 3D blocks visible |
| 3D-02 | Orbit control works | Drag to rotate | View rotates smoothly |
| 3D-03 | Pan control works | Right-click drag | View pans |
| 3D-04 | Zoom control works | Scroll wheel | View zooms in/out |
| 3D-05 | Reset view works | Click reset button | Returns to default view |
| 3D-06 | Shadows visible | Enable shadows | Shadow cast by buildings |
| 3D-07 | Sun indicator shows | Check 3D view | Sun position/direction visible |
| 3D-08 | Building selection works | Click building | Building highlighted |
| 3D-09 | Floor selection works | Select floor from dropdown | Floor highlighted |
| 3D-10 | Preset views work | Click Top/Iso buttons | View changes to preset |

### 1.5 Time & Date Controls

| ID | Criterion | Test Method | Pass Criteria |
|----|-----------|-------------|---------------|
| TD-01 | Date picker works | Click and select date | Date updates, shadows change |
| TD-02 | Time slider works | Drag slider | Time updates, shadows animate |
| TD-03 | Play animation works | Click play button | Time advances automatically |
| TD-04 | Pause works | Click pause while playing | Animation stops |
| TD-05 | Speed control works | Change animation speed | Animation faster/slower |
| TD-06 | Current time displayed | Any time selected | Time shown (e.g., "10:30 AM") |
| TD-07 | Quick date presets | Click Summer Solstice | Date jumps to Jun 21 |
| TD-08 | Night hours handled | Set time to 23:00 | Sun below horizon, shadows gone |

### 1.6 Analysis Results

| ID | Criterion | Test Method | Pass Criteria |
|----|-----------|-------------|---------------|
| AR-01 | First sun time shown | Run analysis | Time displayed or "No direct sun" |
| AR-02 | Last sun time shown | Run analysis | Time displayed correctly |
| AR-03 | Total sun hours shown | Run analysis | Hours displayed (e.g., "8.2 hours") |
| AR-04 | Heat impact level shown | Run analysis | Low/Medium/High displayed |
| AR-05 | Comfort score shown | Run analysis | 0-100 score displayed |
| AR-06 | Peak heat period shown | Run analysis | Time range displayed |
| AR-07 | Recommendations shown | Run analysis | At least 3 recommendations listed |
| AR-08 | Charts display | View results | Hourly chart renders |
| AR-09 | Results update on change | Change date/time | Results recalculate |
| AR-10 | Disclaimer visible | View results | Disclaimer text present |

### 1.7 Scenario Comparison

| ID | Criterion | Test Method | Pass Criteria |
|----|-----------|-------------|---------------|
| SC-01 | Window toggle works | Toggle Open/Closed | Results update |
| SC-02 | Glass type selector works | Select Low-E | Heat metrics change |
| SC-03 | Curtain toggle works | Select Heavy Curtains | Heat metrics reduce |
| SC-04 | Exterior shading works | Select Awning | Heat metrics reduce |
| SC-05 | Compare view shows diff | Toggle scenario | Comparison values shown |
| SC-06 | Multiple scenarios storable | Create 3 scenarios | All accessible in dropdown |

### 1.8 Export Functionality

| ID | Criterion | Test Method | Pass Criteria |
|----|-----------|-------------|---------------|
| EX-01 | PDF export works | Click export, select PDF | PDF downloads |
| EX-02 | PDF contains metrics | Open exported PDF | All key metrics present |
| EX-03 | PDF contains image | Open exported PDF | 3D snapshot included |
| EX-04 | CSV export works | Select CSV | CSV downloads |
| EX-05 | CSV data correct | Open CSV | Hourly data matches UI |
| EX-06 | PNG export works | Select PNG | PNG of 3D view downloads |
| EX-07 | GLTF export works | Select GLTF | GLTF file downloads |
| EX-08 | GLTF imports elsewhere | Import to Blender | Geometry correct |

---

## 2. Non-Functional Requirements

### 2.1 Performance

| ID | Requirement | Test Method | Pass Criteria |
|----|-------------|-------------|---------------|
| PF-01 | Initial page load < 4s | Lighthouse, 4G throttle | LCP < 4s |
| PF-02 | 3D scene init < 2s | Time from upload complete to 3D visible | < 2s |
| PF-03 | Shadow update < 200ms | Change time, measure | < 200ms |
| PF-04 | Analysis < 1s | Trigger analysis, measure | < 1s |
| PF-05 | 10 buildings supported | Create 10 buildings | No lag or crash |
| PF-06 | Mobile responsive | Test on mobile device | Layout adapts, usable |

### 2.2 Accessibility (WCAG 2.1 AA)

| ID | Requirement | Test Method | Pass Criteria |
|----|-------------|-------------|---------------|
| AC-01 | Keyboard navigation | Tab through all controls | All focusable, focus visible |
| AC-02 | Color contrast | axe DevTools | No contrast violations |
| AC-03 | Focus management | Open/close modal | Focus trapped and restored |
| AC-04 | ARIA labels | Screen reader test | All controls announced |
| AC-05 | Alt text | Check images | Meaningful alt text present |
| AC-06 | Form labels | Check form inputs | All inputs have labels |
| AC-07 | Skip link | Press Tab on load | Skip to main content option |
| AC-08 | Reduced motion | Enable prefers-reduced-motion | Animations disabled |

### 2.3 Browser Compatibility

| ID | Browser | Version | Pass Criteria |
|----|---------|---------|---------------|
| BC-01 | Chrome | Latest | All features work |
| BC-02 | Firefox | Latest | All features work |
| BC-03 | Safari | Latest | All features work |
| BC-04 | Edge | Latest | All features work |
| BC-05 | Chrome Mobile | Latest | Core features work |
| BC-06 | Safari Mobile | Latest | Core features work |

### 2.4 Security

| ID | Requirement | Test Method | Pass Criteria |
|----|-------------|-------------|---------------|
| SE-01 | HTTPS enforced | Access via HTTP | Redirects to HTTPS |
| SE-02 | No XSS vulnerabilities | Enter `<script>` in inputs | Input sanitized |
| SE-03 | No data persistence | Close and reopen browser | Data gone (unless explicit save) |
| SE-04 | CSP headers set | Check response headers | Strict CSP present |

---

## 3. QA Test Scenarios

### 3.1 Happy Path Scenario

**Test: Complete workflow from upload to export**

1. Open application
2. Upload sample site plan image
3. Confirm validation passes
4. Set north orientation to 0°
5. Set scale to 100m reference
6. Search location "London, UK"
7. Draw 3 building footprints
8. Set floors: 5, 8, 12
9. Set floor heights: 3m each
10. Switch to 3D view
11. Select middle building, floor 4
12. Set date to June 21
13. Animate from 6:00 to 20:00
14. View results dashboard
15. Toggle "Heavy Curtains" scenario
16. Export PDF report

**Expected:** All steps complete without error, PDF contains full analysis.

### 3.2 Edge Case Scenarios

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Zero sun exposure | Create building completely shadowed by taller neighbor | "No direct sunlight" message, comfort adapts |
| Arctic location | Set location to 70°N, June 21 | 24-hour daylight handled correctly |
| Single floor building | Create 1-floor building | Analysis still runs, no errors |
| Maximum buildings | Create 25 buildings | System handles without crash |
| Very large footprint | Draw 500m x 500m building | Handles scale, may show warning |
| Rapid time scrubbing | Move slider quickly back and forth | No crash, shadows update (may debounce) |
| Re-upload image | Upload new image mid-session | Previous buildings cleared, fresh start |

### 3.3 Error Recovery Scenarios

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Upload failure | Upload corrupted file | Clear error message, can retry |
| Invalid polygon | Draw self-intersecting shape | Warning shown, can fix |
| Missing scale | Proceed without scale | Warning, blocked until fixed |
| Missing location | Proceed without location | Warning, blocked until fixed |
| Browser back button | Click back during analysis | Graceful navigation, no data loss |
| Tab sleep/wake | Leave tab for 10 min, return | State preserved, can continue |

---

## 4. Test Data Requirements

### 4.1 Sample Images

| File | Description | Resolution | Purpose |
|------|-------------|------------|---------|
| sample_site_1.jpg | Simple 3-building layout | 2000x1500 | Happy path testing |
| sample_site_2.png | Complex 10-building site | 3000x2000 | Performance testing |
| sample_low_res.jpg | Same as 1, low quality | 600x400 | Low resolution warning |
| sample_large.png | Same as 1, high res | 5000x4000 | Size limit testing |
| sample_rotated.jpg | North not up | 2000x1500 | Orientation testing |

### 4.2 Test Locations

| Location | Lat | Lon | Purpose |
|----------|-----|-----|---------|
| New York | 40.7128 | -74.0060 | Standard mid-latitude |
| Singapore | 1.3521 | 103.8198 | Equatorial (high sun) |
| London | 51.5074 | -0.1278 | High latitude |
| Sydney | -33.8688 | 151.2093 | Southern hemisphere |
| Tromso | 69.6492 | 18.9553 | Arctic (extreme) |

### 4.3 Test Dates

| Date | Description |
|------|-------------|
| June 21 | Summer solstice (N. hemisphere) |
| December 21 | Winter solstice (N. hemisphere) |
| March 20 | Spring equinox |
| September 22 | Autumn equinox |
| Today | Current date |

---

## 5. Definition of Done

A feature is considered **DONE** when:

- [ ] All acceptance criteria pass
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Accessibility audit passes
- [ ] Performance budget met
- [ ] Works in all target browsers
- [ ] Documentation updated
- [ ] No known critical bugs

---

## 6. Release Checklist

### Pre-Release

- [ ] All acceptance criteria verified
- [ ] Full regression test passed
- [ ] Accessibility audit (axe, WAVE) passed
- [ ] Performance audit (Lighthouse >90) passed
- [ ] Security headers configured
- [ ] Error tracking enabled (optional)
- [ ] Analytics disabled or privacy-compliant
- [ ] README.md complete
- [ ] Assumptions document included
- [ ] Sample project data included

### Release

- [ ] Build successful
- [ ] Deploy to staging
- [ ] Staging smoke test passed
- [ ] Deploy to production
- [ ] Production smoke test passed
- [ ] Monitor for errors (24h)

### Post-Release

- [ ] Announce release
- [ ] Monitor user feedback
- [ ] Track any reported issues
- [ ] Plan next iteration

---

## 7. Bug Severity Definitions

| Severity | Definition | Response Time |
|----------|------------|---------------|
| **Critical** | App crashes, data loss, security vulnerability | Fix immediately |
| **High** | Major feature broken, no workaround | Fix within 24h |
| **Medium** | Feature partially broken, workaround exists | Fix within 1 week |
| **Low** | Minor issue, cosmetic, edge case | Fix in next release |

---

## 8. Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Tech Lead | | | |
| QA Lead | | | |
| Accessibility Reviewer | | | |

---

*Document Version: 1.0*
*Date: January 2026*
