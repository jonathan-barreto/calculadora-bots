const test = require('node:test');
const assert = require('node:assert/strict');
const { keyFromEvent } = require('../src/keyboard.js');

const key = (value, modifiers = {}) => keyFromEvent({ key: value, ...modifiers });

test('digits from the top row and the numeric keypad', () => {
  for (const digit of '0123456789') {
    assert.deepEqual(key(digit), { digit });
  }
});

test('comma, dot and the keypad decimal type the decimal comma', () => {
  assert.deepEqual(key(','), { action: 'decimal' });
  assert.deepEqual(key('.'), { action: 'decimal' });
  assert.deepEqual(key('Decimal'), { action: 'decimal' });
});

test('operators, with * and x for multiplication', () => {
  assert.deepEqual(key('+'), { operator: '+' });
  assert.deepEqual(key('-'), { operator: '-' });
  assert.deepEqual(key('*'), { operator: '*' });
  assert.deepEqual(key('x'), { operator: '*' });
  assert.deepEqual(key('X'), { operator: '*' });
  assert.deepEqual(key('/'), { operator: '/' });
});

test('Enter and = calculate', () => {
  assert.deepEqual(key('Enter'), { action: 'equals' });
  assert.deepEqual(key('='), { action: 'equals' });
});

test('Backspace erases, Escape and Delete clear, % is percent', () => {
  assert.deepEqual(key('Backspace'), { action: 'backspace' });
  assert.deepEqual(key('Escape'), { action: 'clear' });
  assert.deepEqual(key('Delete'), { action: 'clear' });
  assert.deepEqual(key('%'), { action: 'percent' });
});

test('keys without a use are ignored', () => {
  for (const value of ['a', 'z', 'Shift', 'Tab', ' ', 'ArrowLeft', 'F5']) {
    assert.equal(key(value), null);
  }
});

test('browser shortcuts with Ctrl, Cmd or Alt are left alone', () => {
  assert.equal(key('r', { ctrlKey: true }), null);
  assert.equal(key('c', { metaKey: true }), null);
  assert.equal(key('1', { ctrlKey: true }), null);
  assert.equal(key('x', { ctrlKey: true }), null);
  assert.equal(key('-', { altKey: true }), null);
});

test('the numeric keypad types numbers even with NumLock off', () => {
  assert.deepEqual(keyFromEvent({ key: 'Home', code: 'Numpad7' }), { digit: '7' });
  assert.deepEqual(keyFromEvent({ key: 'Insert', code: 'Numpad0' }), { digit: '0' });
  assert.deepEqual(keyFromEvent({ key: 'Delete', code: 'NumpadDecimal' }), { action: 'decimal' });
  assert.deepEqual(keyFromEvent({ key: '*', code: 'NumpadMultiply' }), { operator: '*' });
  assert.deepEqual(keyFromEvent({ key: 'Enter', code: 'NumpadEnter' }), { action: 'equals' });
});

test('Delete outside the numeric keypad still clears', () => {
  assert.deepEqual(keyFromEvent({ key: 'Delete', code: 'Delete' }), { action: 'clear' });
});
