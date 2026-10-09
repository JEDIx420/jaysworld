import './style.css';
import '@fontsource/noto-sans-malayalam/malayalam-400.css';
import { PLACES, nearestPlace, type Place } from './projects';
import { VillageRadio } from './radio';
import { renderDemo, renderDetails } from './demos';
import { JourneyAudio } from './audio';
import { FareGame, type Snack } from './fares';
import { districtAt, routeBetween, distance2, type Point } from './village';
import { drawVillageMap } from './map';
import type { Journey, ViewMode } from './engine';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('world'),
  loading = $('loading'),
  project = $<HTMLDialogElement>('project-dialog'),
  places = $<HTMLDialogElement>('places-dialog'),
  settings = $<HTMLDialogElement>('settings-dialog'),
  radioDialog = $<HTMLDialogElement>('radio-dialog');
const dialogs = [project, places, settings, radioDialog],
  radio = new VillageRadio(),
  audio = new JourneyAudio(),
  visited = new Set<string>();
let saved: unknown;
try {
  saved = JSON.parse(localStorage.getItem('jaysworld-duty-v1') ?? 'null');
} catch {
  /* Storage is optional. */
}
const fares = new FareGame(saved);
let journey: Journey | undefined,
  activePlace: Place | undefined,
  visitingPlace: Place | undefined,
  demoDispose = () => {},
  toastTimer = 0,
  night = false,
  performanceMode = matchMedia('(pointer: coarse)').matches,
  lastPlace = '',
  booted = false,
  sceneFailed = false,
  experienceStarted = false,
  paperPage = 0,
  viewMode: ViewMode = 'drive',
  routePlace: Place | undefined,
  position: Point = { x: -51, z: 29 },
  speed = 0,
  yaw = 0,
  lastPassenger = '',
  lastDutySignature = '';
