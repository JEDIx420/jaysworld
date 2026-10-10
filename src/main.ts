import './style.css';
import './retro.css';
import './venues.css';
import './journey-hud.css';
import '@fontsource/noto-sans-malayalam/malayalam-400.css';
import { PLACES, nearestPlace, type Place } from './projects';
import { VillageRadio } from './radio';
import { VenueControls, RetroExhibit } from './retro';
import { JourneyAudio } from './audio';
import { FareGame, type Snack } from './fares';
import { passengerStop } from './passenger-stops';
import {
  districtAt,
  routeBetween,
  distance2,
  PASSENGERS,
  stopById,
  ROAD_START,
  type Point,
} from './village';
import { drawVillageMap, atlasHit, atlasOfferHit, setMapOffers, navigationCue } from './map';
import type { Journey, ViewMode } from './engine';
import { prepareDials, updateDials } from './driving-hud';
import {
  JourneyProgress,
  ACCOMPLISHMENTS,
  type AccomplishmentId,
  type Trail,
} from './journey-progress';

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
let savedJourney: unknown;
try {
  savedJourney = JSON.parse(localStorage.getItem('jaysworld-journey-v1') ?? 'null');
} catch {
  /* Optional. */
}
const discovery = new JourneyProgress(savedJourney);
discovery.visits.forEach((id) => visited.add(id));
prepareDials();
let taxiEnabled = false;
try {
  taxiEnabled = localStorage.getItem('jaysworld-taxi-mode') === 'on';
} catch {
  /* Optional preference. */
}
let journey: Journey | undefined,
  activePlace: Place | undefined,
  visitingPlace: Place | undefined,
  toastTimer = 0,
  timeMode = 0,
  weatherMode = 0,
  performanceMode = matchMedia('(pointer: coarse)').matches,
  lastPlace = '',
  booted = false,
  sceneFailed = false,
  experienceStarted = false,
  viewMode: ViewMode = 'drive',
  routePlace: Place | undefined,
  atlasRoute: readonly Point[] = [],
  position: Point = { ...ROAD_START },
  speed = 0,
  yaw = 0,
  lastPassenger = '',
  lastDutySignature = '',
  lastOfferSignature = '',
  lastRouteTarget = '',
  lastRoutePosition: Point = { x: Infinity, z: Infinity },
  lastDrivePoint: Point = { ...ROAD_START },
  drivenDistance = 0;
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
type ToastMessage = {
  text: string;
  title?: string;
  choices?: { label: string; action: () => void }[];
  duration: number;
};
const toastQueue: ToastMessage[] = [];
let currentToast = '';
function nextToast() {
  clearTimeout(toastTimer);
  const message = toastQueue.shift();
  const node = $('toast');
  node.replaceChildren();
  node.hidden = !message;
  currentToast = message?.text ?? '';
  if (!message) return;
  if (message.title) {
    const heading = document.createElement('strong');
    heading.textContent = message.title;
    node.append(heading);
  }
  const copy = document.createElement('span');
  copy.textContent = message.text;
  node.append(copy);
  if (message.choices) {
    const actions = document.createElement('div');
    actions.className = 'toast-choices';
    message.choices.forEach(({ label, action }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => {
        nextToast();
        action();
        canvas.focus({ preventScroll: true });
      });
      actions.append(button);
    });
    node.append(actions);
  }
  const close = document.createElement('button');
  close.className = 'toast-close';
  close.type = 'button';
  close.textContent = 'Continue';
  close.setAttribute('aria-label', 'Dismiss notification');
  close.addEventListener('click', () => {
    nextToast();
    canvas.focus({ preventScroll: true });
  });
  node.append(close);
  toastTimer = window.setTimeout(nextToast, message.duration);
  announce((message.title ? message.title + '. ' : '') + message.text);
}
function toast(text: string, title?: string, choices?: ToastMessage['choices'], duration = 4500) {
  if (currentToast === text || toastQueue.some((m) => m.text === text)) return;
  toastQueue.push({ text, title, choices, duration });
  if (toastQueue.length > 4) toastQueue.shift();
  if (!currentToast) nextToast();
}
function saveJourney() {
  try {
    localStorage.setItem('jaysworld-journey-v1', JSON.stringify(discovery.saved));
  } catch {
    /* Optional. */
  }
  updateJourney();
}
function accomplish(id: AccomplishmentId) {
  const item = discovery.earn(id);
  if (!item) return;
  saveJourney();
  toast(item.hint, item.title + ' · accomplished');
}
function nextCompanyPlace() {
  return (
    PLACES.find((p) => p.id !== 'about' && !discovery.visits.has(p.id)) ??
    (!discovery.visits.has('about') ? PLACES[0] : undefined)
  );
}
function updateJourney() {
  $('journey-button').textContent = discovery.earned.size + ' / ' + ACCOMPLISHMENTS.length;
  $('mission-route').textContent =
    discovery.trail === 'company'
      ? nextCompanyPlace()
        ? 'Next · visit ' + nextCompanyPlace()!.name
        : 'Tour complete · explore freely'
      : discovery.trail === 'taxi'
        ? discovery.earned.has('fare')
          ? 'Take another fare'
          : 'First fare · follow gold arrows'
        : 'Explore · ' + discovery.visits.size + ' / 7 places';
  const list = $('accomplishments');
  list.replaceChildren();
  for (const trail of ['company', 'taxi', 'explore'] as const)
    $('trail-' + trail).setAttribute('aria-pressed', String(discovery.trail === trail));
  ACCOMPLISHMENTS.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'accomplishment' + (discovery.earned.has(item.id) ? ' earned' : '');
    row.dataset.accomplishment = item.id;
    row.dataset.earned = String(discovery.earned.has(item.id));
    const title = document.createElement('strong');
    title.textContent = (discovery.earned.has(item.id) ? '✓ ' : '○ ') + item.title;
    const hint = document.createElement('small');
    hint.textContent = item.hint;
    row.append(title, hint);
    list.append(row);
  });
}
function chooseTrail(trail: Trail) {
  discovery.trail = trail;
  saveJourney();
  closeDialogs();
  journey?.leaveView();
  startExperience();
  if (trail !== 'taxi' && taxiEnabled) $('taxi-toggle').click();
  if (trail === 'company') {
    const next = nextCompanyPlace() ?? PLACES[1];
    navigate(next);
    toast(
      'Follow the arrows to the X at ' + next.location + '. Stop there and press Enter.',
      'Meet ' + next.name,
    );
  } else if (trail === 'taxi') {
    if (!taxiEnabled) $('taxi-toggle').click();
    routePlace = undefined;
    lastDutySignature = '';
    updateDuty();
    toast(
      'Follow a gold passenger route. Stop beside them, press Enter, then drive to their destination.',
      'Your first fare',
    );
  } else {
    routePlace = undefined;
    lastDutySignature = '';
    updateDuty();
    toast(
      'Visit any X marker. M opens the map; Shift or the Boost button gives your auto a little extra.',
      'The road is yours',
    );
  }
}
function closeDialogs() {
  dialogs.forEach((d) => {
    if (d.open) d.close();
  });
}
function open(dialog: HTMLDialogElement) {
  closeDialogs();
  dialog.showModal();
  if (dialog === project || dialog === radioDialog) {
    dialog.tabIndex = -1;
    dialog.focus({ preventScroll: true });
  }
  if (dialog === places) $('village-atlas').focus({ preventScroll: true });
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
    target = routePlace?.trigger ?? (taxiEnabled ? fares.target : undefined);
  const signature = [
    booted,
    taxiEnabled,
    Math.round(yaw * 10),
    state.wallet,
    state.completed,
    state.onboard,
    state.passengerIndex,
    fares.offers.join(),
    fares.unavailable.join(),
    Math.round(position.x),
    Math.round(position.z),
    speed < 1.2,
    routePlace?.id,
    viewMode,
    taxiEnabled && fares.actionAt(position, speed),
  ].join('|');
  if (signature === lastDutySignature) return;
  lastDutySignature = signature;
  const key = state.passengerIndex + ':' + state.onboard + ':' + taxiEnabled;
  if (key !== lastPassenger) {
    lastPassenger = key;
    journey?.setPassenger(state.passengerIndex, state.onboard);
    journey?.setDuty(taxiEnabled);
  }
  const offerSignature = [
    booted,
    taxiEnabled,
    state.onboard,
    state.passengerIndex,
    fares.offers.join(),
    fares.unavailable.join(),
  ].join('|');
  if (offerSignature !== lastOfferSignature) {
    lastOfferSignature = offerSignature;
    journey?.setOffers(taxiEnabled ? fares.offers : [], fares.unavailable);
    setMapOffers(
      taxiEnabled
        ? fares.offers.map((id) => ({
            ...passengerStop(PASSENGERS[id].from),
            id,
            name: PASSENGERS[id].name,
          }))
        : [],
    );
    const offers = $('fare-offers');
    offers.replaceChildren();
    if (taxiEnabled && !state.onboard)
      fares.offers.forEach((id) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = PASSENGERS[id].name;
        button.setAttribute(
          'aria-label',
          'Route to ' + PASSENGERS[id].name + ' at ' + stopById(PASSENGERS[id].from).label,
        );
        button.setAttribute('aria-pressed', String(id === state.passengerIndex));
        button.addEventListener('click', () => {
          fares.select(id);
          routePlace = undefined;
          updateDuty();
          canvas.focus({ preventScroll: true });
        });
        offers.append(button);
      });
  }
  $('wallet').textContent = '₹' + state.wallet;
  $('taxi-toggle').setAttribute('aria-pressed', String(taxiEnabled));
  $('taxi-toggle').innerHTML = (taxiEnabled ? 'ON DUTY' : 'OFF DUTY') + '<i></i>';
  $('fare-card').classList.toggle('free-roam', !taxiEnabled);
  $('fare-card').dataset.duty = String(taxiEnabled);
  $('fare-title').textContent = !taxiEnabled
    ? 'The road is yours.'
    : state.onboard
      ? p.name + ' → ' + fares.destination.label
      : p.name + ' is waiting · ' + fares.pickup.label;
  $('fare-description').textContent = !taxiEnabled
    ? 'Explore freely. Switch on duty for passenger fares.'
    : state.onboard
      ? 'A passenger on board. Drop off safely for ₹' + state.fare + '.'
      : p.line + ' · Fare ₹' + state.fare;
  $('fare-distance').textContent = routePlace
    ? 'Route: ' + routePlace.location
    : Math.round(distance2(position, target ?? position)) +
      ' m ' +
      (state.onboard ? 'to drop-off' : 'to pickup');
  $('fare-distance').hidden = !target;
  $('fare-route').textContent = taxiEnabled ? 'Show fare route' : 'Choose a place';
  const action = taxiEnabled ? fares.actionAt(position, speed) : undefined;
  $('fare-action').hidden = !action || viewMode !== 'drive';
  $('fare-action').textContent = action === 'dropoff' ? 'Drop off ↵' : 'Pick up ↵';
  updateInteraction();
  const routeTarget = target ? target.x + ',' + target.z : '';
  if (routeTarget !== lastRouteTarget || distance2(position, lastRoutePosition) > 8) {
    lastRouteTarget = routeTarget;
    lastRoutePosition = { ...position };
    atlasRoute = target ? routeBetween(position, target).points : [];
    journey?.route(atlasRoute);
  }
  const route = atlasRoute;
  const cue = navigationCue(position, yaw, route);
  $('navigation-card').hidden = !target || viewMode !== 'drive';
  $('navigation-destination').textContent =
    routePlace?.location ?? (state.onboard ? fares.destination.label : fares.pickup.label);
  $('navigation-instruction').textContent = cue.instruction;
  $('navigation-distance').textContent = Math.round(cue.distance) + ' m along the road';
  $('navigation-arrow').style.transform = 'rotate(' + cue.turn + 'rad)';
  if (places.open || !booted)
    drawVillageMap($<HTMLCanvasElement>('village-atlas'), position, yaw, route, true);
  $('fare-card').dataset.onboard = String(state.onboard);
  $('fare-card').dataset.completed = String(state.completed);
}
function updateInteraction() {
  const action = taxiEnabled ? fares.actionAt(position, speed) : undefined;
  const customer =
    !fares.snapshot.onboard && taxiEnabled
      ? fares.offers.find((id) => distance2(position, passengerStop(PASSENGERS[id].from)) <= 9)
      : undefined;
  $('interaction-button').hidden =
    viewMode !== 'drive' || (!action && customer === undefined && !activePlace);
  $('interaction-place').textContent =
    action || customer !== undefined ? 'AUTO TAXI' : (activePlace?.location ?? '');
  $('interaction-label').textContent =
    action === 'dropoff'
      ? 'Drop off ' + fares.passenger.name
      : customer !== undefined
        ? (speed > 1.2 ? 'Stop to pick up ' : 'Pick up ') + PASSENGERS[customer].name
        : 'Enter ' + (activePlace?.location ?? '');
}
function act() {
  startExperience();
  if (viewMode !== 'drive') return;
  const action = taxiEnabled ? fares.actionAt(position, speed) : undefined;
  if (action) {
    const result = fares.interact(position, speed);
    if (result) {
      routePlace = undefined;
      save();
      audio.cue(action === 'pickup' ? 'pickup' : 'coins');
      toast(result.message);
      if (action === 'dropoff') accomplish('fare');
      updateDuty();
    }
  } else if (
    taxiEnabled &&
    !fares.snapshot.onboard &&
    fares.offers.some((id) => distance2(position, passengerStop(PASSENGERS[id].from)) <= 9)
  ) {
    toast('Stop beside the passenger, then press Enter.');
  } else if (activePlace) visit(activePlace);
}
function visit(place: Place) {
  startExperience();
  visitingPlace = place;
  journey?.visit(place);
}
function updatePlaces() {
  updateJourney();
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
    status.textContent = visited.has(place.id)
      ? 'Read again'
      : place.id === 'about'
        ? 'Read paper'
        : 'Project notes';
    button.append(num, copy, status);
    button.addEventListener('click', () => showProject(place));
    const actions = document.createElement('div');
    actions.className = 'directory-actions';
    const route = document.createElement('button');
    route.type = 'button';
    route.textContent = 'Get directions';
    route.dataset.route = place.id;
    route.disabled = sceneFailed;
    route.addEventListener('click', () => navigate(place));
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
const exhibit = new RetroExhibit(project, {
  close: () => project.close(),
  crocs: observeCrocs,
  stars: observeStars,
  playback: (active) => {
    canvas.dataset.beatPlaying = String(active);
    if (active) accomplish('beat');
  },
  roof: () => journey?.roof(),
  buy,
  radio: showRadio,
  slide: (page, progress) => journey?.slide(page, progress),
  cue: () => audio.cue('paper'),
});
const venue = new VenueControls($('view-panel'), {
  paper: showProject,
  roof: () => journey?.roof(),
  crocs: observeCrocs,
  stars: observeStars,
  leave: () => journey?.leaveView(),
  cue: () => audio.cue('paper'),
  buy,
});
function buy(item: Snack) {
  const result = fares.buy(
    item,
    nearestPlace(position.x, position.z, 9)?.id === 'about' && visitingPlace?.id === 'about',
  );
  toast(result.message);
  if (result.ok) {
    save();
    journey?.serve(item);
    audio.cue(item === 'tea' ? 'tea' : 'coins');
  }
  updateDuty();
}
function showProject(place: Place) {
  closeDialogs();
  visitingPlace = place;
  if (!sceneFailed) journey?.interior(place);
  visited.add(place.id);
  const completed = discovery.visit(place.id);
  if (completed) toast(completed.hint, completed.title + ' · accomplished');
  saveJourney();
  if (place.id === 'eagle-eye') accomplish('company');
  updatePlaces();
  exhibit.show(place);
  open(project);
  history.replaceState(null, '', '#' + place.id);
  announce(place.name);
}
function showPlaces() {
  updatePlaces();
  updateDuty();
  open(places);
  selectAtlas(atlasIndex, false);
}
function showRadio() {
  if (project.open) {
    radioDialog.showModal();
    radioDialog.tabIndex = -1;
    radioDialog.focus({ preventScroll: true });
    journey?.pause();
  } else open(radioDialog);
}
function applyTime() {
  const labels = ['Time · auto', 'Time · dusk', 'Time · night', 'Time · day'];
  $('time-button').textContent = labels[timeMode];
  journey?.time([undefined, 18, 21, 13][timeMode]);
}
function observeCrocs() {
  startExperience();
  journey?.feedCroc();
}
function observeStars() {
  startExperience();
  journey?.tourObservatory();
}
function startExperience() {
  if (experienceStarted || !booted) return;
  experienceStarted = true;
  document.body.classList.add('started');
  $('welcome').classList.add('quiet');
  $('driving-hint').classList.add('quiet');
  if (!sceneFailed) radio.playDefault();
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
  toast(
    'Visit Eagle Eye, earn your first taxi fare, or just ride around. Nothing is locked behind a mission.',
    'Welcome to Jay’s World',
    [
      { label: 'Visit Eagle Eye', action: () => chooseTrail('company') },
      { label: 'Take fares', action: () => chooseTrail('taxi') },
      { label: 'Explore freely', action: () => chooseTrail('explore') },
    ],
    16000,
  );
}
$('start-driving').addEventListener('click', startExperience);
// Any first click after loading unlocks audio in the same trusted event.
window.addEventListener(
  'click',
  () => {
    if (booted && !sceneFailed) startExperience();
  },
  { capture: true },
);
let observerIndex = 0;
function observerTarget(delta: number) {
  observerIndex = (observerIndex + delta + 3) % 3;
  if (viewMode === 'croc') journey?.selectCroc(observerIndex);
  else if (viewMode === 'stars') journey?.constellation(['orion', 'dipper', 'crux'][observerIndex]);
}
function observerAction() {
  if (viewMode === 'croc') journey?.hunt();
  else if (viewMode === 'stars') observerTarget(1);
}
$('view-panel').addEventListener('click', (e) => {
  const action = (e.target as HTMLElement).closest<HTMLElement>('[data-observer]')?.dataset
    .observer;
  if (action === 'previous') observerTarget(-1);
  if (action === 'next') observerTarget(1);
  if (action === 'action') observerAction();
  if (action === 'night') {
    timeMode = 2;
    applyTime();
  }
  if (action === 'closer') journey?.zoom(-160);
  if (action === 'wider') journey?.zoom(160);
});
window.addEventListener(
  'keydown',
  (e) => {
    const el = e.target as HTMLElement;
    if (el.closest('input,textarea,select') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Enter' && !experienceStarted && booted && !dialogs.some((d) => d.open)) {
      e.preventDefault();
      startExperience();
      return;
    }
    if (
      !dialogs.some((d) => d.open) &&
      ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
        e.code,
      )
    )
      startExperience();
    const nativeEnter = e.code === 'Enter' && !!el.closest('button,a');
    if (e.code === 'Escape') {
      const dialog = radioDialog.open ? radioDialog : dialogs.find((d) => d.open);
      if (dialog) {
        e.preventDefault();
        dialog.close();
        journey?.pause();
      } else if (viewMode !== 'drive') {
        e.preventDefault();
        journey?.leaveView();
      } else {
        e.preventDefault();
        open(settings);
      }
      return;
    }
    if (project.open) {
      if (!radioDialog.open) {
        if (e.code === 'KeyQ') {
          e.preventDefault();
          showRadio();
        } else if (!nativeEnter && exhibit.key(e.code)) e.preventDefault();
        return;
      }
    }
    if (radioDialog.open) {
      if (nativeEnter) return;
      if (e.code === 'ArrowLeft') radio.seek(-1);
      else if (e.code === 'ArrowRight') radio.seek(1);
      else if (e.code === 'ArrowUp') radio.adjustVolume(1);
      else if (e.code === 'ArrowDown') radio.adjustVolume(-1);
      else if (e.code === 'Enter') radio.power();
      else return;
      e.preventDefault();
      return;
    }
    if (places.open) {
      if (el === atlas || nativeEnter) return;
      if (e.code.startsWith('Arrow') || e.code === 'Enter') {
        e.preventDefault();
        atlas.focus();
        atlas.dispatchEvent(
          new KeyboardEvent('keydown', { code: e.code, bubbles: false, cancelable: true }),
        );
      }
      return;
    }
    if (settings.open) {
      if (e.code.startsWith('Arrow')) {
        const buttons = [...settings.querySelectorAll<HTMLButtonElement>('button')];
        const index = buttons.indexOf(el as HTMLButtonElement),
          delta = ['ArrowLeft', 'ArrowUp'].includes(e.code) ? -1 : 1;
        buttons[(index + delta + buttons.length) % buttons.length]?.focus();
        e.preventDefault();
      }
      return;
    }
    if (viewMode !== 'drive') {
      if (nativeEnter) return;
      if (viewMode === 'storefront') {
        if (['ArrowLeft', 'ArrowUp'].includes(e.code)) venue.change(-1);
        else if (['ArrowRight', 'ArrowDown'].includes(e.code)) venue.change(1);
        else if (e.code === 'Enter') venue.activate();
        else return;
      } else {
        if (e.code === 'ArrowLeft') journey?.look(-1, 0);
        else if (e.code === 'ArrowRight') journey?.look(1, 0);
        else if (e.code === 'ArrowUp') journey?.look(0, 1);
        else if (e.code === 'ArrowDown') journey?.look(0, -1);
        else if (e.code === 'Equal' || e.code === 'NumpadAdd') journey?.zoom(-160);
        else if (e.code === 'Minus' || e.code === 'NumpadSubtract') journey?.zoom(160);
        else if (e.code === 'KeyN' && viewMode === 'stars') {
          timeMode = 2;
          applyTime();
        } else if (e.code === 'BracketLeft') observerTarget(-1);
        else if (e.code === 'BracketRight') observerTarget(1);
        else if (e.code === 'Enter') observerAction();
        else return;
      }
      e.preventDefault();
      return;
    }
    if (e.code === 'KeyQ') {
      e.preventDefault();
      open(radioDialog);
    }
    if (e.code === 'KeyT') {
      e.preventDefault();
      $('taxi-toggle').click();
    }
    if (e.code === 'Enter' && !e.repeat && taxiEnabled && fares.actionAt(position, speed)) {
      e.preventDefault();
      act();
      canvas.focus({ preventScroll: true });
    }
  },
  { capture: true },
);
$('joystick').addEventListener('pointerdown', startExperience, { capture: true });
$('places-button').addEventListener('click', showPlaces);
$('minimap-button').addEventListener('click', showPlaces);
$('mission-route').addEventListener('click', () => {
  if (discovery.trail === 'company') {
    const next = nextCompanyPlace();
    if (next) navigate(next);
    else showPlaces();
  } else if (discovery.trail === 'taxi') $('fare-route').click();
  else showPlaces();
});
for (const trail of ['company', 'taxi', 'explore'] as const)
  $('trail-' + trail).addEventListener('click', () => chooseTrail(trail));
