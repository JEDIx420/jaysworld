# Jay's World: design and development roadmap

Updated 9 October 2026.

## Direction

A small, cohesive Kerala-inspired village, explored in an auto-rickshaw. The visitor can enjoy driving while discovering Jay's professional work and creative projects. A quick route reaches Eagle Eye; a Places list makes the content accessible without driving.

The setting is a fictional contemporary backwater village. Coconut palms, laterite, pitched tile roofs, verandahs, tea-shop objects, paddy plots, a canal, bridge, jetty, and woven houseboat establish its character. Keep the geography coherent and avoid assembling unrelated tourist landmarks.

## Current concept, v0.2

- Independently implemented Rapier raycast vehicle with three wheels.
- Fixed 60 Hz simulation and interpolated rendering.
- Keyboard and independent touch driving/camera pointers.
- Detailed procedural auto, driver, seats, glazing, mirrors, lights, mudguards, plate, and wheel pivots.
- Seven distinct exhibit buildings and destinations around a compact road loop.
- Instanced vegetation, paddy crops, rocks and lilies, with batched static model geometry.
- A moving houseboat, egrets, and a segmented crocodile with tail and limb movement.
- Golden-hour and evening lighting, moving water highlights and ripples, stars and warm lamps.
- A miniature beat sequencer, exact-money reconciliation example, workflow examples, star chart, and a wetland viewing action.
- Public content, outbound project links, map, visit state, dialogs, loading and fallback.
- Optional Malayalam internet radio through secure live endpoints and Radio Browser.

This is a concept release. Detailed procedural meshes do not replace the eventual custom asset production and visual iteration needed to reach the craft of the reference.

## Visitor route

| Place                    | Content                                 | Interaction                                                        |
| ------------------------ | --------------------------------------- | ------------------------------------------------------------------ |
| Tea shop                 | Jay's introduction, background, contact | Explore the introduction; take the road                            |
| Eagle Eye studio         | AI consulting and GTM engineering       | Inspect workflow examples and capabilities                         |
| OpsFlash operations room | Connected intelligence and workflows    | Switch between research, content and growth examples               |
| RIFT workshop            | Exact data reconciliation in Rust       | Compare illustrative records and preserve a one-paisa difference   |
| Music room               | Music & Beats                           | Change and play an eight-step drum sequence                        |
| Observatory              | The Quiet Between Stars                 | Move across a small chart, switch to evening, launch the full game |
| Wetland jetty            | SALTWATER                               | Watch the crocodile and open the standalone game's source          |

RIDELINE and Dinner Date with Death can be added to a small arcade location after this core route has been reviewed.

## Architecture

TypeScript and Three.js own rendering and original procedural assets. Rapier owns the chassis, raycast suspension, props and collisions. Vite produces static HTML, CSS and JavaScript for GitHub Pages.

The project interface and fallbacks load before the dynamic engine module. No backend, user authentication, provider API key, live AI endpoint, client database, or multiplayer server is needed.

Keep models, collisions, vehicle mount points, world coordinates, exhibits, and public content separate. Future GLBs must use metres and preserve the auto's independent wheel steering and spin pivots. Retain editable Blender sources and verify exports in the actual renderer.

## Follow-up milestones

1. **Review this live concept.** Gather feedback on the driving feel, camera, scale, atmosphere and professional presentation. Measure real phone performance.
2. **Hero asset production.** Model the final auto, tea shop and Eagle Eye frontage in Blender. Establish one coherent material and texture library; compare a driving clip before expanding.
3. **Terrain and shoreline.** Replace the recovery-floor terrain with authored banks, slopes, collision meshes, bridge transitions, and a clearer boundary.
4. **Content and project depth.** Add approved screenshots and focused case studies: problem, Jay's role, resulting behavior, evidence. Extend the creative interactions where they add value.
5. **Loading and rendering.** Evaluate separately served physics WASM, compressed textures and GLBs, LODs, adaptive quality and culling. Add weather only after device measurements support it.
6. **Release refinement.** Recheck public URLs, direct links, browser compatibility, audio availability, accessibility, font enlargement, and contact paths.

Every milestone has a review gate. This document does not imply that work continues unattended between conversations.

## Quality targets and limits

Aim for 60 FPS on a representative recent desktop and 30 FPS on a representative mid-range phone. These are targets; automated software-rendered checks do not measure actual-device performance.

The current terrain collision is simplified and water uses recovery boundaries. Small decorative props can intentionally lack collision, while buildings, bridge rails, palms and dynamic objects have collision. The crocodile is an ambient exhibit, not the full survival game.

The RIFT example is a local illustrative comparison using exact integer amounts. It does not execute or benchmark the Rust engine. Workflow examples contain illustrative steps, not production client data or live runs.

Radio is optional. Secure streams can fail, move, restrict regions or change programme; the player keeps those failures separate from the rest of the world.

## References

- https://bruno-simon.com/
- https://github.com/brunosimon/folio-2025
- https://rapier.rs/docs/user_guides/javascript/vehicle_controller/
- https://www.keralatourism.org/faq/what-makes-keralas-traditional-architecture-unique
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://vite.dev/guide/static-deploy.html#github-pages
- https://api.radio-browser.info/
