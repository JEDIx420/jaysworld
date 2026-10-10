# v0.7 validation

The release extends v0.6 at `446a746b6515e848f292e4e0b18b8a5f1bf17d5f`. The implementation plan is in GUIDED_ROADS_PLAN.md. This document distinguishes local automated evidence from physical-device validation.

## Local gates

The candidate must pass formatting, 47 unit/physics tests, the TypeScript/Vite production build, and all eighteen production-browser journeys before moving main. The three CI workers repeat those checks and gate deployment.

On 10 October 2026, formatting, all 47 unit/physics tests and the production build passed locally. The full browser run passed sixteen journeys; focused reruns then passed passenger pickup at the actual studio stop and observatory re-entry, together with desktop driving and the saved company journey. All eighteen distinct scenarios have passing results. Pickup no longer assumes the old spawn is beside a customer, and the observatory assertion accepts the uppercase storefront title. The minute-long traffic scenario passed with every actor progressing and seventeen market residents. Welcome, roof/eagle, portrait/landscape instruments, boost and driveway captures were inspected; the opening camera's obstructing utility pole was moved to the verge.

The unit/physics suite covers three-wheel support/acceleration/braking/steering, four-wheel traffic suspension/steering/braking, static contacts and CCD, resets, touch mapping, exact reconciliation, secure station filtering, terrain triangle agreement, physical hill climbing, field clearance, connected dry routes, resident yielding/sweeps, fare travel/payment/cancellation/save migration, concurrent player/rival claims, four available offers, cooled-down passengers, front/side/back/diagonal closure sweeps, verge placement, collision-free traffic spawn/bay clearance, mutually exclusive signals and clearance, shared day/weather progression, the side observatory terrace, crocodile separation, jaw/capture timing and continuous fish/crocodile trajectories.

## Production-browser journeys

1. Desktop keyboard start on the road outside Eagle Towers, optional shop entry with Enter, roof lift/eagles, correct left/right look, driving, braking, parked menus and reset.
2. All seven short exhibits, arrow navigation, distinct interior screens and PPT slides, exact RIFT results, beat editing/playback/stop with radio time/volume independence and a nested tuner and return to driving.
3. 390px touch driving, independent look input, pointer cancellation, analog HUD and the four-step phone drum bank.
4. 320px/430px/short-landscape layouts, direct-link reload and orientation changes without page overflow.
5. First-gesture radio with real media fixtures, rapid seeking, failed stations, recovery, power and preserved off preference.
6. Crocodile stalking/catch, target selection, zoom, elevated observatory visits and constellation changes.
7. Moving traffic, four offers, selected fare routes, off-duty roaming, an existing wallet and a funded tea purchase.
8. Night/day/rain transitions and readable scenes with reduced-motion preference.
9. Slow and missing signals: static/loading until actual playback and a bounded no-signal state.
10. WebGL fallback with all seven projects and public links.
11. Enter pickup after clicking a fare offer, boarding state and touch pickup.
12. Keyboard map previews/routes and readable phone office/tea/observatory/wetland rooms.
13. Blues/rock seeking, cancellation of stale media and one active native audio element.
14. Road-first shared-link start and reload; centered three-way welcome; optional company route, expanding X prompt and saved accomplishments.
15. The radio renders every world animation frame with no backdrop blur; unchanged fare offers retain their existing buttons.
16. 320px/430px/short-landscape instruments without map/boost or logo/duty overlap; independent touch boost and cancellation/rotation release.
17. Actual driving out of the observatory driveway and back through the guardrail opening, then optional entry.
18. Every traffic actor progresses over a full minute of simulation, bounded stranding away from the player, and at least fourteen market residents.

Still captures briefly hold only the world’s render callback and restore it immediately. Assertions use the normal simulation. Expected media failures and the explicitly tested WebGL failure are separated from application exceptions. Diagnostics record draw calls, triangle counts, actor positions and climate state. Desktop, phone, landscape, instrument, radio, roof, hill, crocodile, night and rain renders are reviewed visually.

The local Chromium renderer is SwiftShader. These checks establish functional desktop/touch behavior, not 60 FPS on a physical desktop or 30 FPS on an iPhone. Real iOS Safari, safe-area/browser-toolbar behavior and hardware frame-time/memory profiling remain unverified. Performance mode limits the traffic pool, rain particles, resolution and shadows while keeping the same gameplay/safety rules.

## Size and deployment

The interface is about 78 kB raw / 28.5 kB gzip. The lazy 3D/physics bundle is about 5.03 MB raw / 1.86 MB gzip, principally the embedded Rapier compatibility WASM. The Malayalam WOFF2 subset is 24.1 kB. Cloud texture generation uses canvas in the existing client. No remote 3D assets, external raster assets, secrets or server functions are required.

Successful main builds upload one Pages artifact after all three browser workers finish. Deployment verification checks the exact release commit/run, fetched live asset hashes and a live browser journey. The previous v0.6 commit (`446a746b6515e848f292e4e0b18b8a5f1bf17d5f`) is the immediate rollback point.

## v0.6 evidence (previous release)

Formatting, all 37 unit/physics checks, the TypeScript/Vite build and all thirteen production-browser journeys pass locally. The seven-room tour was also rerun in isolation after a local Chromium process crashed before creating its page. Its assertions confirm simultaneous radio/beat playback at unchanged radio volume, nested tuning without stopping the beat, and return to the parked auto. Passenger pickup passes through Enter after offer selection and through the phone control.

The new True Blues and The Eagle HTTPS feeds returned HTTP 200, `audio/mpeg` and valid MP3 frames on 10 October 2026. Deterministic browser fixtures separately test tuner lifecycle and audio independence; station availability remains external to the static site.

The additional v0.6 unit checks cover every actual curb pickup, shared route endpoints, competing taxi claims, dry spaced streetlights outside entry bays, real junction poles and the expanded station dial. The existing fare physics test now aims at the actual relocated destination rather than the old centreline stop.
