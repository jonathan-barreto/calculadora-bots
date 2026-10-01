const test = require('node:test');
const assert = require('node:assert/strict');
const Calculator = require('../src/calculator.js');
const History = require('../src/history.js');

// Applies key presses like the keypad and records finished calculations,
// the same way app.js does.
function run(keys, entries = []) {
  let state = Calculator.createState();
  let history = entries;
  for (const key of keys) {
    const before = state;
    if (/^[0-9]$/.test(key)) state = Calculator.inputDigit(state, key);
    else if (key === ',') state = Calculator.inputDecimal(state);
    else if (key === '=') state = Calculator.evaluate(state);
    else if (key === 'C') state = Calculator.clear();
    else state = Calculator.chooseOperator(state, key);
    const entry = History.entryFromTransition(before, state);
    if (entry) history = History.addEntry(history, entry);
  }
  return { state, history };
}

function entryText(entry) {
  return `${entry.expression} ${Calculator.formatNumber(entry.value)}`;
}

test('a calculation finished with equals is recorded in the display format', () => {
  const { history } = run(['2', '8', '7', ',', '4', '0', '/', '4', '=']);
  assert.equal(history.length, 1);
  assert.equal(entryText(history[0]), '287,4 ÷ 4 = 71,85');
});

test('uses the thousands separator like the display', () => {
  const { history } = run(['1', '2', '5', '0', '*', '1', '0', '=']);
  assert.equal(entryText(history[0]), '1.250 × 10 = 12.500');
});

test('newest calculation comes first', () => {
  const { history } = run(['1', '+', '1', '=', '2', '+', '2', '=']);
  assert.deepEqual(history.map(entryText), ['2 + 2 = 4', '1 + 1 = 2']);
});

test('keeps only the 10 most recent calculations', () => {
  let history = [];
  for (let i = 1; i <= 11; i += 1) {
    history = History.addEntry(history, { expression: `${i} + 0 =`, value: String(i) });
  }
  assert.equal(history.length, History.MAX_ENTRIES);
  assert.equal(history[0].expression, '11 + 0 =');
  assert.equal(history[9].expression, '2 + 0 =');
});

test('errors are not recorded', () => {
  const { history } = run(['5', '/', '0', '=']);
  assert.deepEqual(history, []);
});

test('pressing equals again or without an operation records nothing', () => {
  assert.equal(run(['1', '+', '2', '=', '=']).history.length, 1);
  assert.equal(run(['5', '=']).history.length, 0);
  assert.equal(run(['5', '+', '=']).history.length, 0);
});

test('C does not clear the history', () => {
  const { history } = run(['1', '+', '2', '=', 'C']);
  assert.equal(history.length, 1);
});

test('clearHistory empties the list', () => {
  assert.deepEqual(History.clearHistory(), []);
});

test('history survives serialization', () => {
  const { history } = run(['1', '+', '2', '=', '3', '*', '3', '=']);
  assert.deepEqual(History.parse(History.serialize(history)), history);
});

test('parse ignores missing or malformed saved data', () => {
  assert.deepEqual(History.parse(null), []);
  assert.deepEqual(History.parse('not json'), []);
  assert.deepEqual(History.parse('{"a":1}'), []);
  assert.deepEqual(History.parse('[{"expression":"1 + 1 =","value":"x"},{"expression":"1 + 1 =","value":"2"}]'), [
    { expression: '1 + 1 =', value: '2' },
  ]);
});

test('recalling a result puts it on the display ready to continue', () => {
  const recalled = Calculator.recallValue(run(['9']).state, '71.85');
  assert.deepEqual(Calculator.getDisplay(recalled).current, '71,85');
  const next = Calculator.chooseOperator(recalled, '+');
  assert.equal(Calculator.getDisplay(next).expression, '71,85 +');
});

