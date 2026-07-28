// Military rank insignia (SVG) — approximate US Army / USMC style
// Pure SVG, no external images needed

function rankIcon(level, size = 28) {
  const L = Number(level);
  const s = size;
  const gold = "#c9a227";
  const silver = "#c0c0c0";
  const dark = "#1a1a1a";

  // Helper shapes
  const chevron = (y, color = gold) =>
    `<path d="M${s*0.15} ${y+s*0.18} L${s*0.5} ${y} L${s*0.85} ${y+s*0.18} L${s*0.75} ${y+s*0.28} L${s*0.5} ${y+s*0.12} L${s*0.25} ${y+s*0.28} Z" fill="${color}"/>`;

  const rocker = (y, color = gold) =>
    `<path d="M${s*0.12} ${y} Q${s*0.5} ${y+s*0.22} ${s*0.88} ${y} L${s*0.78} ${y+s*0.12} Q${s*0.5} ${y+s*0.28} ${s*0.22} ${y+s*0.12} Z" fill="${color}"/>`;

  const bar = (y, color = silver) =>
    `<rect x="${s*0.28}" y="${y}" width="${s*0.44}" height="${s*0.1}" rx="1" fill="${color}"/>`;

  const star = (cx, cy, r, color = gold) => {
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = (i * 72 - 90) * Math.PI / 180;
      const b = ((i * 72 - 90) + 36) * Math.PI / 180;
      pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
      pts.push(`${cx + r * 0.4 * Math.cos(b)},${cy + r * 0.4 * Math.sin(b)}`);
    }
    return `<polygon points="${pts.join(" ")}" fill="${color}"/>`;
  };

  const leaf = (cx, cy, color = gold) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${s*0.14}" ry="${s*0.22}" fill="${color}" transform="rotate(-25 ${cx} ${cy})"/>
     <ellipse cx="${cx}" cy="${cy}" rx="${s*0.14}" ry="${s*0.22}" fill="${color}" transform="rotate(25 ${cx} ${cy})"/>`;

  const eagle = (color = gold) =>
    `<path d="M${s*0.5} ${s*0.2} L${s*0.35} ${s*0.45} L${s*0.2} ${s*0.35} L${s*0.3} ${s*0.55} L${s*0.15} ${s*0.7} L${s*0.4} ${s*0.6} L${s*0.5} ${s*0.8} L${s*0.6} ${s*0.6} L${s*0.85} ${s*0.7} L${s*0.7} ${s*0.55} L${s*0.8} ${s*0.35} L${s*0.65} ${s*0.45} Z" fill="${color}"/>`;

  let body = "";

  // 1 Private – plain disc
  if (L === 1) {
    body = `<circle cx="${s/2}" cy="${s/2}" r="${s*0.18}" fill="none" stroke="${silver}" stroke-width="2"/>`;
  }
  // 2 PFC – 1 chevron
  else if (L === 2) {
    body = chevron(s * 0.35);
  }
  // 3 Lance Corporal – 1 chevron + cross rifles hint
  else if (L === 3) {
    body = chevron(s * 0.28) +
      `<line x1="${s*0.3}" y1="${s*0.7}" x2="${s*0.7}" y2="${s*0.55}" stroke="${gold}" stroke-width="1.5"/>` +
      `<line x1="${s*0.3}" y1="${s*0.55}" x2="${s*0.7}" y2="${s*0.7}" stroke="${gold}" stroke-width="1.5"/>`;
  }
  // 4 Specialist – shield/eagle small
  else if (L === 4) {
    body = eagle(gold);
  }
  // 5 Corporal – 2 chevrons
  else if (L === 5) {
    body = chevron(s * 0.22) + chevron(s * 0.42);
  }
  // 6 Sergeant – 3 chevrons
  else if (L === 6) {
    body = chevron(s * 0.15) + chevron(s * 0.32) + chevron(s * 0.49);
  }
  // 7 Staff Sergeant – 3 chevrons + 1 rocker
  else if (L === 7) {
    body = chevron(s * 0.08) + chevron(s * 0.24) + chevron(s * 0.40) + rocker(s * 0.62);
  }
  // 8 Gunnery Sergeant – 3 chevrons + 2 rockers
  else if (L === 8) {
    body = chevron(s * 0.05) + chevron(s * 0.20) + chevron(s * 0.35) + rocker(s * 0.52) + rocker(s * 0.68);
  }
  // 9 Master Sergeant – 3 chevrons + 3 rockers
  else if (L === 9) {
    body = chevron(s * 0.02) + chevron(s * 0.16) + chevron(s * 0.30) + rocker(s * 0.46) + rocker(s * 0.60) + rocker(s * 0.74);
  }
  // 10 First Sergeant – 3 chevrons + 3 rockers + diamond
  else if (L === 10) {
    body = chevron(s * 0.02) + chevron(s * 0.16) + chevron(s * 0.30) +
      rocker(s * 0.46) + rocker(s * 0.60) + rocker(s * 0.74) +
      `<rect x="${s*0.42}" y="${s*0.36}" width="${s*0.16}" height="${s*0.16}" fill="${gold}" transform="rotate(45 ${s/2} ${s*0.44})"/>`;
  }
  // 11 Master Gunnery Sergeant – 3 chevrons + 3 rockers + bursting bomb
  else if (L === 11) {
    body = chevron(s * 0.02) + chevron(s * 0.16) + chevron(s * 0.30) +
      rocker(s * 0.46) + rocker(s * 0.60) + rocker(s * 0.74) +
      `<circle cx="${s/2}" cy="${s*0.42}" r="${s*0.08}" fill="${gold}"/>`;
  }
  // 12 Officer Cadet – thin bar
  else if (L === 12) {
    body = `<rect x="${s*0.3}" y="${s*0.4}" width="${s*0.4}" height="${s*0.12}" rx="1" fill="none" stroke="${silver}" stroke-width="2"/>`;
  }
  // 13 Second Lieutenant – 1 gold bar
  else if (L === 13) {
    body = bar(s * 0.42, gold);
  }
  // 14 First Lieutenant – 1 silver bar
  else if (L === 14) {
    body = bar(s * 0.42, silver);
  }
  // 15 Captain – 2 silver bars
  else if (L === 15) {
    body = bar(s * 0.32, silver) + bar(s * 0.52, silver);
  }
  // 16 Warrant Officer – square
  else if (L === 16) {
    body = `<rect x="${s*0.3}" y="${s*0.3}" width="${s*0.4}" height="${s*0.4}" rx="2" fill="none" stroke="${gold}" stroke-width="2.5"/>
            <rect x="${s*0.4}" y="${s*0.4}" width="${s*0.2}" height="${s*0.2}" fill="${gold}"/>`;
  }
  // 17 Sergeant Major – star between chevrons/rockers simplified
  else if (L === 17) {
    body = chevron(s * 0.08) + chevron(s * 0.24) + star(s/2, s*0.48, s*0.12) + rocker(s * 0.62);
  }
  // 18 Command Sergeant Major – star + wreath hint
  else if (L === 18) {
    body = chevron(s * 0.05) + chevron(s * 0.20) + star(s/2, s*0.42, s*0.13) + rocker(s * 0.58) + rocker(s * 0.72);
  }
  // 19 Major – gold oak leaf
  else if (L === 19) {
    body = leaf(s/2, s/2, gold);
  }
  // 20 Lieutenant Colonel – silver oak leaf
  else if (L === 20) {
    body = leaf(s/2, s/2, silver);
  }
  // 21 Colonel – eagle
  else if (L === 21) {
    body = eagle(gold);
  }
  // 22 General – 4 stars
  else if (L === 22) {
    body = star(s*0.22, s*0.5, s*0.11) + star(s*0.41, s*0.5, s*0.11) +
           star(s*0.59, s*0.5, s*0.11) + star(s*0.78, s*0.5, s*0.11);
  }
  else {
    body = `<circle cx="${s/2}" cy="${s/2}" r="${s*0.15}" fill="${silver}"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" style="vertical-align:middle;display:inline-block;flex-shrink:0;">${body}</svg>`;
}

function rankBadge(level, showName = true) {
  const name = getRankName(level);
  return `<span class="rank-badge-wrap rank-${level}" style="display:inline-flex;align-items:center;gap:0.4rem;">
    ${rankIcon(level, 22)}
    ${showName ? `<span>${name}</span>` : ""}
  </span>`;
}
