/** Stylized land outlines and fictional signals, shared by the hologram and room display. */
export const WORLD_LAND = [
  [
    [-168, 70],
    [-130, 72],
    [-112, 58],
    [-90, 51],
    [-62, 54],
    [-52, 44],
    [-76, 26],
    [-87, 17],
    [-102, 22],
    [-117, 32],
    [-130, 50],
    [-158, 58],
  ],
  [
    [-80, 12],
    [-61, 9],
    [-36, -7],
    [-43, -24],
    [-55, -36],
    [-69, -55],
    [-76, -27],
  ],
  [
    [-53, 60],
    [-22, 70],
    [-40, 83],
    [-61, 80],
  ],
  [
    [-10, 36],
    [-8, 55],
    [18, 71],
    [35, 60],
    [42, 45],
    [30, 36],
    [12, 43],
  ],
  [
    [-17, 32],
    [10, 37],
    [34, 30],
    [51, 12],
    [41, -10],
    [27, -35],
    [15, -33],
    [4, -4],
    [-16, 12],
  ],
  [
    [30, 40],
    [45, 65],
    [100, 75],
    [157, 60],
    [145, 43],
    [125, 38],
    [120, 20],
    [107, 3],
    [98, 9],
    [82, 8],
    [68, 23],
    [48, 30],
  ],
  [
    [112, -11],
    [138, -11],
    [153, -26],
    [144, -40],
    [117, -34],
  ],
  [
    [130, 31],
    [143, 45],
    [146, 41],
    [138, 33],
  ],
  [
    [46, -13],
    [50, -16],
    [46, -25],
    [43, -22],
  ],
] as const;
export const COMMAND_REGIONS = [
  {
    name: 'N. AMERICA',
    lon: -100,
    lat: 37,
    search: 380000,
    social: 82000,
    leads: 1850,
    revenue: 248000,
  },
  { name: 'EUROPE', lon: 12, lat: 53, search: 290000, social: 66000, leads: 1320, revenue: 187000 },
  { name: 'INDIA', lon: 78, lat: 21, search: 510000, social: 119000, leads: 4620, revenue: 312000 },
  {
    name: 'SE ASIA',
    lon: 119,
    lat: 3,
    search: 260000,
    social: 74000,
    leads: 2760,
    revenue: 168000,
  },
  {
    name: 'BRAZIL',
    lon: -52,
    lat: -15,
    search: 170000,
    social: 43000,
    leads: 1140,
    revenue: 94000,
  },
] as const;
export const COMMAND_LAYERS = [
  {
    key: 'search',
    title: 'Search demand.',
    label: 'ONLINE SEARCH VOLUME',
    unit: 'searches / month',
    color: '#80e8db',
    copy: 'Spot where people are searching. Find the next market to focus on.',
  },
  {
    key: 'social',
    title: 'Social engagement.',
    label: 'SOCIAL MEDIA INTERACTIONS',
    unit: 'interactions / month',
    color: '#c8a4fa',
    copy: 'See where conversations are growing. Turn attention into a useful next move.',
  },
  {
    key: 'leads',
    title: 'Qualified leads.',
    label: 'SALES PIPELINE',
    unit: 'qualified leads',
    color: '#f0c67d',
    copy: 'Follow demand into the pipeline. Choose where the team should follow up.',
  },
  {
    key: 'revenue',
    title: 'Revenue.',
    label: 'REVENUE BY REGION',
    unit: 'USD / month',
    color: '#92e5ae',
    copy: 'Connect activity with revenue. Ask a question, review the evidence, then act.',
  },
] as const;
export function mapPoint(lon: number, lat: number) {
  return { x: ((lon + 180) / 360) * 1000, y: ((85 - lat) / 150) * 500 };
}
export function signalValue(value: number, currency = false) {
  const text =
    value >= 1000000
      ? `${(value / 1000000).toFixed(2)}M`
      : value >= 1000
        ? `${(value / 1000).toFixed(value < 10000 ? 2 : 0)}K`
        : String(value);
  return `${currency ? '$' : ''}${text}`;
}
export function commandMapSvg(page: number) {
  const layer = COMMAND_LAYERS[page],
    peak = Math.max(...COMMAND_REGIONS.map((r) => r[layer.key]));
  const lands = WORLD_LAND.map(
    (land) =>
      `<polygon points="${land
        .map(([lon, lat]) => {
          const p = mapPoint(lon, lat);
          return `${p.x},${p.y}`;
        })
        .join(' ')}"/>`,
  ).join('');
  const grid =
    Array.from({ length: 11 }, (_, i) => `<path d="M${i * 100} 0V500"/>`).join('') +
    Array.from({ length: 6 }, (_, i) => `<path d="M0 ${i * 100}H1000"/>`).join('');
  const signals = COMMAND_REGIONS.map((r) => {
    const p = mapPoint(r.lon, r.lat),
      height = 16 + (r[layer.key] / peak) * 56;
    return `<g class="map-signal" data-region="${r.name}" transform="translate(${p.x},${p.y})"><circle class="signal-halo" r="${14 + (r[layer.key] / peak) * 23}"/><ellipse rx="17" ry="6"/><path class="signal-column" d="M-7 0V-${height}L7 -${height + 4}V0Z"/><circle cy="-${height}" r="4"/><text x="14" y="-${height + 7}">${signalValue(r[layer.key], layer.key === 'revenue')}</text><text class="region-label" x="14" y="-${height - 9}">${r.name}</text></g>`;
  }).join('');
  return `<svg class="hologram-map" viewBox="0 0 1000 500" role="img" aria-label="${layer.label}: fictional signals across five regions" style="--signal:${layer.color}"><g class="map-grid">${grid}</g><g class="map-land">${lands}</g><g class="map-links"><path d="M222 160Q470 -30 716 213Q600 85 533 107M716 213Q850 140 830 273M222 160Q205 340 355 333"/></g>${signals}</svg>`;
}
