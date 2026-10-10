import {
  BANK_CASE,
  LEDGER_RECORDS,
  BANK_RECORDS,
  ADJUSTED_BANK,
  ADJUSTED_LEDGER,
  money,
} from './bank-reconciliation';
import { exactCents } from './demos';
import { COMMAND_LAYERS, COMMAND_REGIONS, commandMapSvg, signalValue } from './command-map';

function records(title: string, rows: typeof LEDGER_RECORDS, total: bigint, compared: boolean) {
  return `<section class="bank-book"><header><strong>${title}</strong><span>CLOSING ${money(total)}</span></header><table><thead><tr><th scope="col">REFERENCE</th><th scope="col">AMOUNT</th></tr></thead><tbody>${rows
    .map((r) => {
      const state = BANK_CASE.rows.find((d) => d.id === r.id)!.state;
      return `<tr data-state="${compared ? state : 'unchecked'}"><th scope="row">${r.id}</th><td>${money(exactCents(r.amount))}</td></tr>`;
    })
    .join('')}</tbody></table></section>`;
}
export function bankScreen(page: number, compared: boolean) {
  const differences = BANK_CASE.rows.filter((r) => r.state !== 'equal');
  const body =
    page === 0
      ? `<div class="bank-desk-note"><span>OPENING BALANCE ${money(exactCents('10000.00'))}</span><span>APRIL · DEMO RECORDS</span></div><div class="bank-books">${records('CASH LEDGER', LEDGER_RECORDS, BANK_CASE.ledger, compared)}${records('BANK STATEMENT', BANK_RECORDS, BANK_CASE.bank, compared)}</div><output class="bank-result" aria-live="polite">${compared ? '3 DIFFERENCES · ₹0.01 RECEIPT MISMATCH' : 'Press Enter to compare the records.'}</output>`
      : page === 1
        ? `<div class="bank-differences">${differences.map((r) => `<section data-state="${r.state}"><header><strong>${r.id}</strong><span>${r.state === 'changed' ? 'AMOUNT MISMATCH' : r.state === 'missing' ? 'ONLY IN LEDGER' : 'ONLY IN BANK'}</span></header><div><span>Ledger <b>${r.source ? money(exactCents(r.source.amount)) : '—'}</b></span><span>Bank <b>${r.target ? money(exactCents(r.target.amount)) : '—'}</b></span></div></section>`).join('')}</div><output class="bank-result">2 MATCHED · 3 TO INVESTIGATE</output>`
        : page === 2
          ? `<div class="bank-explanations">${BANK_CASE.explanations.map((item) => `<section><small>${item.ref} · ${item.amount}</small><h2>${item.title}</h2><p>${item.copy}</p><code>${item.suggestion}</code></section>`).join('')}</div>`
          : page === 3
            ? `<div class="balance-equations"><section><small>ADJUST THE LEDGER</small><div><span>${money(BANK_CASE.ledger)}</span><span>− ${money(BANK_CASE.fee)} <small>bank fee</small></span><span>+ ${money(BANK_CASE.correction)} <small>receipt correction</small></span></div><strong>= ${money(ADJUSTED_LEDGER)}</strong></section><section><small>ADJUST THE BANK</small><div><span>${money(BANK_CASE.bank)}</span><span>+ ${money(BANK_CASE.deposit)} <small>deposit in transit</small></span></div><strong>= ${money(ADJUSTED_BANK)}</strong></section></div><output class="bank-result success">BALANCED · RESIDUAL ${money(ADJUSTED_LEDGER - ADJUSTED_BANK)}</output>`
            : `<div class="bank-review"><div><span>01</span><p><strong>Confirm the receipt.</strong> Check the supporting document before adding ₹0.01 to the ledger.</p></div><div><span>02</span><p><strong>Record the bank charge.</strong> Post the ₹125.00 fee after reviewing the statement.</p></div><div><span>03</span><p><strong>Track the deposit.</strong> Keep ₹1,200.00 as a timing item until the bank clears it.</p></div></div><output class="bank-result success">EXACT BALANCE ${money(ADJUSTED_BANK)} · KEEP AN AUDIT TRAIL</output>`;
  return `<section class="bank-terminal" aria-label="RIFT bank reconciliation computer"><header class="terminal-bar"><strong>RIFT <span>/ RECONCILIATION DESK</span></strong><small>ANALYST 01 <i></i></small></header><div class="terminal-tabs">${['RECORDS', 'DETECT', 'EXPLAIN', 'SOLVE', 'REVIEW'].map((label, i) => `<span ${i === page ? 'aria-current="step"' : ''}>${String(i + 1).padStart(2, '0')} ${label}</span>`).join('')}</div><div class="terminal-workspace" tabindex="0" role="region" aria-label="Reconciliation slide content">${body}</div><footer>ILLUSTRATIVE BANK CASE <span class="terminal-input-hint">← → SLIDES · ENTER ${page === 0 && !compared ? 'COMPARE' : 'NEXT'}</span><span class="terminal-touch-hint">SWIPE ↑ TO READ</span></footer></section>`;
}
export function commandScreen(page: number) {
  const layer = COMMAND_LAYERS[page],
    total = COMMAND_REGIONS.reduce((sum, r) => sum + r[layer.key], 0);
  return `<section class="command-console" aria-label="OpsFlash holographic world map" style="--signal:${layer.color}"><header><div><small>OPSFLASH / HIGH COMMAND</small><h2>${layer.label}</h2></div><div class="command-total"><strong>${signalValue(total, layer.key === 'revenue')}</strong><span>${layer.unit}</span></div></header><div class="hologram-projector">${commandMapSvg(page)}<div class="projection-base"></div></div><div class="command-regions">${COMMAND_REGIONS.map((r) => `<div><small>${r.name}</small><strong>${signalValue(r[layer.key], layer.key === 'revenue')}</strong></div>`).join('')}</div><nav aria-label="Map layers">${COMMAND_LAYERS.map((l, i) => `<button type="button" data-layer="${i}" aria-pressed="${i === page}">${['SEARCH', 'SOCIAL', 'LEADS', 'REVENUE'][i]}</button>`).join('')}</nav><footer><i></i> SIMULATED SIGNALS · DEMO DATA <span>← → CHANGE LAYER</span></footer></section>`;
}