const paused = () => dialogs.some((d) => d.open) || document.hidden || !experienceStarted;
const announce = (text: string) => {
  $('announcements').textContent = text;
};
const save = () => {
  try {
    localStorage.setItem('jaysworld-duty-v1', JSON.stringify(fares.saved));
  } catch {
    /* Private browsing may disable storage. */
  }
};
function toast(text: string) {
  $('toast').textContent = text;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => ($('toast').hidden = true), 4000);
  announce(text);
}
function closeDialogs() {
  dialogs.forEach((d) => {
    if (d.open) d.close();
  });
}
function open(dialog: HTMLDialogElement) {
  closeDialogs();
  dialog.showModal();
  journey?.pause();
}
function cancelRide() {
  if (fares.cancel())
    toast('The ride was cancelled. Pick up the passenger again to earn the fare.');
  routePlace = undefined;
  updateDuty();
}
function updateDuty() {
  const state = fares.snapshot,
    p = fares.passenger,
    target = routePlace?.trigger ?? fares.target;
  const signature = [
    booted,
    state.wallet,
    state.completed,
    state.onboard,
    Math.round(position.x),
    Math.round(position.z),
    speed < 1.2,
    routePlace?.id,
    viewMode,
    fares.actionAt(position, speed),
  ].join('|');
  if (signature === lastDutySignature) return;
  lastDutySignature = signature;
  const key = state.passengerIndex + ':' + state.onboard;
  if (key !== lastPassenger) {
    lastPassenger = key;
    journey?.setPassenger(state.passengerIndex, state.onboard);
  }
  $('wallet').textContent = '₹' + state.wallet;
  $('fare-title').textContent = state.onboard
    ? p.name + ' → ' + fares.destination.label
    : p.name + ' is waiting · ' + fares.pickup.label;
  $('fare-description').textContent = state.onboard
    ? 'A passenger on board. Drop off safely for ₹' + state.fare + '.'
    : p.line + ' · Fare ₹' + state.fare;
  $('fare-distance').textContent = routePlace
    ? 'Route: ' + routePlace.location
    : Math.round(distance2(position, target)) +
      ' m ' +
      (state.onboard ? 'to drop-off' : 'to pickup');
  const action = fares.actionAt(position, speed);
  $('fare-action').hidden = !action || viewMode !== 'drive';
  $('fare-action').textContent = action === 'dropoff' ? 'Drop off · E' : 'Pick up · E';
  const route = routeBetween(position, target).points;
  journey?.route(route);
  if (places.open || !booted)
    drawVillageMap($<HTMLCanvasElement>('village-atlas'), position, yaw, route, true);
  $('fare-card').dataset.onboard = String(state.onboard);
  $('fare-card').dataset.completed = String(state.completed);
}
function act() {
  startExperience();
  if (viewMode !== 'drive') return;
  const action = fares.actionAt(position, speed);
  if (action) {
    const result = fares.interact(position, speed);
    if (result) {
      routePlace = undefined;
      save();
      audio.cue(action === 'pickup' ? 'pickup' : 'coins');
      toast(result.message);
      updateDuty();
    }
  } else if (activePlace) visit(activePlace);
}
function visit(place: Place) {
  startExperience();
  visitingPlace = place;
  journey?.visit(place);
}
function updatePlaces() {
  const list = $('places-list');
  list.replaceChildren();
  PLACES.forEach((place, index) => {
    const entry = document.createElement('div');
    entry.className = 'directory-entry';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'place-row';
    button.dataset.place = place.id;
    const num = document.createElement('span');
    num.className = 'place-num';
    num.textContent = String(index + 1).padStart(2, '0');
    const copy = document.createElement('span');
    copy.className = 'place-copy';
    const title = document.createElement('strong'),
      location = document.createElement('small');
    title.textContent = place.id === 'about' ? 'Meet Jay' : place.name;
    location.textContent = place.location;
    copy.append(title, location);
    const status = document.createElement('span');
    status.className = 'place-status' + (visited.has(place.id) ? ' visited' : '');
    status.textContent = visited.has(place.id) ? 'Read again' : 'Read paper';
    button.append(num, copy, status);
    button.addEventListener('click', () => showProject(place));
    const actions = document.createElement('div');
    actions.className = 'directory-actions';
    const route = document.createElement('button');
    route.type = 'button';
    route.textContent = 'Get directions';
    route.dataset.route = place.id;
    route.disabled = sceneFailed;
    route.addEventListener('click', () => {
      routePlace = place;
      closeDialogs();
      journey?.leaveView();
      updateDuty();
      toast('Follow the gold route to ' + place.location + '.');
    });
    const storefront = document.createElement('button');
    storefront.type = 'button';
    storefront.textContent = 'Visit storefront ↗';
    storefront.dataset.visit = place.id;
    storefront.disabled = sceneFailed;
    storefront.addEventListener('click', () => {
      if (!journey) {
        showProject(place);
        return;
      }
      cancelRide();
      closeDialogs();
      journey?.reset(place);
      position = { ...place.trigger };
      startExperience();
      visit(place);
    });
    actions.append(route, storefront);
    entry.append(button, actions);
    list.append(entry);
  });
  $('visited-count').textContent = visited.size + ' / ' + PLACES.length;
}
function turnPage(page: number) {
  paperPage = Math.max(0, Math.min(2, page));
  project
    .querySelectorAll<HTMLElement>('[data-paper-page]')
    .forEach((el) => (el.hidden = Number(el.dataset.paperPage) !== paperPage));
  project
    .querySelectorAll<HTMLButtonElement>('[data-page]')
    .forEach((el) =>
      el.setAttribute('aria-pressed', String(Number(el.dataset.page) === paperPage)),
    );
  $('paper-page-number').textContent = 'PAGE ' + (paperPage + 1) + ' / 3';
  $<HTMLButtonElement>('paper-prev').disabled = paperPage === 0;
  $<HTMLButtonElement>('paper-next').disabled = paperPage === 2;
  audio.cue('paper');
  project.scrollTop = 0;
}
function showProject(place: Place) {
  demoDispose();
  demoDispose = () => {};
  visited.add(place.id);
  updatePlaces();
  open(project);
  $('project-category').textContent = place.category;
  $('project-number').textContent = String(PLACES.indexOf(place) + 1).padStart(2, '0');
  $('project-location').textContent = place.location;
  $('project-title').textContent = place.name;
  $('project-summary').textContent = place.summary;
  $('project-body').textContent = place.body;
  const links = $('project-links');
  links.replaceChildren();
  for (const link of place.links) {
    const a = document.createElement('a');
    a.textContent = link.label;
    a.href = link.href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    links.append(a);
  }
  renderDetails(place.id, $('project-details'));
  demoDispose = renderDemo(place.id, $('project-demo'), {
    onMusic: () => radio.stop(),
    watchCroc: () => {
      if (!journey || sceneFailed) {
        toast(
          'The wetland view needs 3D graphics. The project links and paper are still available.',
        );
        return;
      }
      project.close();
      observeCrocs();
    },
    watchStars: () => {
      if (!journey || sceneFailed) {
        toast(
          'The telescope needs 3D graphics. The star chart and project links are still available.',
        );
        return;
      }
      project.close();
      observeStars();
    },
  });
  if (!$('project-demo').childElementCount)
    $('project-demo').textContent =
      place.id === 'about'
        ? 'Your next story is outside: pick up a passenger, earn a fare, and return for tea and a newspaper.'
        : 'Take a look at the storefront, or follow the project link on the front page.';
  turnPage(0);
  history.replaceState(null, '', '#' + place.id);
  announce(place.name);
}
function showPlaces() {
  updatePlaces();
  updateDuty();
  open(places);
}
function applyNight() {
  document.body.classList.toggle('night', night);
  $('time-button').textContent = night ? 'Evening' : 'Golden hour';
  $('time-button').setAttribute('aria-pressed', String(night));
  journey?.night(night);
}
function observeCrocs() {
  startExperience();
  journey?.feedCroc();
}
function observeStars() {
  startExperience();
  night = true;
  applyNight();
  journey?.tourObservatory();
}
function startExperience() {
  if (experienceStarted || !booted) return;
  experienceStarted = true;
  document.body.classList.add('started');
  $('welcome').classList.add('quiet');
  $('driving-hint').classList.add('quiet');
  radio.playDefault();
  void audio
    .enable()
    .then(() => {
      $('sound-button').textContent = 'Sound on';
      $('sound-button').setAttribute('aria-pressed', 'true');
      canvas.dataset.sound = 'on';
    })
    .catch(() => toast('Engine sound needs another tap. You can enable it in Settings.'));
  journey?.pause();
  canvas.focus({ preventScroll: true });
  updateDuty();
}
$('start-driving').addEventListener('click', startExperience);
window.addEventListener(
  'keydown',
  (e) => {
    if (
      !dialogs.some((d) => d.open) &&
      ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
        e.code,
      )
    )
      startExperience();
  },
  { capture: true },
);
$('joystick').addEventListener('pointerdown', startExperience, { capture: true });
$('places-button').addEventListener('click', showPlaces);
$('minimap-button').addEventListener('click', showPlaces);
$('loading-places').addEventListener('click', showPlaces);
$('about-link').addEventListener('click', (e) => {
  e.preventDefault();
  showProject(PLACES[0]);
});
$('radio-button').addEventListener('click', () => open(radioDialog));
$('settings-button').addEventListener('click', () => open(settings));
$('interaction-button').addEventListener('click', () => {
  if (activePlace) visit(activePlace);
});
$('fare-action').addEventListener('click', act);
$('fare-route').addEventListener('click', () => {
  routePlace = undefined;
  updateDuty();
  toast('Follow the gold route. Stop beside the passenger and press E.');
});
$('view-back').addEventListener('click', () => journey?.leaveView());
$('read-paper').addEventListener('click', () => {
  if (visitingPlace) showProject(visitingPlace);
});
$('view-experience').addEventListener('click', () => {
  if (!visitingPlace) return;
  if (visitingPlace.id === 'saltwater') observeCrocs();
  else if (visitingPlace.id === 'space') observeStars();
  else if (visitingPlace.id === 'music') open(radioDialog);
  else {
    showProject(visitingPlace);
    turnPage(2);
  }
});
$('zoom-in').addEventListener('click', () => journey?.zoom(-160));
$('zoom-out').addEventListener('click', () => journey?.zoom(160));
$('croc-select').addEventListener('change', () =>
  journey?.selectCroc(Number($<HTMLSelectElement>('croc-select').value)),
);
$('croc-hunt').addEventListener('click', () => journey?.hunt());
document
  .querySelectorAll<HTMLButtonElement>('[data-star]')
  .forEach((b) => b.addEventListener('click', () => journey?.constellation(b.dataset.star!)));
