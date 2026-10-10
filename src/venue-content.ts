import type { PlaceId } from './projects';

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
  opsflash: [
    {
      title: 'Your tools. One workspace.',
      copy: 'Connect multiple SaaS tools to OpsFlash.',
      label: 'OPSFLASH · CONNECT',
      nodes: ['CRM', 'Sheets', 'Support', 'Finance'],
    },
    {
      title: 'Bring the data together.',
      copy: 'A central view across your connected software.',
      label: 'OPSFLASH · CENTRALIZE',
      nodes: ['Customers', 'Conversations', 'Tasks', 'One connected view'],
    },
    {
      title: 'Just ask.',
      copy: 'Ask questions in plain language.',
      label: 'OPSFLASH · ASK',
      nodes: ['“Which customers need a follow-up?”', 'Connected context', 'A useful answer'],
    },
    {
      title: 'Then take action.',
      copy: 'Use the answer to move work forward.',
      label: 'OPSFLASH · ACT',
      nodes: ['Choose an action', 'Review the change', 'Update the connected tool'],
    },
  ],
  rift: [
    {
      title: 'One paisa matters.',
      copy: 'Exact reconciliation, built in Rust.',
      label: 'RIFT · PRECISION WORKSHOP',
      nodes: ['SOURCE · ₹4500.75', 'TARGET · ₹4500.76', 'ENTER · compare records'],
    },
    {
      title: 'What moved?',
      copy: 'Missing, new and changed records.',
      label: 'RIFT · COMPARE',
      nodes: ['Missing · record 02', 'New · record 03', 'Changed · record 01'],
    },
    {
      title: 'Keep every decimal.',
      copy: 'Small differences. Clear answers.',
      label: 'RIFT · EXACT',
      nodes: ['Exact amounts', 'Stable record keys', 'Explore the source'],
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
