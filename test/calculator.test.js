const test = require('node:test');
const assert = require('node:assert/strict');
const Calculator = require('../src/calculator.js');

// Applies a sequence of key presses, e.g. press('1', '+', '2', '=').
function press(...keys) {
  return keys.reduce((state, key) => {
    if (/^[0-9]$/.test(key)) return Calculator.inputDigit(state, key);
    if (key === ',') return Calculator.inputDecimal(state);
    if (key === '=') return Calculator.evaluate(state);
    return Calculator.chooseOperator(state, key);
  }, Calculator.createState());
}

function display(...keys) {
  return Calculator.getDisplay(press(...keys));
}

test('formatNumber uses a decimal comma', () => {
  assert.equal(Calculator.formatNumber(0.5), '0,5');
});

test('formatNumber keeps integers unchanged', () => {
  assert.equal(Calculator.formatNumber(42), '42');
});

test('starts with 0 and an empty expression', () => {
  assert.deepEqual(display(), { expression: '', current: '0' });
});

test('typing digits builds the number without leading zeros', () => {
  assert.deepEqual(display('0', '1', '2'), { expression: '', current: '12' });
});

test('shows the pending operator right after it is pressed', () => {
  assert.deepEqual(display('1', '+'), { expression: '1 +', current: '1' });
});

test('shows the second operand in the expression while typing it', () => {
  assert.deepEqual(display('1', '+', '2'), { expression: '1 + 2', current: '2' });
});

test('equals shows the full expression and the result', () => {
  assert.deepEqual(display('1', '+', '2', '='), { expression: '1 + 2 =', current: '3' });
});

test('adds, subtracts, multiplies and divides', () => {
  assert.equal(display('7', '+', '5', '=').current, '12');
  assert.equal(display('7', '-', '5', '=').current, '2');
  assert.equal(display('7', '*', '5', '=').current, '35');
  assert.equal(display('7', '/', '2', '=').current, '3,5');
  assert.equal(display('2', '-', '5', '=').current, '-3');
});

test('uses the on-screen symbols in the expression', () => {
  assert.equal(display('8', '-').expression, '8 −');
  assert.equal(display('8', '*').expression, '8 ×');
  assert.equal(display('8', '/').expression, '8 ÷');
});

test('changing the operator replaces it instead of duplicating', () => {
  assert.deepEqual(display('1', '+', '*'), { expression: '1 ×', current: '1' });
  assert.equal(display('6', '+', '*', '2', '=').current, '12');
});

test('hides floating point noise: 0,1 + 0,2 = 0,3', () => {
  assert.deepEqual(display('0', ',', '1', '+', '0', ',', '2', '='), {
    expression: '0,1 + 0,2 =',
    current: '0,3',
  });
  assert.equal(display('1', ',', '1', '*', '3', '=').current, '3,3');
});

test('decimal comma: typing shows a comma and only one is allowed', () => {
  assert.equal(display(',').current, '0,');
  assert.equal(display('1', ',', '5').current, '1,5');
  assert.equal(display('1', ',', '5', ',', '2').current, '1,52');
});

test('decimal comma starts the second operand at 0,', () => {
  assert.deepEqual(display('1', '+', ','), { expression: '1 + 0,', current: '0,' });
});

test('chained operations compute the partial result', () => {
  assert.deepEqual(display('1', '+', '2', '+'), { expression: '3 +', current: '3' });
  assert.deepEqual(display('1', '+', '2', '+', '4', '='), { expression: '3 + 4 =', current: '7' });
});

test('an operator after equals continues from the result', () => {
  assert.deepEqual(display('1', '+', '2', '=', '*'), { expression: '3 ×', current: '3' });
});

test('a digit after equals starts a new calculation', () => {
  assert.deepEqual(display('1', '+', '2', '=', '9'), { expression: '', current: '9' });
});

test('equals without a second number keeps the pending operation', () => {
  assert.deepEqual(display('5', '+', '='), { expression: '5 +', current: '5' });
});

test('equals without an operator does nothing', () => {
  assert.deepEqual(display('5', '='), { expression: '', current: '5' });
});

test('limits typed numbers to 15 digits', () => {
  const keys = Array(20).fill('9');
  assert.equal(display(...keys).current, '9'.repeat(15));
});

test('rejects invalid input', () => {
  const state = Calculator.createState();
  assert.throws(() => Calculator.inputDigit(state, 'a'));
  assert.throws(() => Calculator.chooseOperator(state, '%'));
});
