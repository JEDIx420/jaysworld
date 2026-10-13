/** The original RR 310 Track theme: black TFT, horizontal blue tachometer and central speed. */
export function updateBikeHud(speed: number, gear: number, rpm: number, boost: boolean) {
  const $ = (id: string) => document.getElementById(id)!;
  $('bike-speed').textContent = String(Math.round(speed * 3.6));
  $('bike-gear').textContent = speed < 0.2 ? 'N' : String(gear);
  $('bike-rpm').textContent = (rpm / 1000).toFixed(1);
  $('bike-rev-fill').style.width = Math.min(100, (rpm / 11000) * 100) + '%';
  $('bike-hud').classList.toggle('shift-ready', rpm > 9600);
  $('bike-hud').dataset.boost = String(boost);
  $('bike-riding-state').textContent = boost ? 'FULL THROTTLE / BOOST' : 'TRACK';
}
