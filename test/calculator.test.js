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
    if (key === '⌫') return Calculator.backspace(state);
    if (key === '%') return Calculator.percent(state);
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
  assert.equal(display('2', '-', '5', '=').current, '−3');
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
  assert.equal(display(...'1234567890123'.split(''), '+', '1', '=').current, '1.234.567.890.124');
  assert.equal(display(...'123456789012345'.split(''), '+', '1', '=').current, '123.456.789.012.346');
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
  assert.equal(Calculator.formatNumber(1e21), '1.000.000.000.000.000.000.000');
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
  assert.equal(display(...keys).current, '999.999.999.999.999');
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
  assert.equal(result.current.replace(/\./g, '').length, 30);
});

test('backspace removes the last typed digit', () => {
  assert.deepEqual(display('1', '2', '3', '⌫'), { expression: '', current: '12', isError: false });
});

test('backspace removes the decimal comma', () => {
  assert.equal(display('1', '2', ',', '⌫').current, '12');
  assert.equal(display('1', ',', '5', '⌫', '⌫').current, '1');
});

test('backspace on the last digit shows 0 and does nothing on 0', () => {
  assert.equal(display('7', '⌫').current, '0');
  assert.equal(display('⌫').current, '0');
  assert.equal(display('7', '⌫', '⌫', '5').current, '5');
});

test('backspace keeps the expression in progress', () => {
  assert.deepEqual(display('1', '2', '+', '3', '4', '⌫'), { expression: '12 + 3', current: '3', isError: false });
  assert.deepEqual(display('1', '2', '+', '3', '⌫'), { expression: '12 + 0', current: '0', isError: false });
});

test('backspace right after an operator does not touch the first number', () => {
  assert.deepEqual(display('1', '2', '+', '⌫'), { expression: '12 +', current: '12', isError: false });
});

test('backspace after equals keeps the calculation and the result', () => {
  assert.deepEqual(display('1', '2', '+', '3', '=', '⌫'), { expression: '12 + 3 =', current: '15', isError: false });
});

test('backspace keeps an error message', () => {
  assert.equal(display('5', '/', '0', '=', '⌫').isError, true);
});

test('percent alone divides by 100', () => {
  assert.equal(display('5', '0', '%').current, '0,5');
  assert.equal(display('7', '%').current, '0,07');
});

test('percent in addition and subtraction uses the first number as base', () => {
  assert.deepEqual(display('2', '0', '0', '+', '1', '0', '%'), {
    expression: '200 + 20',
    current: '20',
    isError: false,
  });
  assert.deepEqual(display('2', '0', '0', '+', '1', '0', '%', '='), {
    expression: '200 + 20 =',
    current: '220',
    isError: false,
  });
  assert.equal(display('2', '0', '0', '-', '1', '0', '%').expression, '200 − 20');
  assert.equal(display('2', '0', '0', '-', '1', '0', '%', '=').current, '180');
});

test('percent in multiplication and division becomes a fraction', () => {
  assert.equal(display('2', '0', '0', '*', '1', '0', '%').expression, '200 × 0,1');
  assert.equal(display('2', '0', '0', '*', '1', '0', '%', '=').current, '20');
  assert.equal(display('2', '0', '0', '/', '5', '0', '%', '=').current, '400');
});

test('percent results have no floating point noise', () => {
  assert.equal(display('3', '3', '+', '7', '%').current, '2,31');
  assert.equal(display('0', ',', '1', '%').current, '0,001');
});

test('percent after equals applies to the result', () => {
  assert.deepEqual(display('1', '+', '2', '=', '%'), { expression: '', current: '0,03', isError: false });
});

test('a digit after percent starts a new number', () => {
  assert.equal(display('5', '0', '%', '3').current, '3');
  assert.equal(display('2', '0', '0', '+', '1', '0', '%', '5', '=').current, '205');
});

test('backspace does not edit a number produced by percent', () => {
  assert.equal(display('5', '0', '%', '⌫').current, '0,5');
});

test('percent while an operator waits for the second number does nothing', () => {
  assert.deepEqual(display('2', '0', '0', '+', '%'), { expression: '200 +', current: '200', isError: false });
});

