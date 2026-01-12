# Comprehensive Site Plan Image Research

## Types of Site Plan Images

### 1. By Purpose

#### A. Architectural/Technical Site Plans
- **CAD Drawings**: Black/white line drawings with precise measurements
- **Survey Plans**: Show property boundaries, easements, topography
- **Construction Documents**: Detailed plans for builders
- **As-Built Plans**: Document completed construction

#### B. Marketing/Presentation Site Plans
- **Rendered 2D Plans**: Colorful, stylized top-down views with textures
- **3D Aerial Views**: Bird's-eye perspective renderings
- **Photorealistic Renders**: High-detail marketing imagery
- **Brochure Graphics**: Simplified, visually appealing layouts

#### C. Planning/Regulatory Site Plans
- **Zoning Plans**: Show land use designations
- **Master Plans**: Large-scale development vision
- **Subdivision Plans**: Lot divisions and parceling
- **Environmental Plans**: Wetlands, buffers, protected areas

### 2. By Visual Style

| Style | Characteristics | Common Use |
|-------|-----------------|------------|
| **Line Drawing** | Black/white, minimal color | Technical, permits |
| **Colored 2D** | Flat colors, clear boundaries | Marketing, presentations |
| **Rendered 2D** | Textures, shadows, realistic materials | Real estate marketing |
| **3D Isometric** | Angled view, shows height | Marketing, visualization |
| **3D Perspective** | Realistic camera angle | High-end marketing |
| **Satellite/Aerial** | Actual photography | Location context |
| **Hybrid** | Photo + overlay graphics | Marketing with context |

### 3. By Scale/Scope

- **Single Plot**: One building lot
- **Multi-Building**: Campus, complex
- **Township**: Large residential development (100+ acres)
- **Master Plan**: Entire district/community
- **Regional**: Multiple developments/areas

---

## Common Site Plan Elements

### A. Buildings & Structures

| Element | Visual Representation | Detection Cues |
|---------|----------------------|----------------|
| **Residential Towers** | Rectangular blocks, often with balcony patterns | Regular shapes, repeated patterns |
| **Villas/Houses** | Smaller irregular shapes with roofs | Individual units, gardens |
| **Row Houses** | Connected rectangular units | Linear arrangements |
| **Clubhouse** | Larger irregular shape | Central location, near pool |
| **Parking Structures** | Grid patterns | Regular striping |
| **Retail/Commercial** | Ground floor different color | Near entrances |
| **Guard Houses** | Small squares at entrances | At gates/access points |

### B. Amenities

| Amenity | Visual Cues | Typical Location |
|---------|-------------|------------------|
| **Swimming Pool** | Blue rectangle/organic shape | Near clubhouse |
| **Tennis Court** | Green rectangle with lines | Sports zone |
| **Basketball Court** | Smaller rectangle with circle | Sports zone |
| **Children's Play Area** | Colorful irregular shapes | Central, visible |
| **Jogging Track** | Curved path around perimeter | Along boundaries |
| **Gym/Fitness** | Part of clubhouse | Clubhouse building |
| **Garden/Landscaping** | Green organic shapes | Throughout |
| **Water Features** | Blue irregular shapes | Decorative areas |
| **Amphitheater** | Semi-circular shape | Event spaces |
| **Yoga/Meditation** | Small pavilion shapes | Quiet zones |

### C. Infrastructure

| Element | Visual Representation |
|---------|----------------------|
| **Main Roads** | Wide gray/black paths |
| **Internal Roads** | Narrower paths |
| **Pedestrian Paths** | Thin lines, often curved |
| **Parking Lots** | Striped rectangles |
| **Entry Gates** | Marked access points |
| **Utility Areas** | Usually unmarked/back areas |

### D. Natural Features

| Feature | Visual Cues |
|---------|-------------|
| **Water Bodies** | Blue areas, irregular shapes |
| **Existing Trees** | Circle symbols with texture |
| **Proposed Landscaping** | Green areas, patterns |
| **Slopes/Terrain** | Contour lines |
| **Rock Formations** | Gray irregular shapes |

### E. Annotation Elements

| Element | Purpose |
|---------|---------|
| **North Arrow/Compass** | Orientation reference |
| **Scale Bar** | Distance reference |
| **Legend** | Symbol explanations |
| **Building Labels** | Tower names/numbers |
| **Area Callouts** | Square footage, unit types |
| **Phase Boundaries** | Development staging |

---

## Image Detection Strategies

### 1. Color-Based Detection

```
Building Detection:
- White/light gray → Building footprints
- Roof colors (terracotta, gray, blue) → Building tops

Amenity Detection:
- Light blue → Swimming pools, water features
- Green (lawn texture) → Gardens, parks
- Green (court marking) → Tennis/sports courts
- Brown/tan → Pathways, decks
- Gray (striped) → Parking areas

Infrastructure:
- Dark gray/black → Roads
- Light gray → Sidewalks
- Red/orange lines → Boundary markers
```

