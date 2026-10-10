import {
  BANK_CASE,
  LEDGER_RECORDS,
  BANK_RECORDS,
  ADJUSTED_LEDGER,
  ADJUSTED_BANK,
  money,
} from './bank-reconciliation';
import { exactCents } from './demos';
import { COMMAND_LAYERS, COMMAND_REGIONS, WORLD_LAND, mapPoint, signalValue } from './command-map';
import { VENUE_PAGES } from './venue-content';

export function drawBankDisplay(c: CanvasRenderingContext2D, page: number, compared: boolean) {
  c.fillStyle = '#122d31';
  c.fillRect(0, 0, 1600, 900);
  c.fillStyle = '#e2ca96';
  c.font = '30px monospace';
  c.fillText('RIFT / BANK RECONCILIATION DESK', 70, 75);
  c.fillStyle = '#d9ede6';
  c.font = '600 64px sans-serif';
  c.fillText(VENUE_PAGES.rift[page].title, 70, 180);
  if (page === 0) {
    [LEDGER_RECORDS, BANK_RECORDS].forEach((rows, side) => {
      const x = 70 + side * 750;
      c.fillStyle = '#23454a';
      c.fillRect(x, 260, 660, 440);
      c.fillStyle = '#99bab0';
      c.font = '27px monospace';
      c.fillText(side ? 'BANK STATEMENT' : 'CASH LEDGER', x + 35, 315);
      c.fillStyle = '#e2ca96';
      c.font = '38px monospace';
      c.fillText(money(side ? BANK_CASE.bank : BANK_CASE.ledger), x + 35, 380);
      rows.forEach((r, i) => {
        const different = BANK_CASE.rows.find((d) => d.id === r.id)!.state !== 'equal';
        c.fillStyle = compared && different ? '#eaca8a' : '#bad1ca';
        c.font = '27px monospace';
        c.fillText(r.id, x + 35, 450 + i * 65);
        c.fillText(money(exactCents(r.amount)), x + 300, 450 + i * 65);
      });
    });
  } else if (page === 3) {
    c.fillStyle = '#bad1ca';
    c.font = '35px monospace';
    c.fillText(`${money(BANK_CASE.ledger)} − ₹125.00 + ₹0.01`, 70, 335);
    c.fillText(`${money(BANK_CASE.bank)} + ₹1,200.00`, 70, 470);
    c.fillStyle = '#a0e0b5';
    c.font = '55px monospace';
    c.fillText(`= ${money(ADJUSTED_LEDGER)}`, 980, 335);
    c.fillText(`= ${money(ADJUSTED_BANK)}`, 980, 470);
    c.fillText('RESIDUAL ₹0.00', 70, 670);
  } else {
    BANK_CASE.explanations.forEach((item, i) => {
      const y = 320 + i * 155;
      c.fillStyle = '#23454a';
      c.fillRect(70, y - 50, 1430, 120);
      c.fillStyle = '#eaca8a';
      c.font = '31px monospace';
      c.fillText(`${item.ref} / ${item.amount}`, 95, y);
      c.fillStyle = '#d9ede6';
      c.font = '32px sans-serif';
      c.fillText(page === 1 ? item.title : item.suggestion, 590, y);
    });
  }
  c.fillStyle = '#8badaa';
  c.font = '27px monospace';
  c.fillText(
    page === 0
      ? compared
        ? '3 DIFFERENCES / ₹0.01 RECEIPT MISMATCH'
        : 'ENTER TO COMPARE'
      : `${page + 1} / 5 · ← → SLIDES`,
    70,
    800,
  );
  c.fillText('ILLUSTRATIVE BANK CASE', 1070, 850);
}
export function drawCommandDisplay(c: CanvasRenderingContext2D, page: number) {
  const layer = COMMAND_LAYERS[page],
    peak = Math.max(...COMMAND_REGIONS.map((r) => r[layer.key]));
  c.fillStyle = '#081b25';
  c.fillRect(0, 0, 1600, 900);
  c.fillStyle = layer.color;
  c.font = '31px monospace';
  c.fillText('OPSFLASH / HIGH COMMAND', 70, 70);
  c.font = '600 52px sans-serif';
  c.fillText(layer.label, 70, 150);
  c.save();
  c.translate(70, 200);
  c.scale(1.45, 1.15);
  c.strokeStyle = '#71bab229';
  c.lineWidth = 1;
  for (let x = 0; x <= 1000; x += 100) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, 500);
    c.stroke();
  }
  for (let y = 0; y <= 500; y += 100) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(1000, y);
    c.stroke();
  }
  c.fillStyle = '#21504e';
  c.strokeStyle = '#75b2a8';
  WORLD_LAND.forEach((land) => {
    c.beginPath();
    land.forEach(([lon, lat], i) => {
      const p = mapPoint(lon, lat);
      if (i) c.lineTo(p.x, p.y);
      else c.moveTo(p.x, p.y);
    });
    c.closePath();
    c.fill();
    c.stroke();
  });
  COMMAND_REGIONS.forEach((r) => {
    const p = mapPoint(r.lon, r.lat),
      height = 20 + (r[layer.key] / peak) * 75;
    c.fillStyle = layer.color;
    c.globalAlpha = 0.15;
    c.beginPath();
    c.arc(p.x, p.y, height * 0.45, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 0.6;
    c.fillRect(p.x - 6, p.y - height, 12, height);
    c.globalAlpha = 1;
    c.font = '25px monospace';
    c.fillText(signalValue(r[layer.key], layer.key === 'revenue'), p.x + 12, p.y - height);
    c.font = '13px monospace';
    c.fillText(r.name, p.x + 12, p.y - height + 22);
  });
  c.restore();
  c.fillStyle = '#8db5ad';
  c.font = '28px monospace';
  c.fillText('SIMULATED SIGNALS · DEMO DATA', 70, 840);
  c.fillText(`${page + 1} / 4 · ← → LAYERS`, 1110, 840);
}
