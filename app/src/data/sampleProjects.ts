import type { Building, SiteConfig, ProjectImage } from '../types';

export interface SampleProject {
  id: string;
  name: string;
  description: string;
  location: string;
  buildings: Building[];
  site: SiteConfig;
  generateImage: () => string; // Function to generate canvas image
}

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

// Building color palette
const buildingColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

/**
 * Mumbai Residential Complex
 * 3 high-rise residential towers in tropical monsoon climate
 */
const mumbaiProject: SampleProject = {
  id: 'mumbai-residential',
  name: 'Mumbai Residential Complex',
  description: '3 high-rise residential towers with shared amenities',
  location: 'Mumbai, Maharashtra',
  site: {
    northAngle: 15, // Slightly rotated north
    scale: 0.5, // 0.5 meters per pixel
    location: {
      latitude: 19.076,
      longitude: 72.8777,
      timezone: 'Asia/Kolkata',
      city: 'Mumbai',
    },
  },
  buildings: [
    {
      id: generateId(),
      name: 'Tower A',
      footprint: [
        { x: 150, y: 200 },
        { x: 280, y: 200 },
        { x: 280, y: 380 },
        { x: 150, y: 380 },
      ],
      floors: 25,
      floorHeight: 3.0,
      baseElevation: 0,
      totalHeight: 75,
      area: 23400,
      color: buildingColors[0],
    },
    {
      id: generateId(),
      name: 'Tower B',
      footprint: [
        { x: 450, y: 150 },
        { x: 600, y: 150 },
        { x: 600, y: 400 },
        { x: 450, y: 400 },
      ],
      floors: 30,
      floorHeight: 3.0,
      baseElevation: 0,
      totalHeight: 90,
      area: 37500,
      color: buildingColors[1],
    },
    {
      id: generateId(),
      name: 'Tower C',
      footprint: [
        { x: 750, y: 220 },
        { x: 900, y: 220 },
        { x: 900, y: 420 },
        { x: 750, y: 420 },
      ],
      floors: 22,
      floorHeight: 3.0,
      baseElevation: 0,
      totalHeight: 66,
      area: 30000,
      color: buildingColors[2],
    },
  ],
  generateImage: () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900;
    const ctx = canvas.getContext('2d')!;

    // Background - light cream
    ctx.fillStyle = '#faf7f2';
    ctx.fillRect(0, 0, 1200, 900);

    // Grid pattern
    ctx.strokeStyle = '#e8e4df';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= 1200; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 900);
      ctx.stroke();
    }
    for (let y = 0; y <= 900; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1200, y);
      ctx.stroke();
    }

    // Green areas (gardens)
    ctx.fillStyle = '#c8e6c9';
    ctx.fillRect(100, 450, 300, 150);
    ctx.fillRect(700, 500, 200, 120);
    ctx.fillRect(320, 250, 100, 200);

    // Swimming pool
    ctx.fillStyle = '#81d4fa';
    ctx.fillRect(380, 550, 80, 40);
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 2;
    ctx.strokeRect(380, 550, 80, 40);

    // Roads
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(0, 650, 1200, 60);
    ctx.fillRect(350, 0, 50, 650);

    // Building footprints - Tower A
    ctx.fillStyle = '#e0e0e0';
    ctx.strokeStyle = '#757575';
    ctx.lineWidth = 2;
    ctx.fillRect(150, 200, 130, 180);
    ctx.strokeRect(150, 200, 130, 180);

    // Tower B (largest)
    ctx.fillRect(450, 150, 150, 250);
    ctx.strokeRect(450, 150, 150, 250);

    // Tower C
    ctx.fillRect(750, 220, 150, 200);
    ctx.strokeRect(750, 220, 150, 200);

    // Clubhouse
    ctx.fillStyle = '#d7ccc8';
    ctx.fillRect(550, 500, 100, 80);
    ctx.strokeRect(550, 500, 100, 80);

    // North arrow
    ctx.save();
    ctx.translate(1100, 100);
    ctx.rotate(15 * Math.PI / 180); // Rotated 15 degrees
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(-12, 10);
    ctx.lineTo(0, 0);
    ctx.lineTo(12, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('N', -5, -35);
    ctx.restore();

    // Scale bar
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(80, 820, 120, 4);
    ctx.fillRect(80, 815, 3, 14);
    ctx.fillRect(197, 815, 3, 14);
    ctx.font = '12px Arial';
    ctx.fillText('0', 75, 845);
    ctx.fillText('60m', 175, 845);

    // Labels
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#37474f';
    ctx.fillText('Tower A', 175, 295);
    ctx.fillText('Tower B', 490, 285);
    ctx.fillText('Tower C', 790, 325);
    ctx.font = '11px Arial';
    ctx.fillStyle = '#607d8b';
    ctx.fillText('(25 floors)', 180, 310);
    ctx.fillText('(30 floors)', 495, 300);
    ctx.fillText('(22 floors)', 795, 340);
    ctx.fillText('Clubhouse', 560, 545);
    ctx.fillText('Pool', 398, 575);
    ctx.fillText('Garden', 200, 530);

    // Title
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#1f2937';
    ctx.fillText('Mumbai Residential Complex', 80, 50);
    ctx.font = '12px Arial';
    ctx.fillStyle = '#607d8b';
    ctx.fillText('Sample Site Plan', 80, 70);

    return canvas.toDataURL('image/png');
  },
};

