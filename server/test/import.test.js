import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, parseFlexibleDate, validateRow } from '../src/utils/importUtils.js';

test('T4 Import - Phone normalization', () => {
  assert.equal(normalizePhone('+91 98765 43210'), '9876543210');
  assert.equal(normalizePhone('91-9876543210'), '9876543210');
  assert.equal(normalizePhone('(987) 654-3210'), '9876543210');
  assert.equal(normalizePhone('09876543210'), '9876543210');
  assert.equal(normalizePhone('9876543210'), '9876543210');

  // Invalid phones (< 10 digits or empty)
  assert.equal(normalizePhone('12345'), null);
  assert.equal(normalizePhone(''), null);
  assert.equal(normalizePhone(null), null);
});

test('T4 Import - Flexible date parsing across mixed formats', () => {
  // ISO
  assert.equal(parseFlexibleDate('2026-09-15'), '2026-09-15');

  // DD/MM/YYYY
  assert.equal(parseFlexibleDate('15/09/2026'), '2026-09-15');

  // MM/DD/YYYY (unambiguous because 25 > 12)
  assert.equal(parseFlexibleDate('09/25/2026'), '2026-09-25');

  // Ambiguous date defaults to DD/MM/YYYY (03/04/2026 -> 3rd April 2026)
  assert.equal(parseFlexibleDate('03/04/2026'), '2026-04-03');

  // Textual: "15 Sep 2026"
  assert.equal(parseFlexibleDate('15 Sep 2026'), '2026-09-15');

  // Epoch millisecond timestamp
  assert.equal(parseFlexibleDate(1789459200000), '2026-09-15');

  // Invalid date: Feb 31
  assert.equal(parseFlexibleDate('31/02/2026'), null);
  assert.equal(parseFlexibleDate('invalid-date'), null);
});

test('T4 Import - Row validation', () => {
  const planLookup = new Map([
    ['standard veg monthly', { _id: 'plan-1', name: 'Standard Veg Monthly' }],
    ['plan-1', { _id: 'plan-1', name: 'Standard Veg Monthly' }]
  ]);

  // Clean row
  const cleanResult = validateRow(
    {
      name: 'Priya Sharma',
      phone: '+91 98765-43210',
      startDate: '15/09/2026',
      planName: 'Standard Veg Monthly',
      address: 'Tower A, 502'
    },
    planLookup
  );
  assert.equal(cleanResult.valid, true);
  assert.equal(cleanResult.cleanRow.phone, '9876543210');
  assert.equal(cleanResult.cleanRow.startDate, '2026-09-15');

  // Blank name -> Rejected
  const blankName = validateRow(
    { name: '   ', phone: '9876543210', startDate: '2026-09-15', planName: 'Standard Veg Monthly' },
    planLookup
  );
  assert.equal(blankName.valid, false);
  assert.ok(blankName.reason.includes('name'));

  // Invalid phone -> Rejected
  const invalidPhone = validateRow(
    { name: 'Priya', phone: '123', startDate: '2026-09-15', planName: 'Standard Veg Monthly' },
    planLookup
  );
  assert.equal(invalidPhone.valid, false);
  assert.ok(invalidPhone.reason.includes('phone'));

  // Unparseable date -> Rejected
  const badDate = validateRow(
    { name: 'Priya', phone: '9876543210', startDate: '31/02/2026', planName: 'Standard Veg Monthly' },
    planLookup
  );
  assert.equal(badDate.valid, false);
  assert.ok(badDate.reason.includes('date'));

  // Unknown plan -> Rejected
  const unknownPlan = validateRow(
    { name: 'Priya', phone: '9876543210', startDate: '2026-09-15', planName: 'NonExistent Plan' },
    planLookup
  );
  assert.equal(unknownPlan.valid, false);
  assert.ok(unknownPlan.reason.includes('plan'));
});
