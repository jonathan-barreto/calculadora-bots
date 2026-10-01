const test = require('node:test');
const assert = require('node:assert/strict');
const { formatNumber } = require('../src/calculator.js');

test('formatNumber uses a decimal comma', () => {
  assert.equal(formatNumber(0.5), '0,5');
});

test('formatNumber keeps integers unchanged', () => {
  assert.equal(formatNumber(42), '42');
});
