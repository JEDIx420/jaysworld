import { exactCents, compareDemoRecords } from './demos';

export const BANK_OPENING = '10000.00';
export const LEDGER_RECORDS = [
  { id: 'RCPT-104', amount: '4500.75', status: 'Customer receipt' },
  { id: 'DEP-105', amount: '1200.00', status: 'Deposit in transit' },
  { id: 'PAY-206', amount: '-750.00', status: 'Supplier payment' },
  { id: 'TRF-208', amount: '-2000.00', status: 'Account transfer' },
];
export const BANK_RECORDS = [
  { id: 'RCPT-104', amount: '4500.76', status: 'Customer receipt' },
  { id: 'PAY-206', amount: '-750.00', status: 'Supplier payment' },
  { id: 'TRF-208', amount: '-2000.00', status: 'Account transfer' },
  { id: 'FEE-007', amount: '-125.00', status: 'Bank service charge' },
];
export function money(cents: bigint) {
  const amount = cents < 0n ? -cents : cents;
  return `${cents < 0n ? '−' : ''}₹${(amount / 100n).toLocaleString('en-IN')}.${String(amount % 100n).padStart(2, '0')}`;
}
const total = (rows: typeof LEDGER_RECORDS) =>
  exactCents(BANK_OPENING) + rows.reduce((sum, row) => sum + exactCents(row.amount), 0n);
export const BANK_CASE = {
  ledger: total(LEDGER_RECORDS),
  bank: total(BANK_RECORDS),
  rows: compareDemoRecords(LEDGER_RECORDS, BANK_RECORDS),
  deposit: exactCents('1200.00'),
  fee: exactCents('125.00'),
  correction: exactCents('0.01'),
  explanations: [
    {
      ref: 'RCPT-104',
      title: 'One paisa out.',
      amount: '₹0.01',
      copy: 'The bank receipt is one paisa higher. Check the receipt, then correct the ledger amount.',
      suggestion: '₹4,500.76 − ₹4,500.75 = ₹0.01',
    },
    {
      ref: 'DEP-105',
      title: 'A timing difference.',
      amount: '₹1,200.00',
      copy: 'The deposit is in the ledger but has not appeared on the statement. Carry it as a deposit in transit.',
      suggestion: 'Bank balance + deposit in transit',
    },
    {
      ref: 'FEE-007',
      title: 'An unrecorded fee.',
      amount: '₹125.00',
      copy: 'The statement contains a service charge that the ledger is missing. Review the bank evidence before posting it.',
      suggestion: 'Ledger balance − bank service charge',
    },
  ],
};
export const ADJUSTED_LEDGER = BANK_CASE.ledger - BANK_CASE.fee + BANK_CASE.correction;
export const ADJUSTED_BANK = BANK_CASE.bank + BANK_CASE.deposit;