document.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach((b) =>
  b.addEventListener('click', () => {
    const result = fares.buy(
      b.dataset.buy as Snack,
      nearestPlace(position.x, position.z, 9)?.id === 'about' && visitingPlace?.id === 'about',
    );
    toast(result.message);
    if (result.ok) {
      save();
      journey?.serve(b.dataset.buy!);
      audio.cue(b.dataset.buy === 'tea' ? 'tea' : 'coins');
      $('tea-receipt').textContent = result.message;
    }
    updateDuty();
  }),
);
project
  .querySelectorAll<HTMLButtonElement>('[data-page]')
  .forEach((b) => b.addEventListener('click', () => turnPage(Number(b.dataset.page))));
$('paper-prev').addEventListener('click', () => turnPage(paperPage - 1));
$('paper-next').addEventListener('click', () => turnPage(paperPage + 1));
let swipeStart = 0;
project.addEventListener('touchstart', (e) => (swipeStart = e.changedTouches[0].clientX), {
  passive: true,
});
project.addEventListener(
  'touchend',
  (e) => {
    if ((e.target as HTMLElement).closest('button,input,canvas,select,a')) return;
    const delta = e.changedTouches[0].clientX - swipeStart;
    if (Math.abs(delta) > 80) turnPage(paperPage + (delta < 0 ? 1 : -1));
  },
  { passive: true },
);
$('reset-button').addEventListener('click', () => {
  cancelRide();
  journey?.reset();
  closeDialogs();
  toast('Back at the tea shop.');
});
$('camera-button').addEventListener('click', () => {
  journey?.camera();
  closeDialogs();
  toast('Camera reset.');
});
$('quality-button').textContent = performanceMode ? 'Performance' : 'Balanced';
$('quality-button').addEventListener('click', () => {
  performanceMode = !performanceMode;
  journey?.quality(performanceMode);
  $('quality-button').textContent = performanceMode ? 'Performance' : 'Balanced';
});
$('time-button').addEventListener('click', () => {
  night = !night;
  applyNight();
});
$('sound-button').addEventListener('click', async () => {
  try {
    const enabled = await audio.toggle();
    $('sound-button').textContent = enabled ? 'Sound on' : 'Sound off';
    $('sound-button').setAttribute('aria-pressed', String(enabled));
    canvas.dataset.sound = enabled ? 'on' : 'off';
  } catch {
    toast('Audio is unavailable in this browser.');
  }
});
for (const dialog of dialogs) {
  dialog.querySelector('[data-close]')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (dialog === project && !project.open) {
      demoDispose();
      demoDispose = () => {};
    }
    journey?.pause();
    if (!paused() && booted) canvas.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', (e) => {
    const r = dialog.getBoundingClientRect();
    if (
      e.target === dialog &&
      (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
    )
      dialog.close();
  });
}
document.addEventListener('visibilitychange', () => journey?.pause());
updatePlaces();
updateDuty();
const progress = (value: number, text: string) => {
  $('loading-progress').style.width = Math.round(value * 100) + '%';
  $('loading-status').textContent = text;
};
const fallback = (message: string) => {
  sceneFailed = true;
  document.body.classList.remove('visiting');
  loading.hidden = true;
  canvas.hidden = true;
  $('welcome').hidden = true;
  $('touch-controls').hidden = true;
  $('interaction-button').hidden = true;
  $('minimap-button').hidden = true;
  $('fare-card').hidden = true;
  $('view-panel').hidden = true;
  toast(message);
  showPlaces();
};
progress(0.12, 'Packing the auto…');
void import('./engine')
  .then(async ({ createJourney }) => {
    journey = await createJourney({
      canvas,
      performance: performanceMode,
      isPaused: paused,
      onProgress: progress,
      onDrive: () => {
        $('welcome').classList.add('quiet');
        $('driving-hint').classList.add('quiet');
      },
      onTelemetry: (v, x, z, angle) => {
        speed = v;
        position = { x, z };
        yaw = angle;
        fares.update(position);
        $('speed').textContent = String(Math.round(v * 3.6));
        $('place-name').textContent = nearestPlace(x, z, 21)?.location ?? districtAt({ x, z });
        updateDuty();
      },
      onNear: (place) => {
        activePlace = place;
        $('interaction-button').hidden = !place;
        if (place) {
          $('interaction-place').textContent = place.location.toUpperCase();
          $('interaction-label').textContent = 'Park at ' + place.location;
          if (lastPlace !== place.id)
            announce(place.location + '. Press E to visit, or pick up a waiting passenger.');
        }
        lastPlace = place?.id ?? '';
      },
      onView: (mode, title, detail) => {
        viewMode = mode;
        document.body.classList.toggle('visiting', mode !== 'drive');
        $('view-panel').hidden = mode === 'drive';
        $('view-title').textContent = title;
        $('view-detail').textContent = detail;
        $('view-kicker').textContent =
          mode === 'croc'
            ? 'WETLAND FIELD NOTES'
            : mode === 'stars'
              ? 'THE OBSERVATORY'
              : 'PARKED UP · ' + (visitingPlace?.location.toUpperCase() ?? '');
        $('read-paper').hidden = mode !== 'storefront';
        $('view-experience').hidden = mode !== 'storefront' || visitingPlace?.id === 'about';
        $('view-experience').textContent =
          visitingPlace?.id === 'music'
            ? 'Open the mixing desk'
            : visitingPlace?.id === 'space'
              ? 'Look through the telescope'
              : visitingPlace?.id === 'saltwater'
                ? 'Watch the crocodiles'
                : 'Try the exhibit';
        $('tea-menu').hidden = mode !== 'storefront' || visitingPlace?.id !== 'about';
        $('croc-controls').hidden = mode !== 'croc';
        $('star-controls').hidden = mode !== 'stars';
      },
      onRecover: (message) => {
        cancelRide();
        toast(message);
      },
      onError: fallback,
      onAudio: (v, p, t, b) => audio.update(v, p, t, b),
      onQuality: (value) => {
        performanceMode = value;
        $('quality-button').textContent = value ? 'Performance' : 'Balanced';
      },
      interact: act,
      places: showPlaces,
      honk: () => audio.honk(),
    });
    booted = true;
    journey.night(night);
    lastPassenger = '';
    updateDuty();
    loading.hidden = true;
    const hashPlace = PLACES.find((p) => '#' + p.id === location.hash);
    if (hashPlace) showProject(hashPlace);
  })
  .catch((error: unknown) => {
    console.error('Journey initialization failed', error);
    fallback('The 3D scene is unavailable. All projects are here in Places.');
  });
window.addEventListener('pagehide', () => {
  radio.stop(false);
  demoDispose();
  journey?.pause();
});
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    journey?.dispose();
    radio.dispose();
    audio.dispose();
    demoDispose();
    clearTimeout(toastTimer);
  });
