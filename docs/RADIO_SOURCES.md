# Malayalam radio sources

Checked 9 October 2026.

The player uses a small curated set of HTTPS audio endpoints plus optional discovery through the open-source Radio Browser API. Curated stations are available without a directory request. Playback begins only after the visitor selects a station.

| Station                | Homepage                          | Stream                                                   | Probe result                           |
| ---------------------- | --------------------------------- | -------------------------------------------------------- | -------------------------------------- |
| Radio Digital Malayali | https://radio.digitalmalayali.in/ | https://radio.digitalmalayali.in/listen/stream/radio.mp3 | HTTP 200, audio/mpeg, 1,024 bytes read |
| Radio MACFAST 90.4     | https://www.radiomacfast.org/     | https://icecast.octosignals.com/radiomacfast             | HTTP 200, audio/mpeg, 1,024 bytes read |
| Radio Keralam 1476     | https://radiokeralam.com/         | https://ice31.securenetsystems.net/RADIOKERAL            | HTTP 200, audio/aac, 1,024 bytes read  |

Digital Malayali and MACFAST's endpoints were checked against Radio Browser entries. Radio Keralam's endpoint appears in its own homepage player. A different Keralam endpoint returned HTTP 401 and was not used in the curated player.

## Directory behavior

- Visitor-requested discovery, not a request on every page load.
- Discover mirror names from Radio Browser when possible, randomise and retry bounded requests.
- Require checked, Malayalam, HTTPS streams with a supported codec.
- Use resolved stream URLs. Filter HLS playlists from the generic audio path instead of claiming universal browser support.
- Reject credentials in URLs and obvious local/private-address endpoints.
- Render station names as text; no directory-supplied HTML, scripts, images or embedded players.
- Record Radio Browser station clicks when a visitor selects a directory station.
- Keep curated stations available if discovery is unavailable.

HTML audio plays directly from the station. The audio is not routed through Web Audio, so a station's lack of CORS permission for audio analysis does not mute it. The beat sequencer and engine sounds are separately synthesised locally.

## Attribution

Radio Browser is an open-source directory; that does not make every listed station or broadcast open-source music. This site streams station broadcasts through their public endpoints, credits the stations, and offers their homepage links. It does not download, rehost, bundle, or grant reuse rights over broadcasts.

Station availability, codec support, geographic restrictions, and programmes can change. The player provides stop, station switching, volume, loading timeouts and a visible unavailable state.

References:

- https://api.radio-browser.info/
- https://docs.radio-browser.info/
- https://www.radiomacfast.org/
- https://radiokeralam.com/
