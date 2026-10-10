# v0.6 — Rooms & Roads

Build on v0.5 (`fddb92e7dc43edacdce5824aa33b7b60201bf2b6`), preserving the connected road network, Rapier vehicle, saved wallet, protected residents, radio lifecycle and GitHub Pages workflow.

## 1. Make the taxi trustworthy

Use one physical curb position for the rendered customer, fare distance, map marker, route endpoint and rival target. Put the nearest passenger's pickup prompt ahead of shop entry. Restore driving focus after choosing duty/offers, and let Enter board even if a HUD button retained focus. Keep the low-speed pickup, travelled-distance payout, cancellation and concurrent-claim rules.

Acceptance: every customer's actual position is pickable; Enter after clicking an offer boards the nearby customer; touch pickup works; no fare appears without a completed ride.

## 2. Give every destination an environment

Create lazy interior scenes using the existing renderer. Batch static furniture and reuse rooms on subsequent visits. Freeze the parked auto, keep the radio independent, and return consistently to the street/auto.

| Destination  | Room                                                                 | Interaction                                                |
| ------------ | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| Eagle Towers | Glass-and-steel briefing room, conference table, presentation screen | Three short slides; L takes the roof lift                  |
| OpsFlash     | Timber home office with an operations screen                         | Connect SaaS tools → centralize data → ask → act           |
| Chaya corner | Counter, kettle, stove, steam, shelves and a table                   | A readable three-page newspaper; C/P/S order tea/snacks    |
| Music        | Acoustic panels, speakers, microphones and a mixing console          | Saved eight-step beat sequencer, tempo and phone banks     |
| RIFT         | Precision workshop and record-comparison tray                        | Exact one-paisa comparison and missing/new/changed records |
| Wetland      | Timber jetty, field station and water view                           | Field-guide pages, then observe resident crocodiles        |
| Observatory  | Ribbed dome and physical telescope                                   | Space-game slides, telescope and constellation selection   |

Acceptance: all seven rooms work by arrows/Enter, with little text; public links remain keyboard accessible; phone and fallback views are readable; no flattened illustration strips or generic bottom computer.

## 3. Bring the roads to life

Give pedestrians articulated heads, arms and legs. Vary chatting, clapping, chanting and police direction without moving residents into traffic. Alternate red/blue patrol beacons; respect reduced motion. Replace boxy bikes with open spokes, diamond frames, forks, tanks, exhausts, bent rider limbs and cycling motion. Add exterior stove embers, chimney smoke, speaker cones, sound ripples and a quiet proximity groove.

Generate streetlamps from actual shared road paths, with ground height, spacing, dry verges and clear building entrances. Generate signal poles from real junction approaches, using the same axis/phase schedule as traffic. Preserve closed-road sweeps and resident protection.

Acceptance: fixture positions are dry and outside road envelopes/entry bays; moving traffic and existing safety checks still pass; scenery captures show recognizable bikes, active crowds and beacons.

## 4. Make audio and map navigation coherent

Keep Ente as the first station. Add broadcaster-published HTTPS classic blues and classic-rock feeds. Keep static, actual-media readiness, bounded failure and stale-event cancellation. A room's Radio button/Q opens the tuner above the room without disposing its beat. The drum scheduler has cancellation for rapid start/stop while the context resumes.

Map arrows/Home/End select a location and show a compact preview. Enter or Drive Here sets a road route. Clicking a marker selects its preview; map arrow buttons support touch.

Acceptance: studio playback leaves radio time advancing and volume unchanged; nested tuning preserves beat playback; both new station choices work; stale media is removed; previews match the selected stop and set directions.

## Release gates

Run formatting, all 37 unit/physics checks, the TypeScript/Vite build and thirteen production-browser journeys. Review desktop, phone, landscape, all seven rooms and scenery captures. Advance main only after local checks pass. The existing three CI workers repeat the checks before Pages deployment. Verify the release commit, deployment result, live asset hashes and live visitor journeys. Physical iOS Safari and hardware FPS are separate from Chromium touch emulation.
