const test = require('node:test');
const assert = require('node:assert/strict');
const Calculator = require('../src/calculator.js');

// Applies a sequence of key presses, e.g. press('1', '+', '2', '=').
function press(...keys) {
  return keys.reduce((state, key) => {
    if (/^[0-9]$/.test(key)) return Calculator.inputDigit(state, key);
    if (key === ',') return Calculator.inputDecimal(state);
    if (key === '=') return Calculator.evaluate(state);
    if (key === 'C') return Calculator.clear();
    return Calculator.chooseOperator(state, key);
  }, Calculator.createState());
}

// Display text and error flag (the highlighted operator is tested separately).
function display(...keys) {
  const { activeOperator, ...text } = Calculator.getDisplay(press(...keys));
  return text;
}

function activeOperator(...keys) {
  return Calculator.getDisplay(press(...keys)).activeOperator;
}

test('formatNumber uses a decimal comma', () => {
  assert.equal(Calculator.formatNumber(0.5), '0,5');
});

test('formatNumber keeps integers unchanged', () => {
  assert.equal(Calculator.formatNumber(42), '42');
});

test('starts with 0 and an empty expression', () => {
  assert.deepEqual(display(), { expression: '', current: '0', isError: false });
});

test('typing digits builds the number without leading zeros', () => {
  assert.deepEqual(display('0', '1', '2'), { expression: '', current: '12', isError: false });
});

test('shows the pending operator right after it is pressed', () => {
  assert.deepEqual(display('1', '+'), { expression: '1 +', current: '1', isError: false });
});

test('shows the second operand in the expression while typing it', () => {
  assert.deepEqual(display('1', '+', '2'), { expression: '1 + 2', current: '2', isError: false });
});

test('equals shows the full expression and the result', () => {
  assert.deepEqual(display('1', '+', '2', '='), { expression: '1 + 2 =', current: '3', isError: false });
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
  assert.deepEqual(display('1', '+', '*'), { expression: '1 ×', current: '1', isError: false });
  assert.equal(display('6', '+', '*', '2', '=').current, '12');
});

test('hides floating point noise: 0,1 + 0,2 = 0,3', () => {
  assert.deepEqual(display('0', ',', '1', '+', '0', ',', '2', '='), {
    expression: '0,1 + 0,2 =',
    current: '0,3',
    isError: false,
  });
  assert.equal(display('1', ',', '1', '*', '3', '=').current, '3,3');
});

test('keeps every digit of 13 to 15 digit numbers', () => {
  assert.equal(display(...'1234567890123'.split(''), '+', '1', '=').current, '1234567890124');
  assert.equal(display(...'123456789012345'.split(''), '+', '1', '=').current, '123456789012346');
});

test('never shows exponent notation for small numbers', () => {
  assert.deepEqual(display('0', ',', ...'0000001'.split(''), '*'), {
    expression: '0,0000001 ×',
    current: '0,0000001',
    isError: false,
  });
  assert.deepEqual(display('0', ',', ...'0000001'.split(''), '*', '0', ',', '1', '='), {
    expression: '0,0000001 × 0,1 =',
    current: '0,00000001',
    isError: false,
  });
});

test('formatNumber never uses exponent notation', () => {
  assert.equal(Calculator.formatNumber(1e-7), '0,0000001');
  assert.equal(Calculator.formatNumber(1e21), '1000000000000000000000');
});

test('decimal comma: typing shows a comma and only one is allowed', () => {
  assert.equal(display(',').current, '0,');
  assert.equal(display('1', ',', '5').current, '1,5');
  assert.equal(display('1', ',', '5', ',', '2').current, '1,52');
});

test('decimal comma starts the second operand at 0,', () => {
  assert.deepEqual(display('1', '+', ','), { expression: '1 + 0,', current: '0,', isError: false });
});

test('chained operations compute the partial result', () => {
  assert.deepEqual(display('1', '+', '2', '+'), { expression: '3 +', current: '3', isError: false });
  assert.deepEqual(display('1', '+', '2', '+', '4', '='), { expression: '3 + 4 =', current: '7', isError: false });
});

test('an operator after equals continues from the result', () => {
  assert.deepEqual(display('1', '+', '2', '=', '*'), { expression: '3 ×', current: '3', isError: false });
});

test('a digit after equals starts a new calculation', () => {
  assert.deepEqual(display('1', '+', '2', '=', '9'), { expression: '', current: '9', isError: false });
});

