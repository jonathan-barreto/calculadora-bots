// UI wiring: connects the DOM to the logic in calculator.js.
(function () {
  'use strict';

  const display = document.getElementById('display-current');
  display.textContent = Calculator.formatNumber(0);
})();