/**
 * Bangalore Tech Park
 * Modern office campus with multiple buildings
 */
const bangaloreProject: SampleProject = {
  id: 'bangalore-techpark',
  name: 'Bangalore Tech Park',
  description: 'Modern IT campus with 4 office buildings',
  location: 'Bangalore, Karnataka',
  site: {
    northAngle: 0,
    scale: 0.6,
    location: {
      latitude: 12.9716,
      longitude: 77.5946,
      timezone: 'Asia/Kolkata',
      city: 'Bangalore',
    },
  },
  buildings: [
    {
      id: generateId(),
      name: 'Block A',
      footprint: [
        { x: 100, y: 150 },
        { x: 300, y: 150 },
        { x: 300, y: 300 },
        { x: 100, y: 300 },
      ],
      floors: 8,
      floorHeight: 4.0,
      baseElevation: 0,
      totalHeight: 32,
      area: 30000,
      color: buildingColors[0],
    },
    {
      id: generateId(),
      name: 'Block B',
      footprint: [
        { x: 400, y: 150 },
        { x: 600, y: 150 },
        { x: 600, y: 300 },
        { x: 400, y: 300 },
      ],
      floors: 10,
      floorHeight: 4.0,
      baseElevation: 0,
      totalHeight: 40,
      area: 30000,
      color: buildingColors[1],
    },
    {
      id: generateId(),
      name: 'Block C',
      footprint: [
        { x: 100, y: 400 },
        { x: 300, y: 400 },
        { x: 300, y: 550 },
        { x: 100, y: 550 },
      ],
      floors: 6,
      floorHeight: 4.0,
      baseElevation: 0,
      totalHeight: 24,
      area: 30000,
      color: buildingColors[2],
    },
    {
      id: generateId(),
      name: 'Block D',
      footprint: [
        { x: 400, y: 400 },
        { x: 600, y: 400 },
        { x: 600, y: 550 },
        { x: 400, y: 550 },
      ],
      floors: 12,
      floorHeight: 4.0,
      baseElevation: 0,
      totalHeight: 48,
      area: 30000,
      color: buildingColors[3],
    },
  ],
  generateImage: () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, 1200, 900);

    // Grid
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= 1200; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 900);
      ctx.stroke();
    }
    for (let y = 0; y <= 900; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1200, y);
      ctx.stroke();
    }

    // Parking areas
    ctx.fillStyle = '#cfd8dc';
    ctx.fillRect(700, 150, 250, 200);
    ctx.fillRect(700, 400, 250, 200);

    // Landscaping
    ctx.fillStyle = '#a5d6a7';
    ctx.fillRect(310, 150, 80, 400);
    ctx.fillRect(100, 310, 500, 80);

    // Central courtyard
    ctx.fillStyle = '#c8e6c9';
    ctx.beginPath();
    ctx.arc(350, 350, 60, 0, Math.PI * 2);
    ctx.fill();

    // Roads
    ctx.fillStyle = '#90a4ae';
    ctx.fillRect(0, 620, 1200, 50);
    ctx.fillRect(650, 0, 40, 620);

    // Buildings
    ctx.fillStyle = '#e3f2fd';
    ctx.strokeStyle = '#1565c0';
    ctx.lineWidth = 2;

    // Block A
    ctx.fillRect(100, 150, 200, 150);
    ctx.strokeRect(100, 150, 200, 150);

    // Block B
    ctx.fillRect(400, 150, 200, 150);
    ctx.strokeRect(400, 150, 200, 150);

    // Block C
    ctx.fillRect(100, 400, 200, 150);
    ctx.strokeRect(100, 400, 200, 150);

    // Block D
    ctx.fillRect(400, 400, 200, 150);
    ctx.strokeRect(400, 400, 200, 150);

    // Food court
    ctx.fillStyle = '#fff3e0';
    ctx.fillRect(750, 650, 150, 80);
    ctx.strokeStyle = '#ef6c00';
    ctx.strokeRect(750, 650, 150, 80);

    // North arrow
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.moveTo(1100, 100);
    ctx.lineTo(1088, 130);
    ctx.lineTo(1100, 120);
    ctx.lineTo(1112, 130);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('N', 1093, 85);

    // Scale bar
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(80, 820, 150, 4);
    ctx.fillRect(80, 815, 3, 14);
    ctx.fillRect(227, 815, 3, 14);
    ctx.font = '12px Arial';
    ctx.fillText('0', 75, 845);
    ctx.fillText('90m', 200, 845);

    // Labels
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#1565c0';
    ctx.fillText('Block A', 165, 230);
    ctx.fillText('Block B', 465, 230);
    ctx.fillText('Block C', 165, 480);
    ctx.fillText('Block D', 465, 480);

    ctx.font = '11px Arial';
    ctx.fillStyle = '#607d8b';
    ctx.fillText('(8 floors)', 170, 245);
    ctx.fillText('(10 floors)', 465, 245);
    ctx.fillText('(6 floors)', 170, 495);
    ctx.fillText('(12 floors)', 465, 495);
    ctx.fillText('Parking', 790, 255);
    ctx.fillText('Parking', 790, 505);
    ctx.fillText('Food Court', 780, 695);

    // Title
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#1f2937';
    ctx.fillText('Bangalore Tech Park', 80, 50);
    ctx.font = '12px Arial';
    ctx.fillStyle = '#607d8b';
    ctx.fillText('Sample Site Plan', 80, 70);

    return canvas.toDataURL('image/png');
  },
};

