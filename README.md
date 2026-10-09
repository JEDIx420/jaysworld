# Jay's World — A Kerala Journey

A driveable personal portfolio set in a Kerala-inspired backwater village. Take a black-and-yellow auto-rickshaw through Jay's work in AI, growth systems, music, and games.

**GitHub Pages URL:** https://jedix420.github.io/jaysworld/ (run the manual publishing workflow to publish a new version).

## The village edition

- A larger 460 × 540 metre village boundary, nine connected road paths, six districts, eleven passenger stops, a market, ferry landing, paddy lanes, houses, and two canal crossings.
- A three-wheel auto with progressive acceleration and braking, speed-sensitive steering, suspension, collisions, a closer follow camera, and original procedural exhaust, rattle, road, brake, horn, and village sounds.
- Passenger pickup/drop-off journeys that earn game rupees. Buy chaya, pazhampori, or samosas; wallet and purchase totals persist on your device.
- Seven storefronts for Jay, Eagle Eye, OpsFlash, RIFT, Music & Beats, SALTWATER, and The Quiet Between Stars. Free three-page newspapers introduce each project and its interactive exhibit.
- Three crocodiles to observe swimming, surfacing, submerging, and hunting fish, with resident selection, orbit, and zoom.
- A telescope view with illustrated constellations and magnification, plus golden-hour and evening lighting.
- Ente Radio starts when you start the experience. The mixing desk adds filter, bass, echo, room, and wobble effects to supported streams or your local audio. The beat sequencer remains available on the newspaper's back page.
- Keyboard and touch controls, a local minimap and full village atlas, directions, project links, and no-WebGL/no-JavaScript fallbacks.

This is **v0.3**, extending the existing Three.js / Rapier setup. The setting and detailed procedural assets are original. It is a fictional Kerala village; authored hero assets and terrain remain future craft work.

## Run locally

Use Node.js 24 or later.

```sh
npm ci
npm run dev
```

No account, secret, paid API, or backend is required. Radio needs internet access; the rest of the site builds into static files.

## Controls

| Control       | Action                                                    |
| ------------- | --------------------------------------------------------- |
| WASD / arrows | Drive, reverse, steer                                     |
| Space         | Brake                                                     |
| Shift         | Boost                                                     |
| E             | Pick up / drop off a passenger, or visit a nearby place   |
| M             | Open Places                                               |
| R             | Return to the tea shop                                    |
| H             | Horn, after starting the experience                       |
| Drag / scroll | Orbit / zoom camera                                       |
| Touch         | Left stick to drive, another finger on the world to orbit |

Start driving enables Ente Radio and auto sounds; either can be muted. Project, radio, and settings dialogs pause driving. Storefront, crocodile, and telescope modes park the auto while allowing camera input. Places provides free papers, directions, and direct storefront visits. Direct visits and resets cancel an active fare. Radio continues while reading until stopped.

## Build and verification

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

The browser checks serve the production build and exercise the visitor journey. Set JAYSWORLD_LIVE_RADIO=1 to include a real radio playback check; CI tests gesture-triggered default playback, effects, and failure paths without relying on broadcaster availability. Optional JAYSWORLD_CHROMIUM_PATH selects an existing browser, and JAYSWORLD_BASE_URL tests a deployed site.

See [validation](docs/VALIDATION.md), [the design roadmap](docs/BUILD_PLAN.md), and [radio sources](docs/RADIO_SOURCES.md).

## GitHub Pages

Every push to main tests and builds the site, runs production browser checks, and uploads the dist directory as a Pages artifact. Publication is manual so repository Pages setup stays under Jay's control.

1. In repository **Settings → Pages**, select **GitHub Actions** as the source.
2. Open **Actions → Check and publish Jay's World → Run workflow** on main.
3. When the deploy job succeeds, open https://jedix420.github.io/jaysworld/.

Relative assets and fragment links support the /jaysworld/ project path; opening a project does not need server-side routing. No secret or personal access token is needed by this workflow.

The lightweight project interface loads separately from the 3D engine. The physics compatibility package embeds its WASM in the engine bundle; this is the largest download and a future optimisation item.

## Source

| File                 | Responsibility                                            |
| -------------------- | --------------------------------------------------------- |
| src/main.ts          | Interface, navigation, exhibits, state, loading, fallback |
| src/engine.ts        | Simulation, rendering, camera, lighting, map, quality     |
| src/vehicle.ts       | Rapier chassis and three-wheel handling                   |
| src/input.ts         | Keyboard and independent touch pointer ownership          |
| src/environment.ts   | Village layout, road, scenery, colliders, wildlife        |
| src/models.ts        | Original procedural models and material batching          |
| src/demos.ts         | Beat sequencer, reconciliation and project interactions   |
| src/radio.ts         | Default station, safe directory data, playback lifecycle  |
| src/radio-effects.ts | Live filter, EQ, echo, reverb and wobble                  |
| src/village.ts       | Shared roads, districts, stops, passengers and routing    |
| src/fares.ts         | Validated local economy and pickup / drop-off rules       |
| src/village-life.ts  | Market, ferry, NPCs, scenery and tea table                |
| src/wildlife.ts      | Crocodile swim / dive / hunt animation                    |
| src/sky.ts           | Illustrated stars and constellation patterns              |
| src/map.ts           | Local minimap and full village atlas                      |
| src/audio.ts         | Original procedural engine, horn and ambience             |
| src/projects.ts      | Public project content, links and world locations         |

## Credits and scope

Bruno Simon's [portfolio](https://bruno-simon.com/) and [public implementation](https://github.com/brunosimon/folio-2025) informed the interaction and architecture. The world, vehicle, procedural assets, map, and implementation here are original; no Bruno assets or source are copied.

Radio Browser is an open-source station directory. Station broadcasts are external audio streams owned by their broadcasters; music is not downloaded, bundled, or relicensed by this project. Station links and credits are present in the player.

Third-party runtime notices are in THIRD_PARTY_NOTICES.md and LICENSES/. Professional exhibits use public descriptions and illustrative data, with no client records or private repository source.
