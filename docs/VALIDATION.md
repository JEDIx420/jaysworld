# Concept validation

Checked 9 October 2026 for v0.2. This is a playable concept, with the remaining production work described in BUILD_PLAN.md.

## Observed checks

| Check                                                             | Result                                      |
| ----------------------------------------------------------------- | ------------------------------------------- |
| Strict TypeScript checking and Vite production build              | Passed                                      |
| Targeted physics, input, reconciliation and radio-directory tests | 11 passed                                   |
| Production browser scenarios                                      | 7 passed                                    |
| Desktop and mobile visual review                                  | Reviewed at 1440×900, 390×844 and 320×640   |
| Curated radio endpoint HTTP probes                                | All three returned HTTP 200 with audio data |

The browser checks run Chromium against the actual HTTP-served production build. The local runtime used software rendering and automatically selected Performance graphics.

The seven browser scenarios cover:

1. Rendered world, forward driving, braking, paused physics in dialogs, and recovery to the tea shop.
2. All seven project exhibits, exact reconciliation output, an editable and playing beat sequence, visit count, and the actual evening lighting transition.
3. Touch driving at 390px, independent camera and driving pointers, pointer cancellation, and exhibit navigation.
4. A 320px layout, a direct RIFT fragment link, and a reload that restores the exhibit.
5. No radio autoplay or stream preloading, a failed station, switching to a playable audio fixture through the real HTML audio element, and stopping playback.
6. Public introduction and project links when JavaScript is disabled.
7. All project content and contact navigation when WebGL is unavailable.

The successful browser journeys produced no unexpected JavaScript or shader console errors. The intentionally failed station generates an expected network error; the no-WebGL scenario deliberately exercises the renderer's error and fallback path.

## Radio verification boundary

Curated streams returned HTTP 200, the expected MPEG/AAC media types, and audio bytes in separate HTTPS probes. Sustained live broadcaster playback was not confirmed in this headless environment: the optional MACFAST playback check timed out. The passing browser playback check uses a generated PCM fixture, not a recording or a claim that a broadcaster was heard live. The optional JAYSWORLD_LIVE_RADIO=1 check is available for a normal connected browser environment.

## Build observations

The main interface JavaScript is approximately 30.8 kB before compression (11.7 kB gzip). The lazy 3D engine is approximately 4.95 MB before compression (1.83 MB gzip), largely because the Rapier compatibility package embeds WASM. Vite reports this large chunk; separating and optimising the physics download remains a roadmap item. Malayalam signage uses a locally hosted 24.1 kB WOFF2 subset.

Automated touch emulation and software rendering do not establish physical-phone performance. Quality targets of 60 FPS desktop and 30 FPS phone remain targets to measure on actual devices.

## GitHub checks and publishing

The repository workflow repeats installation, targeted tests, the production build and browser checks on pushes to main. It uploads the built Pages artifact and browser diagnostics. Deployment runs only on a manual workflow dispatch, after Jay has enabled Pages with GitHub Actions as its source. This validation does not claim that a public deployment has been enabled or visited.
