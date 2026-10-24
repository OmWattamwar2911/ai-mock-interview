const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outDir = path.join(__dirname, '../apps/web/public/assets/rehearse');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Generate Topography (1920x1280) - Elevation contours with stippling
function generateTopographySvg(width = 1920, height = 1280) {
  let paths = '';
  // Multiple contour frequency lines
  for (let y = 60; y < height; y += 42) {
    let d = `M 0 ${y}`;
    for (let x = 0; x <= width; x += 80) {
      const wave1 = Math.sin(x * 0.003 + y * 0.005) * 45;
      const wave2 = Math.cos(x * 0.007 - y * 0.003) * 25;
      const wave3 = Math.sin((x + y) * 0.001) * 35;
      const cy = y + wave1 + wave2 + wave3;
      d += ` L ${x} ${cy.toFixed(1)}`;
    }
    const isMajor = (y % 168 === 0);
    const stroke = isMajor ? 'rgba(0,0,0,0.38)' : 'rgba(0,0,0,0.14)';
    const sw = isMajor ? '2' : '1';
    paths += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" />\n`;
    if (isMajor) {
      // Add elevation contour label
      const elev = 800 + Math.floor(y * 1.8);
      paths += `<text x="${(y * 1.5) % 1600 + 100}" y="${y - 4}" font-family="monospace" font-size="11" fill="rgba(0,0,0,0.45)">+${elev}m</text>\n`;
    }
  }

  // Stippled dots
  let dots = '';
  for (let i = 0; i < 400; i++) {
    const rx = (i * 97) % width;
    const ry = (i * 131) % height;
    const opacity = (0.05 + (i % 7) * 0.02).toFixed(2);
    dots += `<circle cx="${rx}" cy="${ry}" r="1.5" fill="rgba(0,0,0,${opacity})" />\n`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#f0eded"/>
    <g>${paths}</g>
    <g>${dots}</g>
  </svg>`;
}

// 2. Generate Hero Poster (1920x1080) - Charcoal vapour with sparse orange glints
function generateHeroPosterSvg(width = 1920, height = 1080) {
  let orangeGlints = '';
  for (let i = 0; i < 30; i++) {
    const gx = (i * 193) % width;
    const gy = (i * 157) % height;
    const gr = 2 + (i % 4);
    orangeGlints += `<circle cx="${gx}" cy="${gy}" r="${gr}" fill="#F64302" opacity="0.75" filter="url(#glow)" />\n`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <radialGradient id="smoke1" cx="30%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#1e1e24"/>
        <stop offset="60%" stop-color="#0e0e12"/>
        <stop offset="100%" stop-color="#000000"/>
      </radialGradient>
      <radialGradient id="smoke2" cx="75%" cy="70%" r="60%">
        <stop offset="0%" stop-color="#2a1b18" stop-opacity="0.6"/>
        <stop offset="80%" stop-color="#0b0b0e" stop-opacity="0"/>
      </radialGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#smoke1)"/>
    <rect width="${width}" height="${height}" fill="url(#smoke2)"/>
    <g>${orangeGlints}</g>
  </svg>`;
}

// 3. Generate About Poster (1920x1080) - Pale overcast
function generateAboutPosterSvg(width = 1920, height = 1080) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <radialGradient id="overcast" cx="50%" cy="30%" r="80%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="50%" stop-color="#f0eded"/>
        <stop offset="100%" stop-color="#e3dfe4"/>
      </radialGradient>
      <linearGradient id="cloudHaze" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#dfdade" stop-opacity="0.4"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#overcast)"/>
    <circle cx="960" cy="400" r="500" fill="url(#cloudHaze)" filter="blur(60px)"/>
  </svg>`;
}

// 4. Generate Sensor Poster (1280x800) - Dark particle streaks
function generateSensorPosterSvg(width = 1280, height = 800) {
  let streaks = '';
  for (let i = 0; i < 70; i++) {
    const x1 = (i * 37) % width;
    const y1 = (i * 53) % height;
    const len = 40 + (i % 8) * 15;
    streaks += `<line x1="${x1}" y1="${y1}" x2="${x1 + len}" y2="${y1 + len * 0.4}" stroke="rgba(246, 67, 2, ${(0.15 + (i % 5) * 0.12).toFixed(2)})" stroke-width="${1 + (i % 3)}" />\n`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#0d0d11"/>
    <rect width="${width}" height="${height}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
    <g>${streaks}</g>
  </svg>`;
}

// 5. Generate Radar Poster (1280x800) - Grainy monochrome radar rings
function generateRadarPosterSvg(width = 1280, height = 800) {
  const cx = width / 2;
  const cy = height / 2;
  let rings = '';
  for (let r = 60; r < 500; r += 60) {
    rings += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1" stroke-dasharray="3,3"/>\n`;
  }
  // Crosshairs & degree ticks
  const cross = `<line x1="${cx}" y1="0" x2="${cx}" y2="${height}" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
    <line x1="0" y1="${cy}" x2="${width}" y2="${cy}" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
    <line x1="${cx}" y1="${cy}" x2="${cx + 280}" y2="${cy - 200}" stroke="#F64302" stroke-width="1.5" opacity="0.8"/>
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#08080a"/>
    <g>${rings}</g>
    <g>${cross}</g>
  </svg>`;
}

async function build() {
  console.log("Generating AERIS WebP assets in", outDir);

  const topoBuf = Buffer.from(generateTopographySvg(1920, 1280));
  await sharp(topoBuf).webp({ quality: 90 }).toFile(path.join(outDir, 'topography.webp'));
  console.log("✓ topography.webp (1920x1280)");

  const heroBuf = Buffer.from(generateHeroPosterSvg(1920, 1080));
  await sharp(heroBuf).webp({ quality: 85 }).toFile(path.join(outDir, 'hero-poster.webp'));
  console.log("✓ hero-poster.webp");

  const aboutBuf = Buffer.from(generateAboutPosterSvg(1920, 1080));
  await sharp(aboutBuf).webp({ quality: 85 }).toFile(path.join(outDir, 'about-poster.webp'));
  console.log("✓ about-poster.webp");

  const sensorBuf = Buffer.from(generateSensorPosterSvg(1280, 800));
  await sharp(sensorBuf).webp({ quality: 85 }).toFile(path.join(outDir, 'sensor-poster.webp'));
  console.log("✓ sensor-poster.webp");

  const radarBuf = Buffer.from(generateRadarPosterSvg(1280, 800));
  await sharp(radarBuf).webp({ quality: 85 }).toFile(path.join(outDir, 'radar-poster.webp'));
  console.log("✓ radar-poster.webp");

  console.log("All AERIS WebP poster and topography assets generated successfully!");
}

build().catch(console.error);
