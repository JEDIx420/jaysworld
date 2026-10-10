export function prepareDials() {
  const ticks = document.getElementById('dial-ticks')!;
  const parts: string[] = [];
  for (let speed = 0; speed <= 120; speed += 5) {
    const angle = ((-130 + (speed / 120) * 260) * Math.PI) / 180;
    const point = (r: number) => [90 + Math.sin(angle) * r, 79 - Math.cos(angle) * r];
    const [x1, y1] = point(speed % 20 === 0 ? 51 : 56),
      [x2, y2] = point(61);
    parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="dial-tick"/>`);
    if (speed % 20 === 0) {
      const [x, y] = point(43);
      parts.push(`<text x="${x}" y="${y + 3}" class="dial-number">${speed}</text>`);
    }
  }
  ticks.innerHTML = parts.join('');
}
export function updateDials(speed: number, gear: number, rpm: number, boosting: boolean) {
  const $ = (id: string) => document.getElementById(id)!;
  $('speed').textContent = String(Math.round(speed * 3.6));
  $('gear').textContent = gear === 0 ? 'R' : String(gear);
  $('speed-needle').setAttribute(
    'transform',
    `rotate(${-130 + (Math.min(120, speed * 3.6) / 120) * 260} 90 79)`,
  );
  $('rev-needle').setAttribute(
    'transform',
    `rotate(${-120 + (Math.min(6500, rpm) / 6500) * 240} 139 128)`,
  );
  $('speedometer').setAttribute(
    'aria-label',
    `${Math.round(speed * 3.6)} kilometres per hour, gear ${gear}, ${Math.round(rpm)} RPM`,
  );
  $('boost-status').textContent = boosting ? 'BOOST · 120' : 'SHIFT · BOOST';
  document.body.classList.toggle('boosting', boosting);
}
