# Time & Date Controls: UX Research & Recommendations

## For Web-Based Sunlight and Comfort Analysis Tools

---

## Part 1: Research Insights

### How Industry Tools Handle Time Controls

Based on analysis of leading tools including Shadowmap, SunCalc, Andrew Marsh's Sun-Path tools, and ClimateStudio, several consistent patterns emerge:

| Tool          | Time Selection        | Date Selection           | Animation             | Key Strength                |
| ------------- | --------------------- | ------------------------ | --------------------- | --------------------------- |
| Shadowmap     | Slider + manual input | Calendar picker          | Play/pause with speed | Real-time 3D sync           |
| SunCalc       | Horizontal timeline   | Click on date            | Drag to scrub         | Visual phase indicators     | 
| Sunlitt       | Gestural drag on arc  | Swipe gestures           | Canvas-based          | Intuitive touch interaction | 
| ClimateStudio | Presets + custom      | Solstice/equinox presets | Frame-by-frame        | Professional presets        |

### What Makes Time Controls Feel Trustworthy

Research from NN/g and observed patterns reveal three trust pillars:

1. **Immediate Feedback** — When users move a time slider, the 3D visualization must respond in real-time. Any lag breaks the mental connection between input and output.

2. **Contextual Validation** — Users trust results more when they see sunrise/sunset boundaries that match their real-world expectations for the selected location.

3. **Familiar Anchors** — Showing current time, or highlighting "now" on a timeline, grounds abstract simulations in reality.

### Patterns That Increase Engagement

From Sun Tracker AR, Golden Hour apps, and Sunlitt:

- **Gestural interaction**: Dragging a sun icon along its arc path (rather than moving a detached slider) creates intuitive cause-effect understanding
- **Ambient response**: Background colors shifting from blue (dawn) to yellow (noon) to orange (dusk) reinforces time-of-day without reading numbers
- **Phase labeling**: Showing "Golden Hour", "Solar Noon", "Civil Twilight" gives meaning to abstract times

---

## Part 2: Essential Time & Date Control Features (Must-Have)

### 2.1 Time Selection

| Feature                       | Implementation                       | User Trust Justification                     |
| ----------------------------- | ------------------------------------ | -------------------------------------------- |
| **Time Slider**               | Horizontal slider, 00:00–23:59 range | Familiar, precise, accessible                |
| **Manual Input Field**        | HH:MM text input with validation     | Allows exact specification for professionals |
| **Current Time Marker**       | "Now" indicator on slider            | Grounds simulation in reality                |
| **Sunrise/Sunset Boundaries** | Visual markers on timeline           | Prevents confusion about "dark" periods      |
| **Snap Points**               | 15-minute or 30-minute increments    | Reduces false precision anxiety              |

**Recommendation**: Combine slider with optional keyboard input. Show time in 24-hour format with AM/PM toggle for accessibility.

### 2.2 Date Selection

| Feature                    | Implementation                               | User Trust Justification               |
| -------------------------- | -------------------------------------------- | -------------------------------------- |
| **Calendar Picker**        | Standard date picker UI                      | Familiar interaction pattern           |
| **Seasonal Quick Presets** | Summer Solstice, Winter Solstice, Equinoxes  | Reduces decision fatigue for key dates |
| **Today Button**           | One-click return to current date             | Quick baseline reference               |
| **Month/Year Navigation**  | Easy jumping without clicking through months | Efficiency for year-round planning     |

**Key Insight**: ClimateStudio provides drop-down menus with preset values for solstices, equinoxes, and design times of 9am, 12pm, and 3pm. This reduces cognitive load significantly.

### 2.3 Real-Time Feedback Loop

| Feedback Type              | What It Shows                               | When to Update         |
| -------------------------- | ------------------------------------------- | ---------------------- |
| **Sun Position Indicator** | Yellow disc/icon in 3D scene                | Every time change      |
| **Shadow Movement**        | Ground shadows shift smoothly               | Continuous during drag |
| **Time Display Overlay**   | Current selected time prominently shown     | Always visible         |
| **Sun Altitude/Azimuth**   | Numeric values (e.g., "Alt: 45°, Az: 180°") | On time change         |

### 2.4 Animation Controls

| Control               | Function                     | User Benefit              |
| --------------------- | ---------------------------- | ------------------------- |
| **Play/Pause**        | Toggle animation             | Core playback control     |
| **Speed Control**     | 1x, 2x, 4x, 8x options       | Match different use cases |
| **Loop Toggle**       | Repeat sunrise-to-sunset     | Continuous observation    |
| **Step Forward/Back** | +/- 15 min or 1 hour buttons | Precise positioning       |