test('equals without a second number keeps the pending operation', () => {
  assert.deepEqual(display('5', '+', '='), { expression: '5 +', current: '5', isError: false });
});

test('equals without an operator does nothing', () => {
  assert.deepEqual(display('5', '='), { expression: '', current: '5', isError: false });
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

test('C clears the display and the expression back to 0', () => {
  assert.deepEqual(display('1', '2', '+', '3', 'C'), { expression: '', current: '0', isError: false });
  assert.deepEqual(display('1', '+', '2', '=', 'C'), { expression: '', current: '0', isError: false });
  assert.deepEqual(display('5', '+', 'C', '2', '='), { expression: '', current: '2', isError: false });
});

const DIVIDE_BY_ZERO = 'Não é possível dividir por zero';

test('dividing by zero shows a friendly message', () => {
  assert.deepEqual(display('5', '/', '0', '='), {
    expression: '5 ÷ 0 =',
    current: DIVIDE_BY_ZERO,
    isError: true,
  });
  assert.equal(display('0', '/', '0', '=').current, DIVIDE_BY_ZERO);
  assert.equal(display('5', '/', '0', ',', '0', '=').current, DIVIDE_BY_ZERO);
});

test('dividing by zero in a chained operation shows the message', () => {
  assert.deepEqual(display('5', '/', '0', '+'), {
    expression: '5 ÷ 0',
    current: DIVIDE_BY_ZERO,
    isError: true,
  });
});

test('the next digit after a division by zero starts a new calculation', () => {
  assert.deepEqual(display('5', '/', '0', '=', '7'), { expression: '', current: '7', isError: false });
  assert.equal(display('5', '/', '0', '=', '2', '+', '3', '=').current, '5');
  assert.deepEqual(display('5', '/', '0', '=', ','), { expression: '', current: '0,', isError: false });
});

test('operators and equals are ignored while an error is shown', () => {
  assert.equal(display('5', '/', '0', '=', '+').current, DIVIDE_BY_ZERO);
  assert.equal(display('5', '/', '0', '=', '=').current, DIVIDE_BY_ZERO);
});

test('C clears an error', () => {
  assert.deepEqual(display('5', '/', '0', '=', 'C'), { expression: '', current: '0', isError: false });
});

test('results too large for a number show a message instead of Infinity', () => {
  const big = '9'.repeat(15).split('');
  // 999999999999999 to the 21st power is about 1e315, beyond Number.MAX_VALUE.
  const keys = [];
  for (let i = 0; i < 20; i += 1) keys.push(...big, '*');
  keys.push(...big, '=');
  const result = display(...keys);
  assert.equal(result.isError, true);
  assert.equal(result.current, 'Número grande demais');
});

test('highlights the pending operator until the second number is typed', () => {
  assert.equal(activeOperator('1'), null);
  assert.equal(activeOperator('1', '+'), '+');
  assert.equal(activeOperator('1', '-'), '-');
  assert.equal(activeOperator('1', '+', '*'), '*');
  assert.equal(activeOperator('1', '+', '2'), null);
  assert.equal(activeOperator('1', '+', ','), null);
});

test('highlights the operator again in a chained operation and after equals', () => {
  assert.equal(activeOperator('1', '+', '2', '+'), '+');
  assert.equal(activeOperator('1', '+', '2', '=', '/'), '/');
});

test('no operator is highlighted after equals, C or an error', () => {
  assert.equal(activeOperator('1', '+', '2', '='), null);
  assert.equal(activeOperator('1', '+', 'C'), null);
  assert.equal(activeOperator('5', '/', '0', '='), null);
});

test('shows the pending operator before the second number for every operator', () => {
  assert.equal(display('1', '+').expression, '1 +');
  assert.equal(display('1', '-').expression, '1 −');
  assert.equal(display('1', '*').expression, '1 ×');
  assert.equal(display('1', '/').expression, '1 ÷');
});

test('results longer than 30 digits show a message instead of a cut number', () => {
  const big = '9'.repeat(15).split('');
  const result = display(...big, '*', ...big, '*', ...big, '=');
  assert.equal(result.isError, true);
  assert.equal(result.current, 'Número grande demais');
});

test('results up to 30 digits are still shown', () => {
  const big = '9'.repeat(15).split('');
  const result = display(...big, '*', ...big, '=');
  assert.equal(result.isError, false);
  assert.equal(result.current.length, 30);
});
