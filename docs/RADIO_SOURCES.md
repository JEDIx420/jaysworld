# Malayalam radio and studio effects

Verified 9 October 2026. The first Start driving gesture starts **Ente Radio 91.2**, alongside the auto sounds. Modern browser audio policy requires that gesture; this site does not try to bypass it. Radio can be stopped, switched, or adjusted independently of the engine.

| Station                | Homepage                          | HTTPS stream                                              | Verification / effect support                                                                                                                                          |
| ---------------------- | --------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ente Radio 91.2        | https://enteradio.com/            | https://cast1.my-control-panel.com/proxy/enteradio/stream | Official homepage player endpoint; HTTP 200, audio/mpeg, 512 bytes read; Access-Control-Allow-Origin: \* for Pages and local origins. Default station; studio effects. |
| Radio Digital Malayali | https://radio.digitalmalayali.in/ | https://radio.digitalmalayali.in/listen/stream/radio.mp3  | HTTP 200, audio/mpeg; allows the Pages origin; studio effects.                                                                                                         |
| Radio MACFAST 90.4     | https://www.radiomacfast.org/     | https://icecast.octosignals.com/radiomacfast              | HTTP 200, audio/mpeg; no CORS permission observed; direct playback.                                                                                                    |
| Radio Keralam 1476     | https://radiokeralam.com/         | https://ice31.securenetsystems.net/RADIOKERAL             | Official homepage endpoint; HTTP 200, audio/aac in earlier probe; direct playback.                                                                                     |

Ente Radio's Radio Browser UUID is cddf5ab5-ff56-4a0c-8634-91a31e895fe5. Its official stream replaces older unresponsive directory URLs.

## Studio

CORS-enabled stations use a Web Audio chain: bass shelf → low-pass filter → dry, feedback echo, and convolution reverb outputs. A slow oscillator modulates the filter for wobble. Presets set these same controls; they do not load additional audio. Engine sound and the beat sequencer are separately synthesised.

Stations without confirmed processing permission stay on direct HTML audio. Attaching them to a MediaElementAudioSourceNode would risk silent output, so effects are disabled with an explanation. Visitors can choose a supported station or a local audio file. Local files use an object URL, stay in the browser, and are released on stop/switch; the file limit is 100 MB.

Endpoint availability and CORS policies can change. HTTP probes confirm reachable audio bytes, not sustained browser playback or rights to reuse a programme. Automated browser checks use generated PCM fixtures through the real audio element; the optional live check is separate.

## Directory

Additional Radio Browser discovery is visitor-requested. The player retries bounded mirror requests and accepts checked Malayalam HTTPS streams with supported codecs. It rejects credentials, obvious private endpoints, and HLS playlists from the generic audio path. Station labels are text, never directory-supplied HTML. Curated stations remain available if discovery fails.

## Rights and sources

Radio Browser is an open-source directory. Broadcasters own their streams and programming; the site does not download, rehost, bundle, or relicense music. Each station has a homepage link. Original engine and interface sounds are generated locally, with no third-party sound samples.

- https://enteradio.com/
- https://api.radio-browser.info/
- https://docs.radio-browser.info/
- https://developer.chrome.com/blog/autoplay
- https://webaudio.github.io/web-audio-api/#MediaElementAudioSourceNode