### 2. Shape-Based Detection

```
Geometric Shapes:
- Rectangles with aspect ratio 1:1 to 1:3 → Buildings
- Long thin rectangles → Row houses
- Ovals/organic shapes in blue → Pools
- Rectangles with internal lines → Courts
- Circles → Trees, fountains

Pattern Recognition:
- Grid patterns → Parking lots
- Repeated shapes → Building clusters
- Radial patterns → Roundabouts, plazas
- Linear sequences → Townhouses, shops
```

### 3. Contextual Detection

```
Spatial Relationships:
- Large shape at center → Clubhouse/amenity building
- Shapes at perimeter → Residential towers
- Small shapes at entry → Guard houses
- Blue shapes near large building → Pool near clubhouse
- Green corridor around perimeter → Jogging track
```

### 4. Text/Label Detection (OCR)

```
Common Labels to Detect:
- "Tower", "Block", "Building" + number
- "Club House", "Clubhouse"
- "Pool", "Swimming"
- Floor areas: "2500 SFT", "2BHK", "3BHK"
- Phase markers: "Phase 1", "Phase 2"
- Compass: "N", "S", "E", "W"
```

---

## Regional Variations

### India
- **Township style**: Large gated communities
- **Tower naming**: Often alphabetical (A, B, C) or themed
- **Common amenities**: Cricket pitch, temple, party lawn
- **Unit labeling**: BHK system (2BHK, 3BHK), SFT/Sqft
- **Languages**: English + regional script

### Middle East (Dubai, etc.)
- **Luxury focus**: Pools, private beaches
- **Tower style**: Tall, modern designs
- **Amenities**: Majlis, mosque, retail podiums

### USA/Europe
- **Suburban style**: More spread out
- **Parking emphasis**: Large parking areas
- **Amenities**: Dog parks, BBQ areas, bike storage

### Southeast Asia
- **High density**: Many towers
- **Amenities**: Sky gardens, function rooms
- **Common areas**: Void decks, covered walkways

---

## Data to Extract from Site Plans

### Priority 1: Essential for Sunlight Analysis
1. Building footprints (shape, position)
2. Number of buildings
3. Building heights (if labeled)
4. North orientation
5. Scale/dimensions

### Priority 2: Important Context
1. Building names/numbers
2. Unit types/sizes
3. Surrounding buildings
4. Water bodies (reflections affect light)
5. Large trees (shade sources)

### Priority 3: Nice to Have
1. Amenity locations
2. Road network
3. Phase boundaries
4. Entry/exit points
5. Parking locations

---

## Implementation Recommendations

### Auto-Detection Pipeline

```
1. Image Preprocessing
   - Color normalization
   - Contrast enhancement
   - Noise reduction

2. Element Detection
   - Color segmentation for buildings
   - Edge detection for boundaries
   - Blob detection for amenities
   - Contour analysis for shapes

3. Classification
   - Shape classification (building vs amenity)
   - Size-based categorization
   - Position-based context

4. Labeling
   - OCR for text extraction
   - Symbol recognition
   - Legend parsing

5. Validation
   - User confirmation of detected elements
   - Manual adjustment tools
   - Confidence scoring
```

### UI Enhancements Needed

1. **Detection Preview Panel**
   - Show detected buildings with confidence
   - Color-coded element types
   - One-click accept/reject

2. **Bulk Building Import**
   - Import all detected buildings at once
   - Batch edit floor counts
   - Template-based height assignment

3. **Amenity Layer**
   - Toggle amenity visibility
   - Non-analysis elements (for context)

4. **Legend Parser**
   - Extract information from legend
   - Auto-apply to detected elements

5. **Multi-Select Tools**
   - Select multiple buildings
   - Batch operations
   - Group by phase/type

---

## Sources

- [How to Read Site Plans - Get A Site Plan](https://getasiteplan.com/how-to-read-site-plan/)
- [Site Plan Components - USA Site Plans](https://www.usasiteplans.com/how-to-read-a-site-plan/)
- [Floor Plan Symbols - BigRentz](https://www.bigrentz.com/blog/floor-plan-symbols)
- [Building Footprint Extraction - Microsoft Azure](https://azure.microsoft.com/en-us/blog/how-to-extract-building-footprints-from-satellite-images-using-deep-learning/)
- [Floor Plan Recognition - Medium](https://maikpaixao.medium.com/floor-plan-recognition-using-computer-vision)
- [3D Floor Plan Rendering - McLine Studios](https://mclinestudios.com/what-is-floor-plan-rendering/)
- [Site Plan Rendering Examples - The 2D 3D Floor Plan Company](https://the2d3dfloorplancompany.com/site-plan-rendering-samples-examples/)

---

*Document Version: 1.0*
*Date: January 2026*
