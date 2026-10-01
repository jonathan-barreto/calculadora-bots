// UI wiring: connects the DOM to the logic in calculator.js.
(function () {
  'use strict';

  const expressionEl = document.getElementById('display-expression');
  const currentEl = document.getElementById('display-current');
  const keypad = document.querySelector('.keypad');

  let state = Calculator.createState();

  function render() {
    const display = Calculator.getDisplay(state);
    expressionEl.textContent = display.expression;
    currentEl.textContent = display.current;
    currentEl.classList.toggle('display__current--error', display.isError);
  }

  keypad.addEventListener('click', (event) => {
    const key = event.target.closest('.key');
    if (!key) {
      return;
    }
    const { digit, operator, action } = key.dataset;
    if (digit !== undefined) {
      state = Calculator.inputDigit(state, digit);
    } else if (operator !== undefined) {
      state = Calculator.chooseOperator(state, operator);
    } else if (action === 'decimal') {
      state = Calculator.inputDecimal(state);
    } else if (action === 'equals') {
      state = Calculator.evaluate(state);
    } else if (action === 'clear') {
      state = Calculator.clear();
    } else {
      return;
    }
    render();
  });

  render();
})();
