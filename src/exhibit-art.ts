import type { PlaceId } from './projects';

export const READERS: Record<
  PlaceId,
  { title: string; edition: string; subtitle: string; label: string }
> = {
  about: {
    title: 'The Kerala Dispatch',
    edition: 'THE VILLAGE EDITION · KERALA, INDIA',
    subtitle: 'Ideas, experiments & a good cup of chaya.',
    label: 'Read the newspaper',
  },
  'eagle-eye': {
    title: 'Inside the studio',
    edition: 'EAGLE EYE · RESEARCH & DEPLOYMENT',
    subtitle: 'Useful systems, from a question to everyday work.',
    label: 'Open the studio notes',
  },
  opsflash: {
    title: 'Mission brief',
    edition: 'OPSFLASH · OPERATIONS DESK',
    subtitle: 'A connected view of the work.',
    label: 'Read the mission brief',
  },
  rift: {
    title: 'The workshop log',
    edition: 'RIFT · ENGINEERING NOTEBOOK',
    subtitle: 'Same data. Exact answers.',
    label: 'Open the workshop log',
  },
  music: {
    title: 'Sleeve notes',
    edition: 'MUSIC & BEATS · SIDE A / SIDE B',
    subtitle: 'Turn an idea into a groove.',
    label: 'Read the sleeve notes',
  },
  saltwater: {
    title: 'Wetland field notes',
    edition: 'SALTWATER · ESTUARY OBSERVATIONS',
    subtitle: 'A little patience. A sudden splash.',
    label: 'Open the field journal',
  },
  space: {
    title: 'The observatory journal',
    edition: 'THE QUIET BETWEEN STARS · FLIGHT NOTES',
    subtitle: 'Some journeys begin by looking up.',
    label: 'Open the star journal',
  },
};

