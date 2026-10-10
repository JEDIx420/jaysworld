# Jay’s World — Guided Roads

A Kerala-inspired portfolio you drive through in a black-and-yellow auto. Start **on the road**, press Enter, then visit Eagle Eye, earn taxi fares or explore seven destinations at your own pace.

**Live:** https://jedix420.github.io/jaysworld/

**v0.7** extends the existing Three.js and Rapier game. Everything builds into static files for GitHub Pages; no account, secret or backend is required.

## This release

- A road-first start even when reloading a project URL. Shared project links suggest a route rather than opening an office. Centered notifications offer a company tour, taxi fares or free exploring; eight accomplishments are saved on the device. Change the optional journey from Places at any time.
- Bottom-right map with destination X marks, an analog speed dial, a rev dial and five gears. The player auto reaches 70 km/h normally and 120 km/h with boost. Shift/touch boost adds trails, a gentle field-of-view change and a two-second visual wheelie; traffic never has boost. Reduced motion removes the launch effects.
- Radio menus keep the live world rendering on every animation frame. Backdrop blur and repeated offer-button/route rebuilding are removed. A sustained frame budget miss reduces shadows and resolution; weather particles and distant birds follow the selected quality.
- Clear observatory driveway and entry bay, with guardrails kept back from the whole access lane. Destination X marks enlarge on approach, with an Enter prompt when stopped nearby.
- Eight traffic actors in performance mode and twelve in balanced mode. Distinct rounded classic saloons, compact hatchbacks, SUVs and luxury sedans join autos, motorcycles and cycles. Sloping terrain no longer blocks riders’ obstacle sweeps. Drivers slow for turns, reverse out of jams, and recover prolonged stranding on clear forward road samples away from the visitor.
- Vendors and customers at every market stall, plus walking shoppers with bags. Soft shaded procedural cumulus clouds replace sphere clusters. Two articulated eagles circle Eagle Towers; the rooftop starts looking toward one, and left/right controls follow the expected direction.
- Portrait and landscape HUD layouts keep the logo, taxi card, map and touch controls apart. Touch input clears on cancellation, focus loss and rotation.
- A 460 × 540 metre town with sixteen connected road paths, eleven passenger stops, markets, tiled houses, paddy, canal bridges and a winding hill climb. The observatory has its own side terrace and driveway.
- Glass-and-steel Eagle Towers, a roof lift and a first-person panorama with birds, clouds and the town’s traffic below.
- Keyboard-first visits: choose a physical object with arrows and use Enter. Distinct 3D interiors: Eagle Towers briefing room, OpsFlash home office, tea counter, music studio, precision workshop, wetland field station and observatory. Physical presentation screens tell short stories; arrows change slides.
- Shared physical passenger stops fix the mismatch between visible customers, pickups, maps and rival destinations. A central Enter/touch pickup prompt takes priority over nearby buildings.
- Road-derived streetlight positions follow dry verges, with spacing and clear entry bays. Signal poles follow actual junction arms instead of fixed crossroad offsets.
- Articulated chatting, clapping and chanting crowds, directing police, alternating patrol beacons, chimney smoke, stove embers and outside studio speakers. Bikes have diamond frames, open spokes, forks, bent limbs and pedal motion.
- The map supports routes, pan, zoom and keyboard selection. Gold passenger markers and small passenger buttons let you choose a fare.
- Off duty by default. Taxi mode offers four passengers at once; a rival auto competes for available pickups and carries its own passengers. A boarded passenger cannot be stolen. Fares fund tea and snacks; the existing version-1 wallet is preserved.
- Cars and the rival auto use real raycast suspension, steering, brakes, collision bodies and CCD. Motorcycles and cycles use stable lane controllers with obstacle sweeps. Seven major junctions share green/amber/all-red signal timing and stop-line decisions.
- Kerala-inspired police officers and patrol vehicles at the fictional red/orange processions, white-clothed meeting and JCB roadworks. Continuous visible perimeters and swept closed regions prevent mountain/side bypasses. People and animals remain protected from vehicle impacts.
- A shared day/night clock, dry/monsoon cycle, haze, dusty wind, rain, wet-road appearance and a modest grip change. Gradual transitions, lamp/window glow, procedural rain sound, flowers, grazing animals and flying birds bring life to the scene.
- Three crocodiles with independent swimming prey, an intercept and lunge, mouth-aligned capture, articulated jaws/tails/feet, smaller splashes and continuous recovery. Choose residents, orbit and zoom.
- An illustrated telescope sky with constellation selection and an optional Nightfall action.
- Ente Radio starts on the first click or Enter/driving input after loading, unless you previously switched it off. A retro tuner seeks backward/forward with static until actual playback. Missing signals time out; Malayalam, True Blues and classic-rock stations share the dial. Studio beats use a separate audio context and keep the radio at the chosen volume.

The setting, models, illustrations and synthesized sound are original. Public workflow demonstrations are illustrative; the telescope is an illustrated sky. This is a fictional Kerala town, not a geographic recreation.

## Controls

| Context                    | Keys                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------- |
| Driving                    | WASD / arrows · Space brake · Shift boost · H horn                                      |
| Nearby stop or passenger   | Enter                                                                                   |
| Global driving controls    | M map · Q radio · T taxi duty · R return to Eagle Towers · Escape settings              |
| Shop                       | Arrows choose object · Enter use · Escape return                                        |
| Project instrument         | Arrows change section · Enter advance/compare · Escape close                            |
| Drum machine               | Arrows choose pad · Enter toggle pad · Space play/stop · +/− tempo                      |
| Radio                      | ←/→ seek · ↑/↓ volume · Enter power · Escape close                                      |
| Roof / wetland / telescope | Arrows or drag look · +/− or pinch zoom · Escape return                                 |
| Wetland / telescope        | [ / ] choose target · Enter hunt / next constellation · N nightfall at telescope        |
| Map                        | Arrows choose project · Enter set route · Home/End first/last · drag pan                |
| Phone                      | Left stick drive · another finger drag view · brake/boost buttons · tap object controls |

Menus and visits park your auto. Ambient traffic continues; passenger competition pauses while you browse, visit or hide the tab. Direct visits, resets and switching off duty cancel an active fare without paying it. Radio can continue independently.

## Development and checks

Use Node.js 24:

```sh
npm ci
npm run dev
```

Production checks:

```sh
npm run format:check
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

The browser suite serves the production build and runs eighteen desktop/touch/media/fallback journeys. `JAYSWORLD_QA_SHARD=1/3` selects a worker; `JAYSWORLD_CHROMIUM_PATH` selects an installed browser; `JAYSWORLD_BASE_URL` checks a deployed site. Deterministic PCM fixtures verify browser playback independently of station uptime. `JAYSWORLD_LIVE_RADIO=1` uses the real Ente broadcast.

Main pushes run formatting, unit/physics tests, build and all three browser workers. Pages deployment waits for every worker to succeed. Relative Vite asset paths support the `/jaysworld/` project path. The v0.5 rollback commit is `fddb92e7dc43edacdce5824aa33b7b60201bf2b6`.

See [the release plan](docs/GUIDED_ROADS_PLAN.md), [validation](docs/VALIDATION.md) and [radio sources](docs/RADIO_SOURCES.md). Physical iPhone/Safari testing and measured hardware FPS remain unverified; touch emulation is recorded separately.
