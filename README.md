# Jay's World — A Kerala Journey

A driveable personal portfolio set in a Kerala-inspired backwater village. Take a black-and-yellow auto-rickshaw through Jay's work in AI, growth systems, music, and games.

**GitHub Pages URL:** https://jedix420.github.io/jaysworld/ (run the manual publishing workflow to publish a new version).

## The ridge and village edition

- A larger 460 × 540 metre village boundary, fourteen connected road paths, six districts, eleven passenger stops, a market, ferry landing, paddy lanes, houses, and two canal crossings.
- A three-wheel auto with progressive acceleration and braking, speed-sensitive steering, suspension, matching terrain/road collisions, a close driving camera with a scenic preset, and original procedural exhaust, rattle, road, brake, horn, and village sounds.
- Free roam by default. Toggle taxi duty on for passenger pickup/drop-off journeys and game rupees, then off whenever you want to explore. Buy chaya, pazhampori, or samosas; wallet, purchase totals and duty preference persist on your device.
- Seven storefronts for Jay, Eagle Eye, OpsFlash, RIFT, Music & Beats, SALTWATER, and The Quiet Between Stars. Free three-page reading surfaces introduce each project and its interactive exhibit: a tea-shop newspaper, studio notes, operations brief, workshop log, record sleeve, wetland field journal and observatory journal.
- An elevated, winding observatory climb with continuous guardrails, a level summit landing, wooded slopes and terrace planting. Crop beds and bunds leave asphalt and shoulders clear.
- Cows and goats graze and wander; banana gardens, wells, laundry and social groups bring life to the verges. Plain red/orange processions, a white-clothed village gathering and two animated excavators close the outward roads with physical barriers. People and animals have early-yield and swept protection.
- Three crocodiles to observe swimming, surfacing, submerging, and hunting fish, with resident selection, orbit, and zoom.
- A telescope view with illustrated constellations and magnification, plus golden-hour and evening lighting.
- Ente Radio starts on the first click after loading, including a menu click, or the first driving input. The mixing desk adds filter, bass, echo, room, and wobble effects to supported streams or your local audio. The beat sequencer remains available on the record sleeve’s interactive page.
- Keyboard and touch controls, a local minimap and clickable village atlas with zoom/pan and keyboard selection. Directions follow the curved roads with gold arrows, a heading cue and remaining distance. Project links and no-WebGL/no-JavaScript fallbacks remain available.

This is **v0.4**, extending the existing Three.js / Rapier setup. The setting and detailed procedural assets are original. It is a fictional Kerala village; bespoke hero assets and physical-device performance measurements remain further craft work.

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

The first click after loading enables Ente Radio and auto sounds; either can be muted. Project, radio, and settings dialogs pause driving. Storefront, crocodile, and telescope modes park the auto while allowing camera input. Places provides free project notes, pointer/keyboard directions, zoom/pan and direct storefront visits. In the atlas, arrows select a stop and Enter sets directions; Home/End select the first/last stop. Switching taxi duty off, direct visits and resets cancel an active fare without payment. Radio continues while reading until stopped.

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

| File                 | Responsibility                                                    |
| -------------------- | ----------------------------------------------------------------- |
| src/main.ts          | Interface, navigation, exhibits, state, loading, fallback         |
| src/engine.ts        | Simulation, rendering, camera, lighting, map, quality             |
| src/vehicle.ts       | Rapier chassis and three-wheel handling                           |
| src/input.ts         | Keyboard and independent touch pointer ownership                  |
| src/environment.ts   | Village layout, road, scenery, colliders, wildlife                |
| src/models.ts        | Original procedural models and material batching                  |
| src/demos.ts         | Beat sequencer, reconciliation and project interactions           |
| src/radio.ts         | Default station, safe directory data, playback lifecycle          |
| src/radio-effects.ts | Live filter, EQ, echo, reverb and wobble                          |
| src/village.ts       | Shared roads, districts, stops, passengers and routing            |
| src/fares.ts         | Validated local economy and pickup / drop-off rules               |
| src/village-life.ts  | Market, ferry, NPCs, scenery and tea table                        |
| src/wildlife.ts      | Crocodile swim / dive / hunt animation                            |
| src/sky.ts           | Illustrated stars and constellation patterns                      |
| src/map.ts           | Curved map, atlas hit testing, zoom/pan projection and directions |
| src/terrain.ts       | Shared indexed mountain surface and exact triangle heights        |
| src/surfaces.ts      | Visible/physical ground and road-safe field beds                  |
| src/roadside.ts      | Livestock, gardens, ridge forest, crowds and roadwork models      |
| src/safety.ts        | Early yielding and swept resident/animal protection               |
| src/exhibit-art.ts   | Original vector covers and venue-specific reader identities       |
| src/audio.ts         | Original procedural engine, horn and ambience                     |
| src/projects.ts      | Public project content, links and world locations                 |

## Credits and scope

Bruno Simon's [portfolio](https://bruno-simon.com/) and [public implementation](https://github.com/brunosimon/folio-2025) informed the interaction and architecture. The world, vehicle, procedural assets, map, and implementation here are original; no Bruno assets or source are copied.

Radio Browser is an open-source station directory. Station broadcasts are external audio streams owned by their broadcasters; music is not downloaded, bundled, or relicensed by this project. Station links and credits are present in the player.

Third-party runtime notices are in THIRD_PARTY_NOTICES.md and LICENSES/. Professional exhibits use public descriptions and illustrative data, with no client records or private repository source.
