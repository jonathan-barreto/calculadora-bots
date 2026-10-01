// Maps physical keyboard keys to calculator keys. Must not touch the DOM so
// it can be tested in Node.
(function (root) {
  'use strict';

  // KeyboardEvent.key values (top row and numeric keypad give the same ones).
  const OPERATORS = { '+': '+', '-': '-', '*': '*', x: '*', X: '*', '/': '/' };
  const ACTIONS = {
    ',': 'decimal',
    '.': 'decimal',
    Decimal: 'decimal',
    Enter: 'equals',
    '=': 'equals',
    Backspace: 'backspace',
    Escape: 'clear',
    Delete: 'clear',
    '%': 'percent',
  };

  // Returns the on-screen key for a keyboard event as
  // { digit } | { operator } | { action }, or null when the key has no use
  // here. Shortcuts with Ctrl, Cmd or Alt are left to the browser.
  function keyFromEvent(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return null;
    }
    const { key, code = '' } = event;
    if (/^[0-9]$/.test(key)) {
      return { digit: key };
    }
    // Numeric keypad by physical position, so it types numbers even with
    // NumLock off (when key would be "Home", "PageDown"...).
    const numpadDigit = /^Numpad([0-9])$/.exec(code);
    if (numpadDigit) {
      return { digit: numpadDigit[1] };
    }
    if (code === 'NumpadDecimal') {
      return { action: 'decimal' };
    }
    if (key in OPERATORS) {
      return { operator: OPERATORS[key] };
    }
    if (key in ACTIONS) {
      return { action: ACTIONS[key] };
    }
    return null;
  }

  const Keyboard = { keyFromEvent };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Keyboard;
  } else {
    root.Keyboard = Keyboard;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