Per ArcGIS daylight simulation, users need to drag the time slider and click animate buttons to watch sun position across different months.

---

## Part 3: Advanced Enhancements (Impressive Additions)

### 3.1 Intelligent Presets

**Time Presets**:

- "Morning Sun Check" — 9:00 AM
- "Solar Noon" — Auto-calculated peak altitude
- "Afternoon Heat" — 3:00 PM (peak thermal load)
- "Golden Hour Start" — Auto-calculated
- "Just Before Sunset" — 30 min before calculated sunset

**Date Presets**:

- Summer Solstice (longest day, highest sun)
- Winter Solstice (shortest day, lowest sun)
- Spring Equinox (equal day/night)
- Autumn Equinox
- "Worst Case Shadow" — Date of longest shadows for the location
- "Today" — Current date

**Rationale**: Presets communicate that the tool understands architectural analysis contexts, building user confidence.

### 3.2 Comparison Mode

| Mode                     | Description                       | Use Case                      |
| ------------------------ | --------------------------------- | ----------------------------- |
| **Morning vs Afternoon** | Split view: 9 AM left, 3 PM right | East/west facade comparison   |
| **Summer vs Winter**     | Same time, different solstices    | Seasonal shadow impact        |
| **Before vs After**      | With/without proposed building    | Development impact assessment |
| **Time-Lapse Strip**     | 4-6 thumbnails across the day     | Quick daily pattern overview  |

Per Smashing Magazine's comparison table design, side-by-side layouts with toggle controls help users quickly spot differences.

### 3.3 Visual Timeline Enhancements

```
┌─────────────────────────────────────────────────────────────────┐
│  ○ Dawn     ◐ Morning     ● Noon     ◑ Afternoon     ○ Dusk   │
│  5:32       ██████████████████████████████████████       19:45  │
│  ▲                        ▲ Current: 14:30                      │
│  Sunrise                  ├── Golden Hour: 18:15 ──┤   Sunset  │
└─────────────────────────────────────────────────────────────────┘
```

**Elements**:

- Color gradient from blue (dawn) through yellow (noon) to orange (dusk)
- Marked zones for "peak sun hours" (10 AM–4 PM typical)
- Twilight zones (civil, nautical) shown as gradients
- Sun path arc icon that moves with slider

### 3.4 Date Range Selection

Instead of single-date selection, offer:

- **Daily Analysis**: Single date (default)
- **Weekly Pattern**: Mon–Sun at same time
- **Seasonal Range**: e.g., "Dec 1 – Feb 28" for winter analysis
- **Annual Summary**: Key metrics across all 12 months

### 3.5 Micro-interactions and Delight

| Interaction         | Effect                                | Psychological Impact         |
| ------------------- | ------------------------------------- | ---------------------------- |
| Slider hover        | Show exact time tooltip               | Precision without clutter    |
| Drag beyond sunrise | Subtle resistance or snap-back        | Teaches boundaries naturally |
| Animation complete  | Gentle notification                   | Closure confirmation         |
| Season preset click | Scene subtly shifts color temperature | Reinforces seasonal context  |

---

## Part 4: Microcopy and Guidance

### Contextual Explanations

Place brief explanations near controls:

| Location           | Microcopy                                                         |
| ------------------ | ----------------------------------------------------------------- |
| Time slider label  | "Drag to see shadow movement throughout the day"                  |
| Seasonal preset    | "Winter Solstice — Longest shadows, lowest sun angle"             |
| Animation speed    | "Faster = overview · Slower = detailed observation"               |
| Empty night period | "Sun is below horizon. Select daytime hours for shadow analysis." |

### Legend and Visual Annotations

During time changes, the 3D view should display:

- **Sun direction arrow** — Points from sun toward scene center
- **Shadow direction indicator** — Arrow on ground showing cast direction
- **Time stamp overlay** — Persistent "June 21, 2:30 PM" in corner
- **Sun altitude indicator** — "Sun angle: 68° above horizon"

---

## Part 5: Accessibility Requirements

Per WCAG 2.1.1 Keyboard and WebAIM:

| Requirement                | Implementation                                                      |
| -------------------------- | ------------------------------------------------------------------- |
| **Keyboard navigation**    | Arrow keys adjust time (Left/Right: ±15 min, Shift+Arrow: ±1 hr)    |
| **Focus indicators**       | Clear visible outline on focused controls                           |
| **Screen reader labels**   | "Time slider, current value: 2:30 PM"                               |
| **Play/pause alternative** | Spacebar toggles animation                                          |
| **Reduced motion option**  | Respects `prefers-reduced-motion` for animations                    |
| **Color + text pairing**   | Never rely on color alone (e.g., "Golden Hour" label + orange tint) |