$('journey-button').addEventListener('click', () => {
  showPlaces();
  $('accomplishments').scrollIntoView({ block: 'center' });
});
$('loading-places').addEventListener('click', showPlaces);
$('about-link').addEventListener('click', (e) => {
  e.preventDefault();
  showProject(PLACES[0]);
});
$('radio-button').addEventListener('click', () => open(radioDialog));
$('settings-button').addEventListener('click', () => open(settings));
$('interaction-button').addEventListener('click', act);
$('fare-action').addEventListener('click', act);
$('fare-route').addEventListener('click', () => {
  if (!taxiEnabled) {
    showPlaces();
    return;
  }
  routePlace = undefined;
  updateDuty();
  toast('Follow the gold arrows. Stop beside the passenger and press Enter.');
  canvas.focus({ preventScroll: true });
});
$('taxi-toggle').addEventListener('click', () => {
  taxiEnabled = !taxiEnabled;
  if (!taxiEnabled && fares.cancel())
    toast('Off duty. The passenger returns to the stop; no fare was charged.');
  else
    toast(
      taxiEnabled
        ? 'On duty. Your next passenger is marked on the map.'
        : 'Off duty. Explore at your own pace.',
    );
  try {
    localStorage.setItem('jaysworld-taxi-mode', taxiEnabled ? 'on' : 'off');
  } catch {
    /* Optional. */
  }
  updateDuty();
  canvas.focus({ preventScroll: true });
});
function navigate(place: Place) {
  if (sceneFailed) return;
  routePlace = place;
  closeDialogs();
  journey?.leaveView();
  startExperience();
  updateDuty();
  toast('Follow the gold arrows to ' + place.location + '.');
}
$('navigation-clear').addEventListener('click', () => {
  routePlace = undefined;
  updateDuty();
});
const atlas = $<HTMLCanvasElement>('village-atlas');
let atlasIndex = 0,
  atlasDragged = false;
