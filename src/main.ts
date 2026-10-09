import './style.css';
import '@fontsource/noto-sans-malayalam/malayalam-400.css';
import { PLACES, nearestPlace, type Place } from './projects';
import { VillageRadio } from './radio';
import { renderDemo, renderDetails } from './demos';
import { JourneyAudio } from './audio';
import type { Journey } from './engine';

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
let journey: Journey | undefined,
  activePlace: Place | undefined,
  demoDispose = () => {},
  toastTimer = 0,
  night = false,
  performanceMode = matchMedia('(pointer: coarse)').matches,
  lastPlace = '',
  booted = false;
const paused = () => dialogs.some((d) => d.open) || document.hidden;
const announce = (text: string) => {
  $('announcements').textContent = text;
};
function toast(text: string) {
  $('toast').textContent = text;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => ($('toast').hidden = true), 3500);
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
function updatePlaces() {
  const list = $('places-list');
  list.replaceChildren();
  PLACES.forEach((place, index) => {
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
    status.textContent = visited.has(place.id) ? 'Explored' : 'Visit';
    button.append(num, copy, status);
    button.addEventListener('click', () => {
      journey?.reset(place);
      showProject(place);
    });
    list.append(button);
  });
  $('visited-count').textContent = visited.size + ' / ' + PLACES.length;
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
      project.close();
      journey?.feedCroc();
    },
    watchStars: () => {
      project.close();
      night = true;
      applyNight();
      journey?.tourObservatory();
    },
  });
  history.replaceState(null, '', '#' + place.id);
  announce(place.name);
}
function showPlaces() {
  updatePlaces();
  open(places);
}
function applyNight() {
  document.body.classList.toggle('night', night);
  $('time-button').textContent = night ? 'Evening' : 'Golden hour';
  $('time-button').setAttribute('aria-pressed', String(night));
  journey?.night(night);
}
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
  if (activePlace) showProject(activePlace);
});
$('reset-button').addEventListener('click', () => {
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
const progress = (value: number, text: string) => {
  $('loading-progress').style.width = Math.round(value * 100) + '%';
  $('loading-status').textContent = text;
};
const fallback = (message: string) => {
  loading.hidden = true;
  canvas.hidden = true;
  $('welcome').hidden = true;
  $('touch-controls').hidden = true;
  $('interaction-button').hidden = true;
  $('minimap-button').hidden = true;
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
      onTelemetry: (speed, x, z) => {
        $('speed').textContent = String(Math.round(speed * 3.6));
        $('place-name').textContent = nearestPlace(x, z, 21)?.location ?? 'Backwater road';
      },
      onNear: (place) => {
        activePlace = place;
        $('interaction-button').hidden = !place;
        if (place) {
          $('interaction-place').textContent = place.location.toUpperCase();
          $('interaction-label').textContent =
            place.id === 'about' ? 'Meet Jay' : 'Explore ' + place.name;
          if (lastPlace !== place.id) announce(place.location + '. Press E to explore.');
        }
        lastPlace = place?.id ?? '';
      },
      onRecover: toast,
      onError: fallback,
      onAudio: (speed, isPaused) => audio.update(speed, isPaused),
      onQuality: (value) => {
        performanceMode = value;
        $('quality-button').textContent = value ? 'Performance' : 'Balanced';
      },
      interact: () => {
        if (activePlace) showProject(activePlace);
      },
      places: showPlaces,
      honk: () => {
        audio.honk();
        if (activePlace?.id === 'about') toast('Chaya is always a good idea.');
      },
    });
    booted = true;
    journey.night(night);
    loading.hidden = true;
    const hashPlace = PLACES.find((p) => '#' + p.id === location.hash);
    if (hashPlace) {
      journey.reset(hashPlace);
      showProject(hashPlace);
    }
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