/** Original vector exhibit covers, deliberately presented as illustrations. */
export function exhibitArt(id: PlaceId) {
  const illustrations: Record<PlaceId, string> = {
    about: `<path d="M30 180Q90 145 165 174T350 170" fill="none" stroke="currentColor" stroke-width="3"/><path d="M48 134v-45l41-30 46 30v45M39 89h105M67 134v-26h34v26" fill="none" stroke="currentColor" stroke-width="3"/><path d="M234 126h48v27q-24 26-48 0zm48 5q28-5 23 14t-23 8M241 105q-8-9 0-17M258 105q-8-9 0-17" fill="none" stroke="currentColor" stroke-width="3"/><path d="M166 187v-59l18-16h51v75M162 141h78M182 187a8 8 0 1 0 0-16m42 16a8 8 0 1 0 0-16" fill="none" stroke="currentColor" stroke-width="3"/><text x="190" y="222" text-anchor="middle">A GOOD DAY FOR A LITTLE DRIVE</text>`,
    'eagle-eye': `<path d="M75 94q49-74 115 0-64 74-115 0" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="134" cy="94" r="22" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="134" cy="94" r="8" fill="currentColor"/><path d="M196 94h31m-7-6 8 6-8 6M269 118v26M132 130v40h112" fill="none" stroke="currentColor" stroke-width="2"/><rect x="234" y="68" width="87" height="51" rx="6" fill="none" stroke="currentColor" stroke-width="2"/><rect x="246" y="153" width="75" height="41" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><text x="276" y="99" text-anchor="middle">BUILD</text><text x="282" y="178" text-anchor="middle">USE</text><text x="130" y="215" text-anchor="middle">QUESTION → SYSTEM</text>`,
    opsflash: `<rect x="42" y="49" width="295" height="151" rx="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M42 77h295M146 77v123" stroke="currentColor" stroke-width="2"/><circle cx="56" cy="63" r="3" fill="currentColor"/><circle cx="68" cy="63" r="3" fill="currentColor"/><path d="M166 117h54v47h-54zm66-25h79v25h-79zm0 39h79v43h-79zM59 98h62m-62 22h49m-49 22h54m-54 22h42" fill="none" stroke="currentColor" stroke-width="2"/><path d="m173 149 11-14 11 8 17-16" fill="none" stroke="currentColor" stroke-width="3"/><text x="190" y="224" text-anchor="middle">INTELLIGENCE · WORKFLOWS · OPERATIONS</text>`,
    rift: `<text x="40" y="47">RECONCILIATION / WORKING NOTES</text><path d="M46 72h119v97H46zm168 0h119v97H214zM46 100h119M46 128h119m49-28h119m-119 28h119M87 72v97m41-97v97m127-97v97m41-97v97" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m58 113 8 8 15-20m145 12 8 8 15-20M177 120h26m-7-6 7 6-7 6" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="276" cy="145" r="9" fill="none" stroke="currentColor" stroke-width="2"/><text x="189" y="205" text-anchor="middle">COMPARE. EXPLAIN. REPEAT.</text>`,
    music: `<circle cx="146" cy="125" r="86" fill="currentColor" opacity=".9"/><g stroke="#ddbc81" fill="none" opacity=".7"><circle cx="146" cy="125" r="72"/><circle cx="146" cy="125" r="66"/><circle cx="146" cy="125" r="59"/><circle cx="146" cy="125" r="52"/></g><circle cx="146" cy="125" r="30" fill="#c78357"/><circle cx="146" cy="125" r="4" fill="#ead7aa"/><path d="M279 45v90l-26 31" fill="none" stroke="currentColor" stroke-width="5"/><path d="M298 74v90l-27 31" fill="none" stroke="currentColor" stroke-width="2"/><text x="280" y="220" text-anchor="middle">33⅓ / PLAY AGAIN</text>`,
    saltwater: `<path d="M30 150q56-25 105-1t110-1 104-1M30 166q56-25 105-1t110-1 104-1" fill="none" stroke="currentColor" opacity=".35" stroke-width="2"/><path d="m65 127 35-9 18-19 51-5 27 7 46 6 42 14 24 9-31 8-79-1-20 17-16-17-52 1-31 8 9-13-36 4z" fill="none" stroke="currentColor" stroke-width="3"/><path d="m123 100 8 10 8-10 9 10 9-10 9 10M212 116h56m-55 7h64" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="249" cy="112" r="3" fill="currentColor"/><path d="M327 148V66m0 37-18-18m18 5 13-22M47 151V83m0 24-15-14" stroke="currentColor" stroke-width="2"/><text x="190" y="219" text-anchor="middle">SWIM · SURFACE · STALK</text>`,
    space: `<g fill="currentColor"><circle cx="56" cy="54" r="2"/><circle cx="98" cy="80" r="3"/><circle cx="134" cy="60" r="2"/><circle cx="205" cy="44" r="2"/><circle cx="253" cy="65" r="3"/><circle cx="300" cy="99" r="2"/><circle cx="276" cy="152" r="2"/><circle cx="212" cy="133" r="2"/><circle cx="160" cy="160" r="3"/><circle cx="77" cy="147" r="2"/></g><path d="m98 80 36-20 71-16 48 21 47 34-24 53-64-19-52 27" stroke="currentColor" opacity=".5" fill="none"/><path d="M35 204q84-33 142-14t165-13" stroke="currentColor" fill="none" stroke-width="2"/><path d="m130 199 47-19 15 17m-20-37 20-18 13 14-20 18zM188 170l-10 24m13-26 18 25" fill="none" stroke="currentColor" stroke-width="3"/><text x="191" y="228" text-anchor="middle">LOOK UP. WANDER A LITTLE.</text>`,
  };
  return `<svg viewBox="0 0 380 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustrated cover for ${READERS[id].title}"><g font-family="monospace" font-size="10" letter-spacing="1">${illustrations[id]}</g></svg><figcaption>ILLUSTRATED VILLAGE EDITION · ${id === 'about' ? '01' : 'PROJECT NOTES'}</figcaption>`;
}
