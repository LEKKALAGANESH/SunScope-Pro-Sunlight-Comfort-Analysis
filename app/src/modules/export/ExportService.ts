// Lazy load heavy dependencies for better code splitting
// These are only loaded when the user actually exports

import type { AnalysisResults, Building, SiteConfig, Scenario } from '../../types';
import type jsPDF from 'jspdf';

// Lazy load jsPDF
async function loadJsPDF() {
  const { default: jsPDF } = await import('jspdf');
  return jsPDF;
}

// Lazy load html2canvas
async function loadHtml2Canvas() {
  const { default: html2canvas } = await import('html2canvas');
  return html2canvas;
}

// Lazy load file-saver
async function loadFileSaver() {
  const { saveAs } = await import('file-saver');
  return saveAs;
}

export interface ExportOptions {
  results: AnalysisResults;
  building?: Building;
  site: SiteConfig;
  scenario?: Scenario;
  chartElement?: HTMLElement | null;
  viewerSnapshot?: string | null; // Base64 data URL of 3D view
  sunPosition?: {
    altitude: number;
    azimuth: number;
    isAboveHorizon: boolean;
  } | null;
  currentTime?: Date | null;
}

// Format time helper
function formatTime(date: Date | null): string {
  if (!date) return '--:--';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Format date helper
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generate and download PDF report
 */
export async function exportToPDF(options: ExportOptions): Promise<void> {
  const { results, building, site, scenario, viewerSnapshot, sunPosition, currentTime } = options;

  // Lazy load jsPDF
  const jsPDF = await loadJsPDF();
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Helper to add new page if needed
  const checkNewPage = (neededHeight: number) => {
    if (yPos + neededHeight > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // ========== HEADER ==========
  pdf.setFillColor(251, 191, 36); // Amber-400
  pdf.rect(0, 0, pageWidth, 35, 'F');

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SunScope Pro', margin, 18);

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sunlight & Comfort Analysis Report', margin, 28);

  yPos = 45;

  // ========== PROJECT INFO ==========
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);

  const locationText = site.location.city
    ? `${site.location.city} (${site.location.latitude.toFixed(4)}, ${site.location.longitude.toFixed(4)})`
    : `${site.location.latitude.toFixed(4)}, ${site.location.longitude.toFixed(4)}`;

  pdf.text(`Location: ${locationText}`, margin, yPos);
  pdf.text(`Date: ${formatDate(results.date)}`, pageWidth / 2, yPos);
  yPos += 6;

  if (building) {
    pdf.text(`Building: ${building.name}`, margin, yPos);
    pdf.text(`Floors: ${building.floors} (${building.totalHeight}m total)`, pageWidth / 2, yPos);
    yPos += 6;
  }

  if (results.floor) {
    pdf.text(`Analyzed Floor: ${results.floor}`, margin, yPos);
    yPos += 6;
  }

  pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
  yPos += 10;

  // ========== 3D VIEW SNAPSHOT ==========
  if (viewerSnapshot) {
    checkNewPage(100);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('3D View with Shadows', margin, yPos);
    yPos += 5;

    try {
      // Add the 3D snapshot image
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = imgWidth * 0.6; // Aspect ratio

      // Draw image border
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(margin - 1, yPos - 1, imgWidth + 2, imgHeight + 2, 'S');

      pdf.addImage(viewerSnapshot, 'PNG', margin, yPos, imgWidth, imgHeight);

      // North Arrow indicator (top-left of image)
      pdf.setFillColor(0, 0, 0);
      pdf.setTextColor(255, 255, 255);
      pdf.rect(margin + 2, yPos + 2, 18, 14, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(204, 0, 0); // Red for North
      pdf.text('▲ N', margin + 5, yPos + 10);

      // Time stamp overlay (top-right of image)
      if (currentTime) {
        const timeText = currentTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        pdf.setFillColor(0, 0, 0);
        pdf.rect(margin + imgWidth - 35, yPos + 2, 33, 14, 'F');
        pdf.setTextColor(255, 200, 50); // Amber
        pdf.setFontSize(9);
        pdf.text(timeText, margin + imgWidth - 32, yPos + 10);
      }

      // Sun position info (bottom-right of image)
      if (sunPosition && sunPosition.isAboveHorizon) {
        const sunInfoWidth = 55;
        const sunInfoHeight = 18;
        pdf.setFillColor(40, 40, 40);
        pdf.rect(
          margin + imgWidth - sunInfoWidth - 2,
          yPos + imgHeight - sunInfoHeight - 2,
          sunInfoWidth,
          sunInfoHeight,
          'F'
        );

        pdf.setFontSize(7);
        pdf.setTextColor(255, 200, 50);
        pdf.text(`Alt: ${sunPosition.altitude.toFixed(1)}deg`, margin + imgWidth - sunInfoWidth, yPos + imgHeight - 10);
        pdf.setTextColor(100, 180, 255);
        pdf.text(`Az: ${sunPosition.azimuth.toFixed(1)}deg`, margin + imgWidth - sunInfoWidth, yPos + imgHeight - 4);
      }

      yPos += imgHeight + 5;

      // Caption and legend
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Shadow visualization for ${formatDate(results.date)}`, margin, yPos);

      // Legend
      yPos += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);

      // Sun legend
      pdf.setFillColor(255, 221, 0);
      pdf.circle(margin + 3, yPos - 1, 2, 'F');
      pdf.setTextColor(80, 80, 80);
      pdf.text('Sun Position', margin + 7, yPos);

      // Shadow legend
      pdf.setFillColor(100, 100, 100);
      pdf.rect(margin + 40, yPos - 3, 6, 4, 'F');
      pdf.text('Shadow', margin + 48, yPos);

      // Building legend
      pdf.setFillColor(59, 130, 246);
      pdf.rect(margin + 75, yPos - 3, 6, 4, 'F');
      pdf.text('Buildings', margin + 83, yPos);

      // North indicator legend
      pdf.setTextColor(204, 0, 0);
      pdf.text('▲', margin + 115, yPos);
      pdf.setTextColor(80, 80, 80);
      pdf.text('North', margin + 120, yPos);

      yPos += 10;
    } catch {
      // Skip 3D snapshot if it fails
    }
  }

  yPos += 5;

  // ========== EXECUTIVE SUMMARY DASHBOARD ==========
  // Summary box with key highlights
  const summaryBoxHeight = 28;
  pdf.setFillColor(245, 245, 250);
  pdf.setDrawColor(200, 200, 210);
  pdf.roundedRect(margin, yPos, pageWidth - margin * 2, summaryBoxHeight, 3, 3, 'FD');

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(80, 80, 80);
  pdf.text('SUMMARY', margin + 4, yPos + 6);

  // Key stats in summary row
  const summaryY = yPos + 14;
  const summaryColWidth = (pageWidth - margin * 2) / 4;

  // Total Sun Hours
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(217, 119, 6); // Amber-600
  pdf.text(`${results.sunlight.totalHours.toFixed(1)}`, margin + summaryColWidth * 0.5, summaryY, { align: 'center' });
  pdf.setFontSize(7);
  pdf.setTextColor(100, 100, 100);
  pdf.text('SUN HOURS', margin + summaryColWidth * 0.5, summaryY + 6, { align: 'center' });

  // Peak Irradiance
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(239, 68, 68); // Red-500
  pdf.text(`${results.solar.peakIrradiance.toFixed(0)}`, margin + summaryColWidth * 1.5, summaryY, { align: 'center' });
  pdf.setFontSize(7);
  pdf.setTextColor(100, 100, 100);
  pdf.text('PEAK W/m²', margin + summaryColWidth * 1.5, summaryY + 6, { align: 'center' });

  // Comfort Score with color
  const comfortScoreColor = results.comfort.riskLevel === 'low'
    ? [34, 197, 94] // Green
    : results.comfort.riskLevel === 'medium'
    ? [251, 191, 36] // Amber
    : [239, 68, 68]; // Red
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(comfortScoreColor[0], comfortScoreColor[1], comfortScoreColor[2]);
  pdf.text(`${results.comfort.score}`, margin + summaryColWidth * 2.5, summaryY, { align: 'center' });
  pdf.setFontSize(7);
  pdf.setTextColor(100, 100, 100);
  pdf.text('COMFORT', margin + summaryColWidth * 2.5, summaryY + 6, { align: 'center' });

  // Risk Level
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(comfortScoreColor[0], comfortScoreColor[1], comfortScoreColor[2]);
  pdf.text(results.comfort.riskLevel.toUpperCase(), margin + summaryColWidth * 3.5, summaryY, { align: 'center' });
  pdf.setFontSize(7);
  pdf.setTextColor(100, 100, 100);
  pdf.text('RISK LEVEL', margin + summaryColWidth * 3.5, summaryY + 6, { align: 'center' });

  yPos += summaryBoxHeight + 10;

  // ========== SUN TIMELINE VISUALIZATION ==========
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60, 60, 60);
  pdf.text('Daily Sun Timeline', margin, yPos);
  yPos += 6;

  // Draw 24-hour timeline
  const timelineWidth = pageWidth - margin * 2;
  const timelineHeight = 16;
  const hourWidth = timelineWidth / 24;

  // Background
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, yPos, timelineWidth, timelineHeight, 'F');

  // Mark daylight hours
  const firstHour = results.sunlight.firstSunTime ? results.sunlight.firstSunTime.getHours() + results.sunlight.firstSunTime.getMinutes() / 60 : 6;
  const lastHour = results.sunlight.lastSunTime ? results.sunlight.lastSunTime.getHours() + results.sunlight.lastSunTime.getMinutes() / 60 : 18;

  // Daylight portion
  pdf.setFillColor(255, 236, 179); // Amber-100
  pdf.rect(margin + firstHour * hourWidth, yPos, (lastHour - firstHour) * hourWidth, timelineHeight, 'F');

  // Direct sun hours (based on hourly data)
  results.hourlyData.forEach(data => {
    if (!data.inShadow && data.irradiance > 50) {
      pdf.setFillColor(251, 191, 36); // Amber-400
      pdf.rect(margin + data.hour * hourWidth, yPos, hourWidth, timelineHeight, 'F');
    }
  });

  // Hour markers
  pdf.setFontSize(6);
  pdf.setTextColor(120, 120, 120);
  [0, 6, 12, 18, 24].forEach(hour => {
    pdf.text(String(hour), margin + hour * hourWidth, yPos + timelineHeight + 4, { align: 'center' });
  });

  // Sunrise/sunset markers
  if (results.sunlight.firstSunTime) {
    pdf.setTextColor(255, 102, 0);
    pdf.text('↑', margin + firstHour * hourWidth, yPos + timelineHeight / 2 + 2, { align: 'center' });
  }
  if (results.sunlight.lastSunTime) {
    pdf.setTextColor(255, 51, 0);
    pdf.text('↓', margin + lastHour * hourWidth, yPos + timelineHeight / 2 + 2, { align: 'center' });
  }

  yPos += timelineHeight + 12;

  // ========== KEY METRICS SECTION ==========
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Key Metrics', margin, yPos);
  yPos += 8;

  // Draw metrics boxes
  const boxWidth = (pageWidth - margin * 2 - 10) / 3;
  const boxHeight = 45;

  // Sunlight Timing Box
  drawMetricBox(pdf, margin, yPos, boxWidth, boxHeight, 'Sunlight Timing', [
    { label: 'First Sun', value: formatTime(results.sunlight.firstSunTime) },
    { label: 'Last Sun', value: formatTime(results.sunlight.lastSunTime) },
    { label: 'Total Hours', value: `${results.sunlight.totalHours.toFixed(1)} hrs`, highlight: true },
    { label: 'Direct Sun', value: `${results.sunlight.directHours.toFixed(1)} hrs` },
  ]);

  // Heat Impact Box
  drawMetricBox(pdf, margin + boxWidth + 5, yPos, boxWidth, boxHeight, 'Heat Impact', [
    { label: 'Peak Irradiance', value: `${results.solar.peakIrradiance.toFixed(0)} W/m²` },
    { label: 'Peak Time', value: formatTime(results.solar.peakTime) },
    { label: 'Daily Total', value: `${results.solar.dailyIrradiation.toFixed(0)} Wh/m²` },
    { label: 'Risk Level', value: results.comfort.riskLevel.toUpperCase(), highlight: true },
  ]);

  // Comfort Score Box
  const comfortColor = results.comfort.riskLevel === 'low'
    ? [34, 197, 94] // Green
    : results.comfort.riskLevel === 'medium'
    ? [251, 191, 36] // Amber
    : [239, 68, 68]; // Red

  drawComfortBox(pdf, margin + boxWidth * 2 + 10, yPos, boxWidth, boxHeight,
    results.comfort.score, results.comfort.riskLevel, comfortColor as [number, number, number]);

  yPos += boxHeight + 15;

  // ========== RECOMMENDATIONS SECTION ==========
  checkNewPage(60);

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Daily Recommendations', margin, yPos);
  yPos += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);

  results.comfort.recommendations.forEach((rec, index) => {
    checkNewPage(8);

    // Bullet point
    pdf.setFillColor(251, 191, 36);
    pdf.circle(margin + 3, yPos - 2, 2, 'F');

    // Wrap text if needed
    const maxWidth = pageWidth - margin * 2 - 10;
    const lines = pdf.splitTextToSize(`${index + 1}. ${rec}`, maxWidth);
    pdf.text(lines, margin + 8, yPos);
    yPos += lines.length * 5 + 3;
  });

  yPos += 10;

  // ========== HOURLY DATA CHART ==========
  checkNewPage(90);

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Hourly Sun Exposure', margin, yPos);
  yPos += 10;

  // Draw bar chart with Y-axis
  const chartWidth = pageWidth - margin * 2 - 15; // Leave space for Y-axis
  const chartHeight = 55;
  const chartLeftMargin = margin + 15; // Space for Y-axis labels
  const barCount = Math.min(results.hourlyData.length, 16);
  const barWidth = (chartWidth - 10) / barCount;
  const maxIrradiance = Math.max(...results.hourlyData.map(d => d.irradiance), 100);

  // Chart background with border
  pdf.setFillColor(252, 252, 252);
  pdf.setDrawColor(220, 220, 220);
  pdf.rect(chartLeftMargin, yPos, chartWidth, chartHeight, 'FD');

  // Y-axis labels and grid lines
  pdf.setFontSize(6);
  pdf.setTextColor(120, 120, 120);
  const yAxisSteps = [0, 250, 500, 750, 1000];
  yAxisSteps.forEach(value => {
    if (value <= maxIrradiance || value === 0) {
      const yAxisPos = yPos + chartHeight - 8 - ((value / maxIrradiance) * (chartHeight - 15));
      pdf.text(`${value}`, chartLeftMargin - 3, yAxisPos + 2, { align: 'right' });

      // Grid line
      if (value > 0) {
        pdf.setDrawColor(230, 230, 230);
        pdf.line(chartLeftMargin, yAxisPos, chartLeftMargin + chartWidth, yAxisPos);
      }
    }
  });

  // Y-axis title
  pdf.setFontSize(7);
  pdf.setTextColor(100, 100, 100);
  pdf.text('W/m²', margin, yPos + chartHeight / 2, { angle: 90 });

  // Draw bars
  results.hourlyData.slice(0, barCount).forEach((data, index) => {
    const barHeight = (data.irradiance / maxIrradiance) * (chartHeight - 15);
    const x = chartLeftMargin + 5 + index * barWidth;
    const y = yPos + chartHeight - 8 - barHeight;

    // Bar color based on shadow
    if (data.inShadow) {
      pdf.setFillColor(180, 180, 180);
    } else if (data.irradiance > 800) {
      pdf.setFillColor(239, 68, 68); // High intensity - red
    } else if (data.irradiance > 500) {
      pdf.setFillColor(251, 146, 60); // Medium-high - orange
    } else {
      pdf.setFillColor(251, 191, 36); // Normal - amber
    }

    pdf.rect(x, y, barWidth - 2, barHeight, 'F');

    // Hour label
    pdf.setFontSize(6);
    pdf.setTextColor(100, 100, 100);
    pdf.text(String(data.hour).padStart(2, '0'), x + (barWidth - 2) / 2, yPos + chartHeight - 1, { align: 'center' });
  });

  yPos += chartHeight + 5;

  // Enhanced legend
  pdf.setFontSize(7);
  pdf.setTextColor(80, 80, 80);

  pdf.setFillColor(251, 191, 36);
  pdf.rect(margin, yPos, 8, 4, 'F');
  pdf.text('Direct Sun (<500 W/m²)', margin + 10, yPos + 3);

  pdf.setFillColor(251, 146, 60);
  pdf.rect(margin + 55, yPos, 8, 4, 'F');
  pdf.text('Medium (500-800 W/m²)', margin + 65, yPos + 3);

  pdf.setFillColor(239, 68, 68);
  pdf.rect(margin + 115, yPos, 8, 4, 'F');
  pdf.text('High (>800 W/m²)', margin + 125, yPos + 3);

  pdf.setFillColor(180, 180, 180);
  pdf.rect(margin + 160, yPos, 8, 4, 'F');
  pdf.text('Shadow', margin + 170, yPos + 3);

  yPos += 15;

  // ========== SCENARIO SETTINGS ==========
  if (scenario) {
    checkNewPage(40);

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Scenario Settings', margin, yPos);
    yPos += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);

    pdf.text(`Windows: ${scenario.window.state}`, margin, yPos);
    pdf.text(`Glazing: ${scenario.glazing.type}`, margin + 60, yPos);
    pdf.text(`Shading: ${scenario.shading.interior}`, margin + 120, yPos);
    yPos += 15;
  }

  // ========== HOURLY DATA TABLE ==========
  checkNewPage(80);

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Detailed Hourly Data', margin, yPos);
  yPos += 8;

  // Table header
  const colWidths = [20, 35, 35, 35, 35, 30];
  const headers = ['Hour', 'Sun Alt.', 'Sun Azim.', 'Irradiance', 'Shadow %', 'Status'];

  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, yPos, pageWidth - margin * 2, 7, 'F');

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60, 60, 60);

  let xPos = margin + 2;
  headers.forEach((header, i) => {
    pdf.text(header, xPos, yPos + 5);
    xPos += colWidths[i];
  });
  yPos += 9;

  // Table rows
  pdf.setFont('helvetica', 'normal');
  results.hourlyData.forEach((data, index) => {
    if (checkNewPage(7)) {
      // Re-draw header on new page
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, yPos, pageWidth - margin * 2, 7, 'F');
      pdf.setFont('helvetica', 'bold');
      xPos = margin + 2;
      headers.forEach((header, i) => {
        pdf.text(header, xPos, yPos + 5);
        xPos += colWidths[i];
      });
      yPos += 9;
      pdf.setFont('helvetica', 'normal');
    }

    // Alternate row background
    if (index % 2 === 0) {
      pdf.setFillColor(252, 252, 252);
      pdf.rect(margin, yPos - 1, pageWidth - margin * 2, 6, 'F');
    }

    xPos = margin + 2;
    pdf.setTextColor(60, 60, 60);
    pdf.text(String(data.hour), xPos, yPos + 4);
    xPos += colWidths[0];
    pdf.text(`${data.sunAltitude.toFixed(1)}°`, xPos, yPos + 4);
    xPos += colWidths[1];
    pdf.text(`${data.sunAzimuth.toFixed(1)}°`, xPos, yPos + 4);
    xPos += colWidths[2];
    pdf.text(`${data.irradiance.toFixed(0)} W/m²`, xPos, yPos + 4);
    xPos += colWidths[3];
    pdf.text(`${(data.shadowPercent * 100).toFixed(0)}%`, xPos, yPos + 4);
    xPos += colWidths[4];
    pdf.text(data.inShadow ? 'Shadow' : 'Sun', xPos, yPos + 4);

    yPos += 6;
  });

  yPos += 10;

  // ========== DISCLAIMER ==========
  checkNewPage(30);

  pdf.setFillColor(255, 251, 235); // Amber-50
  pdf.rect(margin, yPos, pageWidth - margin * 2, 25, 'F');
  pdf.setDrawColor(251, 191, 36);
  pdf.rect(margin, yPos, pageWidth - margin * 2, 25, 'S');

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(146, 64, 14); // Amber-800
  pdf.text('Disclaimer', margin + 3, yPos + 6);

  pdf.setFont('helvetica', 'normal');
  const disclaimer = 'These results are estimates based on clear-sky conditions and simplified assumptions. Actual sunlight exposure may vary due to weather, obstructions, and atmospheric conditions. For detailed engineering analysis, consult a qualified professional.';
  const disclaimerLines = pdf.splitTextToSize(disclaimer, pageWidth - margin * 2 - 6);
  pdf.text(disclaimerLines, margin + 3, yPos + 12);

  // ========== FOOTER ==========
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Generated by SunScope Pro | Page ${i} of ${totalPages}`,
      pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  // Save
  const filename = `sunlight-analysis-${results.date.toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}

// Helper to draw metric box
function drawMetricBox(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  metrics: Array<{ label: string; value: string; highlight?: boolean }>
) {
  // Box background
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(x, y, width, height, 2, 2, 'FD');

  // Title
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 100, 100);
  pdf.text(title, x + 3, y + 7);

  // Metrics
  pdf.setFontSize(9);
  let metricY = y + 15;
  metrics.forEach(metric => {
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(metric.label, x + 3, metricY);

    pdf.setFont('helvetica', 'bold');
    if (metric.highlight) {
      pdf.setTextColor(217, 119, 6); // Amber-600
    } else {
      pdf.setTextColor(30, 30, 30);
    }
    pdf.text(metric.value, x + width - 3, metricY, { align: 'right' });

    metricY += 7;
  });
}

// Helper to draw comfort score box
function drawComfortBox(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  score: number,
  riskLevel: string,
  color: [number, number, number]
) {
  // Box background
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(x, y, width, height, 2, 2, 'FD');

  // Title
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Comfort Level', x + 3, y + 7);

  // Score circle
  const circleX = x + width / 2;
  const circleY = y + height / 2 + 5;
  const radius = 12;

  pdf.setFillColor(color[0], color[1], color[2]);
  pdf.circle(circleX, circleY, radius, 'F');

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text(String(score), circleX, circleY + 4, { align: 'center' });

  // Risk label
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  const riskText = riskLevel === 'low' ? 'Good comfort'
    : riskLevel === 'medium' ? 'Moderate risk'
    : 'High risk';
  pdf.text(riskText, circleX, circleY + radius + 6, { align: 'center' });
}

/**
 * Generate and download CSV data
 */
export async function exportToCSV(options: ExportOptions): Promise<void> {
  const { results, building, site } = options;

  // Build CSV content
  const lines: string[] = [];

  // Header section
  lines.push('# SunScope Pro - Sunlight Analysis Report');
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push(`# Location: ${site.location.city || ''} (${site.location.latitude}, ${site.location.longitude})`);
  lines.push(`# Date: ${results.date.toISOString().split('T')[0]}`);
  if (building) {
    lines.push(`# Building: ${building.name}`);
    lines.push(`# Floors: ${building.floors}`);
    lines.push(`# Height: ${building.totalHeight}m`);
  }
  lines.push('');

  // Summary metrics
  lines.push('# Summary Metrics');
  lines.push('Metric,Value,Unit');
  lines.push(`First Sun Time,${formatTime(results.sunlight.firstSunTime)},`);
  lines.push(`Last Sun Time,${formatTime(results.sunlight.lastSunTime)},`);
  lines.push(`Total Sun Hours,${results.sunlight.totalHours.toFixed(2)},hours`);
  lines.push(`Direct Sun Hours,${results.sunlight.directHours.toFixed(2)},hours`);
  lines.push(`Peak Irradiance,${results.solar.peakIrradiance.toFixed(0)},W/m²`);
  lines.push(`Peak Time,${formatTime(results.solar.peakTime)},`);
  lines.push(`Daily Irradiation,${results.solar.dailyIrradiation.toFixed(0)},Wh/m²`);
  lines.push(`Comfort Score,${results.comfort.score},/100`);
  lines.push(`Risk Level,${results.comfort.riskLevel},`);
  lines.push('');

  // Hourly data
  lines.push('# Hourly Data');
  lines.push('Hour,Time,Sun Altitude (deg),Sun Azimuth (deg),In Shadow,Shadow Percent,Irradiance (W/m²)');

  results.hourlyData.forEach((d) => {
    lines.push([
      d.hour,
      d.time.toISOString(),
      d.sunAltitude.toFixed(2),
      d.sunAzimuth.toFixed(2),
      d.inShadow ? 'Yes' : 'No',
      (d.shadowPercent * 100).toFixed(1),
      d.irradiance.toFixed(0),
    ].join(','));
  });

  lines.push('');

  // Recommendations
  lines.push('# Recommendations');
  results.comfort.recommendations.forEach((rec, i) => {
    lines.push(`${i + 1},"${rec.replace(/"/g, '""')}"`);
  });

  // Create and download
  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const filename = `sunlight-analysis-${results.date.toISOString().split('T')[0]}.csv`;
  const saveAs = await loadFileSaver();
  saveAs(blob, filename);
}

/**
 * Generate and download JSON data
 */
export async function exportToJSON(options: ExportOptions): Promise<void> {
  const { results, building, site, scenario } = options;

  const exportData = {
    meta: {
      generator: 'SunScope Pro',
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
    },
    location: {
      city: site.location.city,
      latitude: site.location.latitude,
      longitude: site.location.longitude,
      timezone: site.location.timezone,
    },
    building: building ? {
      name: building.name,
      floors: building.floors,
      floorHeight: building.floorHeight,
      totalHeight: building.totalHeight,
      area: building.area,
    } : null,
    analysisDate: results.date.toISOString(),
    analyzedFloor: results.floor || null,
    sunlight: {
      firstSunTime: results.sunlight.firstSunTime?.toISOString() || null,
      lastSunTime: results.sunlight.lastSunTime?.toISOString() || null,
      totalHours: results.sunlight.totalHours,
      directHours: results.sunlight.directHours,
      continuousBlocks: results.sunlight.continuousBlocks.map(block => ({
        start: block.start.toISOString(),
        end: block.end.toISOString(),
        durationMinutes: block.durationMinutes,
      })),
    },
    solar: {
      peakIrradiance: results.solar.peakIrradiance,
      peakTime: results.solar.peakTime?.toISOString() || null,
      dailyIrradiation: results.solar.dailyIrradiation,
    },
    comfort: {
      score: results.comfort.score,
      riskLevel: results.comfort.riskLevel,
      peakHeatPeriod: results.comfort.peakHeatPeriod ? {
        start: results.comfort.peakHeatPeriod.start.toISOString(),
        end: results.comfort.peakHeatPeriod.end.toISOString(),
        durationMinutes: results.comfort.peakHeatPeriod.durationMinutes,
      } : null,
      recommendations: results.comfort.recommendations,
    },
    hourlyData: results.hourlyData.map(d => ({
      hour: d.hour,
      time: d.time.toISOString(),
      sunAltitude: d.sunAltitude,
      sunAzimuth: d.sunAzimuth,
      inShadow: d.inShadow,
      shadowPercent: d.shadowPercent,
      irradiance: d.irradiance,
    })),
    scenario: scenario ? {
      name: scenario.name,
      window: scenario.window,
      glazing: scenario.glazing,
      shading: scenario.shading,
    } : null,
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const filename = `sunlight-analysis-${results.date.toISOString().split('T')[0]}.json`;
  const saveAs = await loadFileSaver();
  saveAs(blob, filename);
}

/**
 * Export PNG - prefers 3D view snapshot, falls back to element capture
 */
export async function exportToPNG(
  elementOrSnapshot: HTMLElement | string | null,
  filename?: string
): Promise<void> {
  const name = filename || `sunlight-analysis-3d-${new Date().toISOString().split('T')[0]}.png`;
  const saveAs = await loadFileSaver();

  // If it's a base64 data URL (3D snapshot), convert directly
  if (typeof elementOrSnapshot === 'string' && elementOrSnapshot.startsWith('data:')) {
    const response = await fetch(elementOrSnapshot);
    const blob = await response.blob();
    saveAs(blob, name);
    return;
  }

  // If it's an HTML element, use html2canvas
  if (elementOrSnapshot instanceof HTMLElement) {
    const html2canvas = await loadHtml2Canvas();
    const canvas = await html2canvas(elementOrSnapshot, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher resolution
      logging: false,
      useCORS: true,
    });

    canvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, name);
      }
    }, 'image/png');
    return;
  }

  throw new Error('No valid source for PNG export');
}

/**
 * Export 3D scene to GLTF format
 */
export async function exportToGLTF(
  scene: THREE.Scene,
  filename?: string
): Promise<void> {
  // Dynamically import GLTFExporter and file-saver
  const [{ GLTFExporter }, saveAs] = await Promise.all([
    import('three/examples/jsm/exporters/GLTFExporter.js'),
    loadFileSaver(),
  ]);

  const exporter = new GLTFExporter();

  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (gltf) => {
        const output = JSON.stringify(gltf, null, 2);
        const blob = new Blob([output], { type: 'application/json' });
        const name = filename || `building-model-${new Date().toISOString().split('T')[0]}.gltf`;
        saveAs(blob, name);
        resolve();
      },
      (error) => {
        reject(error);
      },
      {
        binary: false,
        onlyVisible: true,
      }
    );
  });
}

// Import THREE types for GLTF export
import type * as THREE from 'three';
