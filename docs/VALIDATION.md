# Village edition validation

Checked 9 October 2026 for v0.3.

## Checks

| Check                                                                         | Result                                                                                                        |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Strict TypeScript and Vite production build                                   | Passed                                                                                                        |
| Physics, input, reconciliation, directory, fares, routing, and wildlife tests | 18 passed                                                                                                     |
| Production browser journeys                                                   | 9 scenarios, full run plus focused observation / fallback verification                                        |
| Visual review                                                                 | Desktop 1440×900; phone 390×844 and 320×640; tea storefront, newspaper, crocodile hunt, telescope, radio desk |
| Ente Radio endpoint                                                           | HTTP 200, audio/mpeg, audio bytes; CORS allows Pages and local origins                                        |

The nine production browser scenarios cover:

1. Rendering, real keyboard acceleration and braking, paused physics in dialogs, and recovery.
2. All seven project papers, exact reconciliation, an editable playing beat, visited count, and evening lighting.
3. Touch driving, independent camera / driving pointers, cancellation, and phone newspaper navigation.
4. A 320px layout, direct project fragment links, and reload.
5. No stream preloading before the starting gesture; default Ente playback through the real audio element, enabled effects, presets, failed-station recovery, direct playback, and stop.
6. Storefront visits, three-page newspapers, funded tea/snack purchases, saved wallet accounting, crocodile selection / zoom / hunting, and telescope constellations / magnification.
7. Passenger pickup, direct-visit cancellation, wallet protection, and refusal of unfunded tea purchases.
8. Public content with JavaScript disabled.
9. Project content and contact links with WebGL unavailable.

The fare tests include an actual Rapier drive from pickup to destination, slow drop-off, payment, tea/snack spending, and restored wallet data. Another test rejects untravelled rides and teleports. Wildlife tests sample three minutes of swim cycles to check separation, diving/surfacing, a requested hunt, jaw motion, all four legs, tail movement, and prey disappearance.

Desktop and phone visual review led to a clearer opening screen, bounded newspaper width, usable close buttons, separate crocodile swim areas, and less rendering behind reading dialogs. Browser still captures temporarily hold only the world's animation loop and restore it immediately afterward; interaction assertions run against the normal simulation. Software-rendered hunt / lighting waits are bounded at 45 seconds.

The browser journeys use the production build over HTTP. Expected station-failure and no-WebGL errors exercise explicit recovery paths. Automated screenshots and touch emulation do not establish physical-device frame rates.

## Radio boundary

Ente's stream URL comes from its official homepage. HTTPS probes returned real MPEG audio bytes and cross-origin permission. Browser playback and effects tests use generated PCM audio fixtures to remain independent of broadcaster availability. Sustained live broadcaster playback has not been confirmed in this headless environment. Set JAYSWORLD_LIVE_RADIO=1 for the optional live check in a connected browser environment.

## Build and release

The lightweight interface is about 50.4 kB raw / 18.9 kB gzip. The lazy 3D / physics bundle is about 4.97 MB raw / 1.84 MB gzip, chiefly the compatibility package's embedded WASM. Malayalam signage uses a locally hosted 24.1 kB WOFF2 subset. Separating physics WASM and measuring real-device performance remain optimisation work.

GitHub repeats formatting, tests, production build, and all nine browser journeys on pushes to main. It uploads the Pages build artifact and browser diagnostics. Publishing remains a manual Run workflow action under Jay's control; pushing code does not change Pages settings or publish automatically.

The road floor and water recovery zones remain simplified. The telescope is an illustrated sky, and the wetland is a portfolio exhibit. See BUILD_PLAN.md for further asset and terrain work.