test('formatNumber groups thousands with a dot', () => {
  const expected = ['1', '12', '125', '1.250', '12.500', '125.000', '1.250.000'];
  [1, 12, 125, 1250, 12500, 125000, 1250000].forEach((value, i) => {
    assert.equal(Calculator.formatNumber(value), expected[i]);
  });
});

test('formatNumber never groups the decimal part', () => {
  assert.equal(Calculator.formatNumber(1250.505), '1.250,505');
  assert.equal(Calculator.formatNumber('1250.50505'), '1.250,50505');
});

test('formatNumber keeps a typed trailing comma', () => {
  assert.equal(Calculator.formatNumber('1250.'), '1.250,');
  assert.equal(Calculator.formatNumber('1250.5'), '1.250,5');
});

test('formatNumber shows negatives with the minus sign', () => {
  assert.equal(Calculator.formatNumber(-1250), '−1.250');
  assert.equal(Calculator.formatNumber(-0.5), '−0,5');
  assert.equal(Calculator.formatNumber(-125), '−125');
});

test('typed numbers get the thousands separator while typing', () => {
  const steps = ['1', '2', '5', '0', '0', '0', '0'];
  const expected = ['1', '12', '125', '1.250', '12.500', '125.000', '1.250.000'];
  steps.forEach((_, i) => {
    assert.equal(display(...steps.slice(0, i + 1)).current, expected[i]);
  });
  assert.equal(display('1', '2', '5', '0', ',').current, '1.250,');
  assert.equal(display('1', '2', '5', '0', ',', '5').current, '1.250,5');
});

test('the expression and the result use the thousands separator', () => {
  const keys = ['1', '2', '5', '0', '+', '3', '4', '8', '0', ',', '5', '+', '1', '2', '0', '0', '0', '='];
  assert.deepEqual(display(...keys), {
    // Chained operations show the partial result (1.250 + 3.480,5 = 4.730,5).
    expression: '4.730,5 + 12.000 =',
    current: '16.730,5',
    isError: false,
  });
  assert.equal(display('1', '2', '5', '0', '*', '1', '0', '=').current, '12.500');
});

test('backspace moves the thousands separator', () => {
  assert.equal(display('1', '2', '5', '0', '⌫').current, '125');
  assert.equal(display('1', '2', '5', '0', '0', '⌫').current, '1.250');
});

test('copy text uses a decimal comma and no thousands separator', () => {
  const keys = ['1', '2', '5', '0', '+', '3', '4', '8', '0', ',', '5', '+', '1', '2', '0', '0', '0', '='];
  assert.equal(display(...keys).current, '16.730,5');
  assert.equal(Calculator.getCopyText(press(...keys)), '16730,5');
  assert.equal(Calculator.getCopyText(press('1', '2', '5', '0', '0', '0', '0')), '1250000');
});

test('copy text keeps decimals and uses a hyphen for negatives', () => {
  assert.equal(Calculator.getCopyText(press('2', '8', '7', ',', '4', '/', '4', '=')), '71,85');
  assert.equal(Calculator.getCopyText(press('1', '2', '5', '0', '-', '2', '5', '0', '0', '=')), '-1250');
});

test('copy text is the number being typed, without a trailing comma', () => {
  assert.equal(Calculator.getCopyText(press('1', '2', ',', '5')), '12,5');
  assert.equal(Calculator.getCopyText(press('1', '2', ',')), '12');
  assert.equal(Calculator.getCopyText(press()), '0');
});

test('copy text is the first number while an operator waits', () => {
  assert.equal(Calculator.getCopyText(press('1', '2', '0', '0', '+')), '1200');
});

test('nothing is copied while an error is shown', () => {
  assert.equal(Calculator.getCopyText(press('5', '/', '0', '=')), null);
});

test('getting the copy text does not change the calculation', () => {
  const state = press('1', '+', '2');
  Calculator.getCopyText(state);
  assert.deepEqual(Calculator.getDisplay(state).expression, '1 + 2');
});
