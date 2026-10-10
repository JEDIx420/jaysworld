import type { PlaceId } from './projects';
import { COMMAND_LAYERS, COMMAND_REGIONS, signalValue } from './command-map';

export interface VenuePage {
  title: string;
  copy: string;
  label: string;
  nodes: readonly string[];
}
/** Short, public stories shared by the physical screens and accessible controls. */
export const VENUE_PAGES: Record<PlaceId, readonly VenuePage[]> = {
  about: [
    {
      title: 'Hello, I’m Jay.',
      copy: 'From Kerala. Building useful tools and playful worlds.',
      label: 'THE KERALA DISPATCH',
      nodes: ['AI & growth', 'Music & beats', 'Games & experiments'],
    },
    {
      title: 'Work. Play. Repeat.',
      copy: 'A small town full of things I’ve made.',
      label: 'AROUND THE VILLAGE',
      nodes: ['Eagle Eye · OpsFlash', 'RIFT · exact records', 'SALTWATER · Stars'],
    },
    {
      title: 'Let’s build something.',
      copy: 'An idea worth making? Come say hello.',
      label: 'THE LAST PAGE',
      nodes: ['Kerala, India', 'Curiosity first', 'Find me on GitHub & LinkedIn'],
    },
  ],
  'eagle-eye': [
    {
      title: 'Useful AI. Real work.',
      copy: 'Eagle Eye Research & Deployment Labs.',
      label: 'EAGLE TOWERS · BRIEFING 01',
      nodes: ['Research', 'Build', 'Deploy'],
    },
    {
      title: 'From a question to a system.',
      copy: 'Retrieval, automation and connected intelligence.',
      label: 'RESEARCH → DEPLOYMENT',
      nodes: ['Understand the problem', 'Connect the knowledge', 'Build a useful workflow'],
    },
    {
      title: 'Make the next move clearer.',
      copy: 'AI systems and growth workflows, built with care.',
      label: 'GROWTH & OPERATIONS',
      nodes: ['Find useful signals', 'Choose a next action', 'Put the system to work'],
    },
  ],
  opsflash: COMMAND_LAYERS.map((layer, i) => ({
    title: layer.title,
    copy: layer.copy,
    label: `OPSFLASH · COMMAND ${String(i + 1).padStart(2, '0')}`,
    nodes: COMMAND_REGIONS.map(
      (r) => `${r.name} · ${signalValue(r[layer.key], layer.key === 'revenue')}`,
    ),
  })),
  rift: [
    {
      title: 'Close the books.',
      copy: 'Help the analyst reconcile a bank statement with the cash ledger.',
      label: 'RIFT · COMPUTER CENTRE',
      nodes: ['Bank statement', 'Cash ledger', 'ENTER · find differences'],
    },
    {
      title: 'Find the three differences.',
      copy: 'Match record keys. Keep every paisa. Separate timing from errors.',
      label: 'RIFT · DETECT',
      nodes: ['Receipt · ₹0.01 out', 'Deposit · ₹1,200 in transit', 'Fee · ₹125 unrecorded'],
    },
    {
      title: 'Explain every difference.',
      copy: 'Follow each difference back to the records that explain it.',
      label: 'RIFT · EXPLAIN',
      nodes: ['Check the receipt', 'Track the deposit', 'Review the bank fee'],
    },
    {
      title: 'Balance both sides.',
      copy: 'Work through the adjustments. The two balances should agree exactly.',
      label: 'RIFT · SOLVE',
      nodes: ['Adjust the ledger', 'Adjust the bank balance', 'Residual · ₹0.00'],
    },
    {
      title: 'Review. Then reconcile.',
      copy: 'Approve the evidence, post the corrections, and keep the timing item open.',
      label: 'RIFT · REVIEW',
      nodes: [
        'Confirm ₹0.01 receipt correction',
        'Record ₹125 bank fee',
        'Watch for ₹1,200 deposit clearance',
      ],
    },
  ],
  music: [
    {
      title: 'Leave a little groove.',
      copy: 'Your beat. Your tempo. The radio stays on.',
      label: 'CHAYA SOUND CO. · RECORDING ROOM',
      nodes: ['KICK', 'SNARE', 'HAT'],
    },
  ],
  saltwater: [
    {
      title: 'SALTWATER',
      copy: 'Swim. Stalk. Survive.',
      label: 'WETLAND FIELD GUIDE',
      nodes: ['Mugger', 'Estuary', 'Little one'],
    },
    {
      title: 'A patient hunter.',
      copy: 'Watch from the jetty. Choose a resident. Move closer.',
      label: 'AT THE WATER’S EDGE',
      nodes: ['Swim', 'Surface', 'Hunt'],
    },
    {
      title: 'Into the wetland.',
      copy: 'A tropical crocodile survival experiment.',
      label: 'SALTWATER · THE GAME',
      nodes: ['Explore', 'Survive', 'Try the game'],
    },
  ],
  space: [
    {
      title: 'The Quiet Between Stars',
      copy: 'A peaceful trip into the strange and beautiful.',
      label: 'HILLTOP OBSERVATORY',
      nodes: ['Explore space', 'Take your time', 'See what’s out there'],
    },
    {
      title: 'Look a little further.',
      copy: 'Turn the telescope toward the night sky.',
      label: 'THE TELESCOPE',
      nodes: ['Orion', 'Ursa Major', 'Crux'],
    },
    {
      title: 'Take flight.',
      copy: 'Step into the space game.',
      label: 'THE QUIET BETWEEN STARS',
      nodes: ['A quiet universe', 'A little discovery', 'Try the game'],
    },
  ],
};
