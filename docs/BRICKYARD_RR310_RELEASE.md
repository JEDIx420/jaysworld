# v0.9.1 — The Brickyard and the keys to the village

## Build plan and result

The south lawn opposite the five market stalls holds a Laurie Baker inspired open-air amphitheatre. Six curved exposed-brick seating terraces, stone caps, open aisles, perforated brick jali screens and a terracotta canopy frame the performance. Footprints are reserved before random houses and grove trunks are placed, and the seating and stage have static collisions. The small grove beyond Canal Road holds Little Explorers: swings carrying two children, a play tower with slide and ladder, a seesaw, a rotating roundabout, shade trees, benches and a perimeter fence.

The Brickyard has exactly five animated performers: lead singer/guitarist, second guitarist, bassist, keyboardist and drummer. The lead wears black clothes, white shoes and a proportionate green fedora, and plays a black Telecaster shape with a white pickguard. The production includes moving-head colour sweeps, visible beam cones, stage LEDs, line arrays, subwoofers, monitors, amps, keyboard keys, drum kit and cymbals. Classic-rock songs stream from 181.FM The Eagle over the native media path and fade with distance. The simulated band performs visually; the audio is an attributed live broadcast, not recordings of these characters or a fixed cover set. The normal vehicle radio is muted during audible concert playback and returns when the player leaves. A stage sound button supports pause and retry; stream outages display Retry rather than substitute an original synth loop. Lighting uses continuous sweeps rather than rapid flashing, and performance/reduced-motion settings limit effects and crowd animation.

The guided itinerary now covers the briefing room, rooftop, OpsFlash, RIFT, the music studio and beat activity, wetlands and crocodiles, Jay's newspaper, a completed taxi fare, and the observatory/telescope. Driving and discovering all seven destinations award the remaining accomplishments. Every one of the eight accomplishments and all seven visits are required before keys can be collected at the final observatory stop. The existing version-1 save remains compatible. Keys persist and are awarded once; a keys flag without complete progress is ignored.

After collecting keys, a road route leads back to Eagle Towers. A Sinister Black RR 310 is parked outside, pointing out of the forecourt. Stop beside it and use Enter or the interaction button. The bike replaces the player's active Rapier vehicle; only one vehicle simulates. The rider wears black armour and a black full-face helmet. Taxi offers, wallet, duty controls and the auto instruments disappear, replaced by a dark RR 310 Track inspired TFT with a blue tachometer, speed and gear readouts, RPM and shift indication. Keyboard, touch joystick, brake, boost, camera and map controls remain available. Returning to Eagle Towers allows parking the bike and taking the auto again.

## Model and handling

The mesh is original procedural geometry modeled from the supplied image: sculpted fairing and tank cross-sections, twin projector lights and running lights, windscreen and mirrors, silver Apache/red RR 310 decals, gold inverted fork tubes, split-spoke alloys, red rim tape, tyre grooves, drilled brake discs, radiator fins, red trellis tubes, rear shock spring, swingarm, chain/sprocket, silver exhaust, stepped seats and side stand. The v0.9.1 bodywork uses a sculpted shoulder crease and recessed duct, swept curved screen, fuller silver exhaust and high tail. The rear LED branches follow the additional user-supplied tail-light photo. A separately posed right leg retracts above 0.85 m/s and plants below 0.25 m/s; its sole follows the ground, while the rider is completely still at rest. This is an approximation of the reference, not a scanned or manufacturer CAD asset.

The bike has two suspension ray contacts, rear-wheel drive, RPM-coupled six-speed automatic shifting, an engine torque curve, drag, braking, walking-speed reverse, wet-grip adjustment, CCD collisions and assisted balancing. Both horizontal physics axes are locked in world space to prevent the east/west roll instability. Speed-limited yaw assistance makes both steering directions predictable; automatic stop brakes prevent creep. Visual lean follows the turn around the tyre contact line; a boost wheelie rotates around the rear axle and settles smoothly. Boost changes response and effects without increasing the 160 km/h ceiling. This is an accessible game simulation, not a validated motorcycle dynamics model.

Driving controls consult the current menu state when an event arrives. Closing Settings accepts the first throttle or boost press immediately, and a queued dialog-close event no longer clears newly pressed controls. A unit regression and the desktop ride journey cover this handoff.

The supplied image depicts the earlier bike. Published 2019 ratios are used, rather than the later 38 PS variant:

| Parameter                 | Value                                    |
| ------------------------- | ---------------------------------------- |
| Gear ratios 1–6           | 3.000, 2.063, 1.588, 1.286, 1.095, 0.955 |
| Primary / final reduction | 3.080 / 2.470                            |
| Wheelbase                 | 1.365 m                                  |
| Rear rolling radius       | 0.306 m, approximated from 150/60 R17    |
| Bike / rider mass         | 174 / 75 kg                              |
| Peak torque               | 27.3 Nm at 7,700 RPM                     |
| Performance ceiling       | 160 km/h                                 |

Classic-rock stream source: [181.FM public links](https://www.181.fm/links) and [The Eagle official player](https://player.181fm.com/?station=181-eagle). Playback uses the public live station; tracks and broadcast availability are controlled by the station.

Primary sources: [TVS 2019 owner manual](https://www.tvsmotor.com/-/media/Feature/Owners/User-Manual/OM_Apache-RR310_Rev-2.pdf?hash=9D63DDB801FB222ACC8682C71DEC53F3&la=en), [TVS launch specification](https://www.tvsmotor.com/media/press-release/tvs-apache-rr-310-signals-tvs-motor-companys-entry-into-the-super-premium-motorcycle-segment), [TVS Track-mode manual](https://www.tvsmotor.com/assets/img/brands/arive/pdf/Apache_RR310_BSVI_REV_2.pdf).

## Validation

On 13 October 2026, local formatting, all 66 unit/physics tests, the production build and all eight focused release browser journeys passed. The final bike, stationary right-foot pose, portrait/landscape TFT and day/night stage renders were reviewed locally before pushing.

Local Rapier benchmarks at 60 Hz on a flat surface measured approximately 3.13 s for 0–60 km/h, 6.93 s for 0–100 km/h, and 160 km/h maximum, with a 75 kg rider. These are simulated measurements; manufacturer published reference figures are approximately 2.93 s and 7.17 s. Gear, suspension, mass, braking, reverse, turning, wall collision, eight-heading balance and side impacts, real terrain, stationary right-foot contact, recovery, progression, persistence and reserved-layout tests are included in `tests/bike.test.ts`.

The local release suite retains the existing driving/room/traffic checks and adds desktop keys/mount/ride/park/reload, portrait/landscape touch HUD checks, both bike steering directions and the stopped-foot pose, and day/night concert and park captures. Concert checks verify real browser media playback using a deterministic PCM fixture, spatial volume, and suppression/restoration of the separate vehicle radio. They do not certify live broadcaster uptime. Browser checks and visual review are completed locally with Chromium before the final push. One GitHub job then verifies formatting, unit/physics tests and the build and deploys Pages. The complete browser suite is also available through the manual workflow input, in that same single job.
