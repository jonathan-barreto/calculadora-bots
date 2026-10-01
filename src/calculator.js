// Calculator logic. Must not touch the DOM so it can be tested in Node.
(function (root) {
  'use strict';

  // Formats a number for display using the Brazilian decimal comma.
  function formatNumber(value) {
    return String(value).replace('.', ',');
  }

  const Calculator = { formatNumber };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calculator;
  } else {
    root.Calculator = Calculator;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