let atlasDrag: { x: number; y: number; center: Point; pointer: number } | undefined;
const atlasCenter = (): Point => ({
  x: Number(atlas.dataset.centerX ?? -80),
  z: Number(atlas.dataset.centerZ ?? 0),
});
const renderAtlas = () => drawVillageMap(atlas, position, yaw, atlasRoute, true);
function selectAtlas(index: number, center = true) {
  atlasIndex = (index + PLACES.length) % PLACES.length;
  const place = PLACES[atlasIndex];
  atlas.dataset.selected = place.id;
  $('map-preview-label').textContent =
    String(atlasIndex + 1).padStart(2, '0') + ' · ' + place.location.toUpperCase();
  $('map-preview-title').textContent = place.id === 'about' ? 'Meet Jay' : place.name;
  $('map-preview-copy').textContent = {
    about: 'A tea shop, a morning paper and a little about Jay.',
    'eagle-eye': 'AI systems, a glass office and a lift to the rooftop.',
    opsflash: 'Connect your tools. Ask your data. Take action.',
    rift: 'An exact records workshop. Try the one-paisa comparison.',
    music: 'A recording studio. Make and save your own groove.',
    saltwater: 'A wetland jetty. Follow three crocodiles as they swim and hunt.',
    space: 'A hilltop dome. Explore the stars and the space game.',
  }[place.id];
  $('map-preview').dataset.venue = place.id;
  $('map-drive').toggleAttribute('disabled', sceneFailed);
  $('map-selection').textContent = place.location + ' · Enter to drive';
  if (center) {
    atlas.dataset.zoom = String(Math.max(1.5, Number(atlas.dataset.zoom ?? 1)));
    atlas.dataset.centerX = String(place.trigger.x);
    atlas.dataset.centerZ = String(place.trigger.z);
  }
  renderAtlas();
}
$('map-prev').addEventListener('click', () => {
  selectAtlas(atlasIndex - 1);
  atlas.focus();
});
$('map-next').addEventListener('click', () => {
  selectAtlas(atlasIndex + 1);
  atlas.focus();
});
$('map-drive').addEventListener('click', () => navigate(PLACES[atlasIndex]));
const atlasPointerHit = (event: MouseEvent) => {
  const rect = atlas.getBoundingClientRect(),
    fit = Math.min(rect.width / atlas.width, rect.height / atlas.height);
  const left = rect.left + (rect.width - atlas.width * fit) / 2,
    top = rect.top + (rect.height - atlas.height * fit) / 2;
  return atlasHit(
    (event.clientX - left) / fit,
    (event.clientY - top) / fit,
    atlas.width,
    atlas.height,
    Math.max(32, 16 / fit),
    Number(atlas.dataset.zoom ?? 1),
    atlasCenter(),
  );
};
atlas.addEventListener('click', (event) => {
  if (atlasDragged) return;
  const place = atlasPointerHit(event);
  if (place) {
    selectAtlas(PLACES.indexOf(place), false);
    atlas.focus();
  } else {
    const rect = atlas.getBoundingClientRect(),
      fit = Math.min(rect.width / atlas.width, rect.height / atlas.height);
    const left = rect.left + (rect.width - atlas.width * fit) / 2,
      top = rect.top + (rect.height - atlas.height * fit) / 2;
    const offer = atlasOfferHit(
      (event.clientX - left) / fit,
      (event.clientY - top) / fit,
      atlas.width,
      atlas.height,
      Number(atlas.dataset.zoom ?? 1),
      atlasCenter(),
    );
    if (offer && fares.select(offer.id)) {
      routePlace = undefined;
      closeDialogs();
      journey?.leaveView();
      updateDuty();
      toast('Picking up ' + offer.name + '.');
    } else toast('Choose a numbered stop or a gold passenger marker.');
  }
});
atlas.addEventListener('pointerdown', (event) => {
  atlasDragged = false;
  atlasDrag = {
    x: event.clientX,
    y: event.clientY,
    center: atlasCenter(),
    pointer: event.pointerId,
  };
  atlas.setPointerCapture(event.pointerId);
});
atlas.addEventListener('pointermove', (event) => {
  if (atlasDrag && event.pointerId === atlasDrag.pointer) {
    const dx = event.clientX - atlasDrag.x,
      dy = event.clientY - atlasDrag.y;
    if (Math.hypot(dx, dy) < 5 && !atlasDragged) return;
    atlasDragged = true;
    const metres = 580 / (Number(atlas.dataset.zoom ?? 1) * atlas.getBoundingClientRect().width);
    atlas.dataset.centerX = String(Math.max(-310, Math.min(150, atlasDrag.center.x - dx * metres)));
    atlas.dataset.centerZ = String(Math.max(-270, Math.min(270, atlasDrag.center.z - dy * metres)));
    renderAtlas();
  } else {
    const place = atlasPointerHit(event);
    if (place) {
      selectAtlas(PLACES.indexOf(place), false);
    }
  }
});
atlas.addEventListener('pointerup', () => {
  atlasDrag = undefined;
});
atlas.addEventListener('pointercancel', () => {
  atlasDrag = undefined;
  atlasDragged = false;
});
atlas.addEventListener('keydown', (event) => {
  if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.code)) {
    event.preventDefault();
    atlasIndex =
      (atlasIndex + (['ArrowRight', 'ArrowDown'].includes(event.code) ? 1 : PLACES.length - 1)) %
      PLACES.length;
    if (event.code === 'Home') atlasIndex = 0;
    if (event.code === 'End') atlasIndex = PLACES.length - 1;
    selectAtlas(atlasIndex);
  } else if (event.code === 'Enter') {
    event.preventDefault();
    navigate(PLACES[atlasIndex]);
  }
});
function zoomAtlas(delta: number) {
  const before = Number(atlas.dataset.zoom ?? 1),
    next = Math.max(1, Math.min(3.5, before * delta));
  atlas.dataset.zoom = String(next);
  if (before === 1 && next > 1) {
    atlas.dataset.centerX = String(position.x);
    atlas.dataset.centerZ = String(position.z);
  }
  if (next === 1) {
    delete atlas.dataset.centerX;
    delete atlas.dataset.centerZ;
  }
  $('map-selection').textContent =
    next === 1 ? 'Tap a numbered place · drag to pan' : 'Closer look · drag to pan';
  renderAtlas();
}
$('atlas-zoom-in').addEventListener('click', () => zoomAtlas(1.5));
$('atlas-zoom-out').addEventListener('click', () => zoomAtlas(1 / 1.5));
$('reset-button').addEventListener('click', () => {
  cancelRide();
  journey?.reset();
  closeDialogs();
  toast('Back at Eagle Towers.');
});
$('camera-button').addEventListener('click', () => {
  journey?.camera();
  closeDialogs();
  toast('Camera reset.');
});
$('camera-close').addEventListener('click', () => {
  journey?.camera('close');
  closeDialogs();
});
$('camera-wide').addEventListener('click', () => {
  journey?.camera('wide');
  closeDialogs();
});
$('quality-button').textContent = performanceMode ? 'Performance' : 'Balanced';
$('quality-button').addEventListener('click', () => {
  performanceMode = !performanceMode;
  journey?.quality(performanceMode);
  $('quality-button').textContent = performanceMode ? 'Performance' : 'Balanced';
});
$('time-button').addEventListener('click', () => {
  timeMode = (timeMode + 1) % 4;
  applyTime();
});
$('weather-button').addEventListener('click', () => {
  weatherMode = (weatherMode + 1) % 5;
  const kinds = [undefined, 'clear', 'rain', 'wind', 'haze'] as const;
  journey?.weather(kinds[weatherMode]);
  $('weather-button').textContent = 'Weather · ' + (kinds[weatherMode] ?? 'auto');
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
      exhibit.dispose();
      if (viewMode === 'interior') {
        if (
          experienceStarted &&
          visitingPlace &&
          nearestPlace(position.x, position.z, 9)?.id === visitingPlace.id
        )
          journey?.visit(visitingPlace);
        else journey?.leaveView();
      }
    }
    journey?.pause();
    if (dialog === radioDialog && project.open) project.focus({ preventScroll: true });
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
  document.body.dataset.scene = 'fallback';
  document.body.classList.remove('visiting');
  loading.hidden = true;
  canvas.hidden = true;
  $('welcome').hidden = true;
  $('touch-controls').hidden = true;
  $('interaction-button').hidden = true;
  $('minimap-button').hidden = true;
  $('fare-card').hidden = true;
  $('view-panel').hidden = true;
  $('navigation-card').hidden = true;
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
      isStarted: () => experienceStarted,
      competitionActive: () => taxiEnabled && !paused() && viewMode === 'drive',
      rivalJob: (point) => fares.rivalJob(point),
      rivalArrive: (id, point, speed) => {
        const claimed = fares.rivalArrive(id, point, speed);
        if (claimed) {
          lastDutySignature = '';
          updateDuty();
        }
        return claimed;
      },
      onTick: (dt) => fares.tick(dt),
      onProgress: progress,
      onDrive: () => {
        $('welcome').classList.add('quiet');
        $('driving-hint').classList.add('quiet');
      },
      onTelemetry: (v, x, z, angle, gear, rpm, boost) => {
        speed = v;
        position = { x, z };
        yaw = angle;
        if (taxiEnabled) fares.update(position);
        updateDials(v, gear, rpm, boost);
        const driven = distance2(position, lastDrivePoint);
        if (experienceStarted && viewMode === 'drive' && v > 0.5 && driven < 10)
          drivenDistance += driven;
        lastDrivePoint = { ...position };
        if (drivenDistance > 20) accomplish('first-road');
        $('place-name').textContent = nearestPlace(x, z, 21)?.location ?? districtAt({ x, z });
        updateDuty();
      },
      onNear: (place) => {
        if (activePlace?.id === place?.id) return;
        activePlace = place;
        updateInteraction();
        if (place) {
          if (lastPlace !== place.id)
            announce(place.location + '. Press Enter to visit, or pick up a waiting passenger.');
        }
        lastPlace = place?.id ?? '';
      },
      onView: (mode, title, detail) => {
        const changed = viewMode !== mode;
        viewMode = mode;
        document.body.classList.toggle('visiting', mode !== 'drive');
        if (experienceStarted && mode === 'roof') accomplish('roof');
        if (experienceStarted && mode === 'croc') accomplish('wetland');
        if (experienceStarted && mode === 'stars') accomplish('stars');
        if (changed) observerIndex = 0;
        if (changed || !$('view-panel').childElementCount)
          venue.show(mode, visitingPlace, title, detail);
        else venue.update(title, detail);
      },
      onRecover: (message) => {
        cancelRide();
        toast(message);
      },
      onError: fallback,
      onAudio: (v, p, t, b, gear, rpm) => {
        audio.update(v, p, t, b, gear, rpm);
        audio.studio(
          distance2(position, PLACES.find((v) => v.id === 'music')!.position),
          (viewMode === 'drive' || viewMode === 'storefront') && !dialogs.some((d) => d.open),
        );
      },
      onWeather: (rain, wind, night) => {
        audio.weather(rain, wind, night);
        document.body.classList.toggle('night', night > 0.5);
      },
      onQuality: (value) => {
        performanceMode = value;
        $('quality-button').textContent = value ? 'Performance' : 'Balanced';
      },
      interact: act,
      places: showPlaces,
      honk: () => audio.honk(),
    });
    booted = true;

    lastPassenger = '';
    updateDuty();
    loading.hidden = true;
    const hashPlace = PLACES.find((p) => '#' + p.id === location.hash);
    // A shared/reloaded project URL is a route suggestion, never forced entry.
    if (hashPlace) {
      routePlace = hashPlace;
      lastDutySignature = '';
      updateDuty();
    }
  })
  .catch((error: unknown) => {
    console.error('Journey initialization failed', error);
    fallback('The 3D scene is unavailable. All projects are here in Places.');
  });
window.addEventListener('pagehide', () => {
  radio.stop(false);
  exhibit.dispose();
  journey?.pause();
});
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    journey?.dispose();
    radio.dispose();
    audio.dispose();
    exhibit.dispose();
    clearTimeout(toastTimer);
  });