---

## Part 6: What NOT to Include

| Avoid                                       | Reason                                                          |
| ------------------------------------------- | --------------------------------------------------------------- |
| **Seconds precision**                       | False precision for conceptual analysis; minutes are sufficient |
| **Complex time zone selectors**             | Auto-detect from location; manual override only if needed       |
| **Multiple simultaneous time sliders**      | Creates confusion; use comparison mode instead                  |
| **Astronomical twilight details**           | Too technical for early-stage analysis users                    |
| **Exact UTC offset display**                | Clutters interface; irrelevant for most users                   |
| **Historical date selection (pre-2000)**    | Unlikely use case; restricts to meaningful range                |
| **Temperature predictions**                 | Implies engineering accuracy beyond conceptual scope            |
| **Hourly graphs without clear explanation** | Can be misinterpreted as precise data                           |

---

## Part 7: How These Controls Help Users Understand Sunlight

| User Question                                   | Control/Feature That Answers It                             |
| ----------------------------------------------- | ----------------------------------------------------------- |
| "When does my balcony get sun?"                 | Time slider + real-time shadow feedback                     |
| "Is winter sun still adequate?"                 | Seasonal presets + comparison mode                          |
| "What's the worst-case shadow on my plot?"      | "Longest Shadow" date preset                                |
| "How long is this spot in shade?"               | Animation across full day + metrics overlay                 |
| "When does the heat become uncomfortable?"      | Peak hours zone on timeline (10 AM–4 PM highlight)          |
| "Is morning or afternoon better for this room?" | Morning vs Afternoon comparison mode                        |
| "How does the proposed tower affect my light?"  | Before/After comparison toggle                              |
| "Can I trust this simulation?"                  | Visible sun position, sunrise/sunset validation, disclaimer |

---

## Part 8: Prioritized Implementation Roadmap

### Phase 1: Foundation (Essential Trust)

1. Time slider with sunrise/sunset markers
2. Date picker with Today button
3. Real-time shadow response during drag
4. Time/date overlay on 3D view
5. Play/pause animation

### Phase 2: Professional Polish

6. Seasonal presets (solstices, equinoxes)
7. Time presets (9 AM, noon, 3 PM, golden hour)
8. Speed controls for animation
9. Sun position indicator in 3D
10. Microcopy guidance

### Phase 3: Advanced Delight

11. Morning vs Afternoon comparison
12. Summer vs Winter comparison
13. Time-lapse thumbnail strip
14. Visual timeline with phase zones
15. Date range analysis mode

---

## Summary

Effective Time & Date Controls transform sunlight analysis from a technical exercise into an **intuitive exploration**. The key principles:

1. **Immediate feedback** — Shadows move as users drag
2. **Meaningful presets** — Reduce cognitive load with smart defaults
3. **Visual context** — Show sunrise/sunset boundaries, sun position
4. **Comparison power** — Let users see morning vs afternoon, summer vs winter
5. **Honest communication** — Microcopy and disclaimers prevent misinterpretation

The goal is not to impress users with complexity, but to make them feel **confident** that they understand how sunlight behaves at their location—and that the tool is trustworthy enough to inform real decisions.

---

## Sources

- [Shadowmap](https://shadowmap.org/) — 3D sunlight & shadow analysis
- [SunCalc](https://suncalc.net/) — Sun position calculator
- [Andrew Marsh Sun-Path Tools](https://andrewmarsh.com/apps/releases/sunpath2d.html) — Academic sun path visualizers
- [ClimateStudio Documentation](https://climatestudiodocs.com/) — Professional daylight simulation
- [GH Climate Studio Lab Notes](https://blogs.uoregon.edu/222s22/lab-notes/gh-climate-studio/) — Preset design patterns
- [Sunlitt App](https://screensdesign.com/showcase/sun-position-and-path-sunlitt) — Mobile UX patterns
- [Sun Tracker AR](https://suntracker.app/) — Augmented reality sun visualization
- [ArcGIS Daylight Simulation](https://learn.arcgis.com/en/projects/simulate-daylight-and-weather/) — Animation controls
- [WCAG 2.1.1 Keyboard](https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html) — Accessibility requirements
- [WebAIM Keyboard Accessibility](https://webaim.org/techniques/keyboard/) — Keyboard navigation patterns
- [Smashing Magazine Comparison Tables](https://www.smashingmagazine.com/2017/08/designing-perfect-feature-comparison-table/) — Comparison UX patterns
