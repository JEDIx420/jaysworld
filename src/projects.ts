export type PlaceId = 'about' | 'eagle-eye' | 'opsflash' | 'rift' | 'music' | 'saltwater' | 'space';
export interface Place {
  id: PlaceId;
  name: string;
  category: string;
  location: string;
  summary: string;
  body: string;
  position: { x: number; z: number };
  trigger: { x: number; z: number };
  links: { label: string; href: string }[];
}
const linkedIn = 'https://www.linkedin.com/in/jayanand-j-163144126';

export const PLACES: readonly Place[] = [
  {
    id: 'about',
    name: 'Hello, I’m Jay.',
    category: 'JAYANAND / KERALA, INDIA',
    location: 'The tea shop',
    summary: 'I build AI systems, growth tools, and interactive worlds.',
    body: 'I’m the founder of Eagle Eye, based in Thiruvananthapuram. My work brings business problems and hands-on engineering together: AI consulting, GTM automation, and software experiments in music and games. Take the auto for a drive and stop wherever something interests you.',
    position: { x: -36, z: 34 },
    trigger: { x: -51, z: 29 },
    links: [
      { label: 'Connect on LinkedIn', href: linkedIn },
      { label: 'Explore my GitHub', href: 'https://github.com/JEDIx420' },
    ],
  },
  {
    id: 'eagle-eye',
    name: 'Eagle Eye',
    category: 'AI CONSULTING / GTM AUTOMATION',
    location: 'Eagle Towers',
    summary: 'AI and growth systems built around the way a business actually works.',
    body: 'Eagle Eye Research and Deployment Labs builds AI solutions and GTM automation. The work spans research workflows, retrieval and chat interfaces, lead intelligence, and connected operations. The focus is on getting useful systems into day-to-day business use.',
    position: { x: -36, z: -7 },
    trigger: { x: -48, z: -4 },
    links: [{ label: 'Talk about a project', href: linkedIn }],
  },
  {
    id: 'opsflash',
    name: 'OpsFlash',
    category: 'PRODUCT / GTM OPERATIONS',
    location: 'OpsFlash high command',
    summary: 'Connect your SaaS tools, ask your data, and take action in one workspace.',
    body: 'OpsFlash connects multiple SaaS tools, centralizes their data, lets you ask questions in plain language, and helps you take actions through the connected tools. The command centre illustrates search demand, social engagement, leads and revenue with fictional demo data; it does not connect to a visitor’s accounts or expose client data.',
    position: { x: -134, z: -123 },
    trigger: { x: -148, z: -121 },
    links: [{ label: 'Ask about OpsFlash', href: linkedIn }],
  },
  {
    id: 'rift',
    name: 'RIFT',
    category: 'ENGINEERING / DATA RECONCILIATION',
    location: 'The computer centre',
    summary: 'An exact data reconciliation engine built in Rust.',
    body: 'RIFT compares datasets and explains where records diverge, with typed values, deterministic results, and strict exactness guarantees. It is being developed as a command-line tool. The computer centre walks through an illustrative bank reconciliation, explains three differences and works out exact balance adjustments. The example runs locally in the portfolio; the Rust CLI is a separate project.',
    position: { x: -123, z: 148 },
    trigger: { x: -139, z: 132 },
    links: [{ label: 'Ask about RIFT', href: linkedIn }],
  },
  {
    id: 'music',
    name: 'Music & Beats',
    category: 'CREATIVE SOFTWARE / WEB AUDIO',
    location: 'The sound studio',
    summary: 'A browser workstation for turning an idea into a groove.',
    body: 'Play chord pads and piano keys, program beats, layer loops, or work with guitar and audio input. Music & Beats is a local-first music workstation, with its core synthesis and recording work happening in the browser.',
    position: { x: -236, z: 155 },
    trigger: { x: -235, z: 168 },
    links: [
      { label: 'Open Music & Beats', href: 'https://jedix420.github.io/musicandbeats/' },
      { label: 'View code', href: 'https://github.com/JEDIx420/musicandbeats' },
    ],
  },
  {
    id: 'saltwater',
    name: 'SALTWATER',
    category: 'GAME / CROCODILE SURVIVAL',
    location: 'The wetland jetty',
    summary: 'Life as a saltwater crocodile in a tropical estuary.',
    body: 'A single-player survival experiment with swimming, stalking, hunting, wildlife, and a coastal world. The standalone game is being developed in its own repository. The portfolio’s wetland is an exhibit, separate from the full simulation.',
    position: { x: 72, z: 11 },
    trigger: { x: 55, z: 8 },
    links: [
      { label: 'Explore the game repository', href: 'https://github.com/JEDIx420/saltwater' },
    ],
  },
  {
    id: 'space',
    name: 'The Quiet Between Stars',
    category: 'GAME / SPACE EXPLORATION',
    location: 'The hilltop observatory',
    summary: 'A peaceful trip into the strange and beautiful.',
    body: 'A space exploration project with a playful retro-futuristic character. The game explores flight, procedural space, ambient sound, and a companion-controller idea. Launch the project to explore its current build.',
    position: { x: 67, z: -190 },
    trigger: { x: 57, z: -202 },
    links: [
      { label: 'Launch the space game', href: 'https://jedix420.github.io/thequietbetweenstars/' },
      { label: 'View code', href: 'https://github.com/JEDIx420/thequietbetweenstars' },
    ],
  },
];

export function nearestPlace(x: number, z: number, maxDistance = 6.5): Place | undefined {
  let nearest: Place | undefined;
  let best = maxDistance * maxDistance;
  for (const place of PLACES) {
    const d = (x - place.trigger.x) ** 2 + (z - place.trigger.z) ** 2;
    if (d < best) {
      best = d;
      nearest = place;
    }
  }
  return nearest;
}

export function isWater(x: number, z: number): boolean {
  const river = x > 76 && x < 113;
  const canal = x > 19 && x < 90 && Math.abs(z - 8) < 5;
  const bridge = Math.abs(x - 55) < 4.8;
  return river || (canal && !bridge);
}
