# Jay's World — A Kerala Journey

A driveable personal portfolio set in a small Kerala-inspired backwater village. Take a black-and-yellow auto-rickshaw through Jay's work in AI, growth systems, music, and games.

**Intended GitHub Pages URL:** https://jedix420.github.io/jaysworld/ (enable Pages and run the publishing workflow to make it live).

## The concept

- A three-wheel auto with suspension, braking, steering, collisions, boost, and recovery.
- A compact road loop, tiled roofs, verandahs, a tea shop, coconut palms, paddy fields, a canal bridge, a woven houseboat, and a wetland.
- Seven destinations: Jay, Eagle Eye, OpsFlash, RIFT, Music & Beats, SALTWATER, and The Quiet Between Stars.
- Interactive exhibits: a browser beat sequencer, an exact-amount reconciliation example, workflow examples, a small star chart, and a crocodile viewing spot.
- An opt-in Malayalam internet radio player with curated streams, station switching, volume, errors, and Radio Browser discovery.
- Golden-hour and evening lighting, environmental animation, and optional synthesised engine, horn, wind, and birds.
- Desktop and touch controls, a live village map, direct project navigation, reduced decorative motion, and no-WebGL/no-JavaScript paths.

This is an original **v0.2 playable concept**, using detailed procedural models. It establishes the experience and visual direction. Future passes can replace the hero assets with authored GLBs and add richer terrain and interactions. It is not a reconstruction of a real Kerala town.

## Run locally

Use Node.js 24 or later.

~~~sh
npm ci
npm run dev
~~~

No account, secret, paid API, or backend is required. Radio needs internet access; the rest of the site builds into static files.

## Controls

| Control | Action |
| --- | --- |
| WASD / arrows | Drive, reverse, steer |
| Space | Brake |
| Shift | Boost |
| E | Explore a nearby place |
| M | Open Places |
| R | Return to the tea shop |
| H | Horn, after enabling sound |
| Drag / scroll | Orbit / zoom camera |
| Touch | Left stick to drive, another finger on the world to orbit |

Project, radio, and settings dialogs pause driving. Places provides immediate access to each exhibit. Radio continues while reading until stopped.

## Build and verification

~~~sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
~~~

The browser checks serve the production build and exercise the visitor journey. Set JAYSWORLD_LIVE_RADIO=1 to include a real radio playback check; CI tests the opt-in and failure paths without relying on broadcaster availability. Optional JAYSWORLD_CHROMIUM_PATH selects an existing browser, and JAYSWORLD_BASE_URL tests a deployed site.

See [validation](docs/VALIDATION.md), [the design roadmap](docs/BUILD_PLAN.md), and [radio sources](docs/RADIO_SOURCES.md).

## GitHub Pages

Every push to main tests and builds the site, runs production browser checks, and uploads the dist directory as a Pages artifact. Publication is manual so repository Pages setup stays under Jay's control.

1. In repository **Settings → Pages**, select **GitHub Actions** as the source.
2. Open **Actions → Check and publish Jay's World → Run workflow** on main.
3. When the deploy job succeeds, open https://jedix420.github.io/jaysworld/.

Relative assets and fragment links support the /jaysworld/ project path; opening a project does not need server-side routing. No secret or personal access token is needed by this workflow.

The lightweight project interface loads separately from the 3D engine. The physics compatibility package embeds its WASM in the engine bundle; this is the largest download and a future optimisation item.

## Source

| File | Responsibility |
| --- | --- |
| src/main.ts | Interface, navigation, exhibits, state, loading, fallback |
| src/engine.ts | Simulation, rendering, camera, lighting, map, quality |
| src/vehicle.ts | Rapier chassis and three-wheel handling |
| src/input.ts | Keyboard and independent touch pointer ownership |
| src/environment.ts | Village layout, road, scenery, colliders, wildlife |
| src/models.ts | Original procedural models and material batching |
| src/demos.ts | Beat sequencer, reconciliation and project interactions |
| src/radio.ts | Opt-in streams, safe directory data, playback lifecycle |
| src/audio.ts | Original procedural engine, horn and ambience |
| src/projects.ts | Public project content, links and world locations |

## Credits and scope

Bruno Simon's [portfolio](https://bruno-simon.com/) and [public implementation](https://github.com/brunosimon/folio-2025) informed the interaction and architecture. The world, vehicle, procedural assets, map, and implementation here are original; no Bruno assets or source are copied.

Radio Browser is an open-source station directory. Station broadcasts are external audio streams owned by their broadcasters; music is not downloaded, bundled, or relicensed by this project. Station links and credits are present in the player.

Third-party runtime notices are in THIRD_PARTY_NOTICES.md and LICENSES/. Professional exhibits use public descriptions and illustrative data, with no client records or private repository source.