/**
 * Hyderabad Township
 * Mixed-use development with varied building heights
 */
const hyderabadProject: SampleProject = {
  id: 'hyderabad-township',
  name: 'Hyderabad Township',
  description: 'Mixed-use development with residential and retail',
  location: 'Hyderabad, Telangana',
  site: {
    northAngle: -10, // Slightly counter-clockwise
    scale: 0.45,
    location: {
      latitude: 17.385,
      longitude: 78.4867,
      timezone: 'Asia/Kolkata',
      city: 'Hyderabad',
    },
  },
  buildings: [
    {
      id: generateId(),
      name: 'Residential Block 1',
      footprint: [
        { x: 100, y: 150 },
        { x: 220, y: 150 },
        { x: 220, y: 350 },
        { x: 100, y: 350 },
      ],
      floors: 18,
      floorHeight: 3.0,
      baseElevation: 0,
      totalHeight: 54,
      area: 24000,
      color: buildingColors[0],
    },
    {
      id: generateId(),
      name: 'Residential Block 2',
      footprint: [
        { x: 280, y: 150 },
        { x: 400, y: 150 },
        { x: 400, y: 350 },
        { x: 280, y: 350 },
      ],
      floors: 20,
      floorHeight: 3.0,
      baseElevation: 0,
      totalHeight: 60,
      area: 24000,
      color: buildingColors[1],
    },
    {
      id: generateId(),
      name: 'Shopping Mall',
      footprint: [
        { x: 500, y: 200 },
        { x: 750, y: 200 },
        { x: 750, y: 400 },
        { x: 500, y: 400 },
      ],
      floors: 4,
      floorHeight: 5.0,
      baseElevation: 0,
      totalHeight: 20,
      area: 50000,
      color: buildingColors[4],
    },
    {
      id: generateId(),
      name: 'Office Tower',
      footprint: [
        { x: 850, y: 180 },
        { x: 1000, y: 180 },
        { x: 1000, y: 380 },
        { x: 850, y: 380 },
      ],
      floors: 15,
      floorHeight: 3.8,
      baseElevation: 0,
      totalHeight: 57,
      area: 30000,
      color: buildingColors[3],
    },
    {
      id: generateId(),
      name: 'Community Center',
      footprint: [
        { x: 300, y: 450 },
        { x: 500, y: 450 },
        { x: 500, y: 580 },
        { x: 300, y: 580 },
      ],
      floors: 2,
      floorHeight: 4.5,
      baseElevation: 0,
      totalHeight: 9,
      area: 26000,
      color: buildingColors[5],
    },
  ],
  generateImage: () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#fefefe';
    ctx.fillRect(0, 0, 1200, 900);

    // Grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= 1200; x += 35) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 900);
      ctx.stroke();
    }
    for (let y = 0; y <= 900; y += 35) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1200, y);
      ctx.stroke();
    }

    // Parks and green spaces
    ctx.fillStyle = '#aed581';
    ctx.fillRect(100, 420, 180, 200);
    ctx.fillRect(600, 500, 250, 150);

    // Water feature / lake
    ctx.fillStyle = '#4dd0e1';
    ctx.beginPath();
    ctx.ellipse(900, 550, 80, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00acc1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Main road
    ctx.fillStyle = '#9e9e9e';
    ctx.fillRect(0, 680, 1200, 60);
    ctx.fillRect(450, 0, 45, 680);

    // Residential Block 1
    ctx.fillStyle = '#e8eaf6';
    ctx.strokeStyle = '#3f51b5';
    ctx.lineWidth = 2;
    ctx.fillRect(100, 150, 120, 200);
    ctx.strokeRect(100, 150, 120, 200);

    // Residential Block 2
    ctx.fillRect(280, 150, 120, 200);
    ctx.strokeRect(280, 150, 120, 200);

    // Shopping Mall
    ctx.fillStyle = '#fff8e1';
    ctx.strokeStyle = '#ff8f00';
    ctx.fillRect(500, 200, 250, 200);
    ctx.strokeRect(500, 200, 250, 200);

    // Office Tower
    ctx.fillStyle = '#e0f2f1';
    ctx.strokeStyle = '#00695c';
    ctx.fillRect(850, 180, 150, 200);
    ctx.strokeRect(850, 180, 150, 200);

    // Community Center
    ctx.fillStyle = '#fce4ec';
    ctx.strokeStyle = '#c2185b';
    ctx.fillRect(300, 450, 200, 130);
    ctx.strokeRect(300, 450, 200, 130);

    // Jogging track
    ctx.strokeStyle = '#795548';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(120, 620);
    ctx.lineTo(280, 620);
    ctx.lineTo(280, 420);
    ctx.stroke();
    ctx.setLineDash([]);

    // North arrow (rotated -10 degrees)
    ctx.save();
    ctx.translate(1100, 100);
    ctx.rotate(-10 * Math.PI / 180);
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(-12, 10);
    ctx.lineTo(0, 0);
    ctx.lineTo(12, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('N', -5, -35);
    ctx.restore();

    // Scale bar
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(80, 820, 100, 4);
    ctx.fillRect(80, 815, 3, 14);
    ctx.fillRect(177, 815, 3, 14);
    ctx.font = '12px Arial';
    ctx.fillText('0', 75, 845);
    ctx.fillText('45m', 155, 845);

    // Labels
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = '#3f51b5';
    ctx.fillText('Res. Block 1', 110, 255);
    ctx.fillText('Res. Block 2', 290, 255);

    ctx.fillStyle = '#ff8f00';
    ctx.fillText('Shopping Mall', 570, 305);

    ctx.fillStyle = '#00695c';
    ctx.fillText('Office Tower', 875, 285);

    ctx.fillStyle = '#c2185b';
    ctx.fillText('Community Center', 330, 520);

    ctx.font = '10px Arial';
    ctx.fillStyle = '#607d8b';
    ctx.fillText('(18 floors)', 125, 270);
    ctx.fillText('(20 floors)', 305, 270);
    ctx.fillText('(4 floors)', 595, 320);
    ctx.fillText('(15 floors)', 895, 300);
    ctx.fillText('(2 floors)', 365, 535);
    ctx.fillText('Lake', 885, 555);
    ctx.fillText('Park', 165, 525);

    // Title
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#1f2937';
    ctx.fillText('Hyderabad Township', 80, 50);
    ctx.font = '12px Arial';
    ctx.fillStyle = '#607d8b';
    ctx.fillText('Sample Site Plan', 80, 70);

    return canvas.toDataURL('image/png');
  },
};

// Export all sample projects
export const sampleProjects: SampleProject[] = [
  mumbaiProject,
  bangaloreProject,
  hyderabadProject,
];

// Helper function to get a sample project by ID
export const getSampleProjectById = (id: string): SampleProject | undefined => {
  return sampleProjects.find(p => p.id === id);
};

// Generate ProjectImage from sample project
export const generateSampleImage = (project: SampleProject): ProjectImage => {
  const dataUrl = project.generateImage();
  return {
    dataUrl,
    width: 1200,
    height: 900,
    originalName: `${project.id}_site_plan.png`,
  };
};