test('recalling a result fills the second number of a pending operation', () => {
  const recalled = Calculator.recallValue(run(['5', '+']).state, '3');
  assert.equal(Calculator.getDisplay(recalled).expression, '5 + 3');
  assert.equal(Calculator.getDisplay(Calculator.evaluate(recalled)).current, '8');
});

test('recalling a result after equals or an error starts a new calculation', () => {
  const afterEquals = Calculator.recallValue(run(['1', '+', '2', '=']).state, '7');
  assert.deepEqual(Calculator.getDisplay(afterEquals).expression, '');
  assert.equal(Calculator.getDisplay(afterEquals).current, '7');
  const afterError = Calculator.recallValue(run(['5', '/', '0', '=']).state, '7');
  assert.equal(Calculator.getDisplay(afterError).isError, false);
});

test('a digit typed after recalling a result starts a new number', () => {
  const recalled = Calculator.recallValue(Calculator.createState(), '71.85');
  assert.equal(Calculator.getDisplay(Calculator.inputDigit(recalled, '4')).current, '4');
});

test('every calculation the app records passes validation', () => {
  const sequences = [
    ['2', '8', '7', ',', '4', '/', '4', '='],
    ['1', '2', '5', '0', '-', '2', '5', '0', '0', '='],
    ['1', '2', '5', '0', '-', '2', '5', '0', '0', '=', '*', '1', '0', '='],
    ['0', ',', '1', '+', '0', ',', '2', '='],
    ['9', '9', '9', '9', '9', '9', '*', '9', '9', '9', '9', '9', '9', '='],
  ];
  for (const keys of sequences) {
    const { history } = run(keys);
    assert.ok(history.length > 0);
    for (const entry of history) {
      assert.equal(History.isEntry(entry), true, JSON.stringify(entry));
    }
  }
});

test('saved entries with invalid values are dropped', () => {
  for (const value of ['5abc', 'NaN', 'Infinity', '', '1e5', '1,5', ' 5', '--5', '5.']) {
    assert.equal(History.isEntry({ expression: '1 + 1 =', value }), false, value);
  }
});

test('saved entries with invalid expressions are dropped', () => {
  for (const expression of ['5abc + 1 =', '1 + 1', '1 ++ 1 =', '<b>1</b> + 1 =', '1250 + 1 =', '1 % 1 =', '']) {
    assert.equal(History.isEntry({ expression, value: '2' }), false, expression);
  }
});

test('saved entries of the wrong type are dropped', () => {
  for (const entry of [null, 5, 'text', [], { expression: '1 + 1 =' }, { expression: 1, value: '2' }]) {
    assert.equal(History.isEntry(entry), false, JSON.stringify(entry));
  }
});

test('parse keeps valid entries in order and drops invalid ones', () => {
  const saved = JSON.stringify([
    { expression: '3 + 3 =', value: '6' },
    { expression: '1 + 1 =', value: '5abc' },
    { expression: '2 + 2 =', value: '4' },
    'garbage',
    { expression: '1 + 0 =', value: '1' },
  ]);
  assert.deepEqual(History.parse(saved).map((entry) => entry.value), ['6', '4', '1']);
});

test('parse handles broken JSON and other types without throwing', () => {
  for (const text of ['{broken', '"text"', '42', 'true', 'null', '{"expression":"1 + 1 =","value":"2"}', undefined]) {
    assert.deepEqual(History.parse(text), [], String(text));
  }
});

test('parse keeps only the 10 most recent valid entries', () => {
  const saved = Array.from({ length: 15 }, (_, i) => ({ expression: `${i} + 0 =`, value: String(i) }));
  const parsed = History.parse(JSON.stringify(saved));
  assert.equal(parsed.length, 10);
  assert.equal(parsed[0].value, '0');
  assert.equal(parsed[9].value, '9');
});

test('recalling an invalid value never reaches the display', () => {
  const state = run(['7']).state;
  for (const value of ['5abc', 'NaN', '', undefined, null, 5]) {
    assert.equal(Calculator.getDisplay(Calculator.recallValue(state, value)).current, '7', String(value));
  }
});
