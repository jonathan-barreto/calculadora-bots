// UI wiring: connects the DOM to the logic in calculator.js.
(function () {
  'use strict';

  const expressionEl = document.getElementById('display-expression');
  const currentEl = document.getElementById('display-current');
  const keypad = document.querySelector('.keypad');
  const operatorKeys = keypad.querySelectorAll('[data-operator]');
  const MIN_FONT_SIZE_PX = 10;

  let state = Calculator.createState();

  // Shrinks the font of a display line until its text fits the width.
  function fitText(element) {
    element.style.fontSize = '';
    if (element.scrollWidth <= element.clientWidth) {
      return;
    }
    // Start from the proportional size, then step down until it fits.
    const baseSize = parseFloat(getComputedStyle(element).fontSize);
    let size = Math.floor((baseSize * element.clientWidth) / element.scrollWidth);
    element.style.fontSize = `${Math.max(MIN_FONT_SIZE_PX, size)}px`;
    while (element.scrollWidth > element.clientWidth && size > MIN_FONT_SIZE_PX) {
      size -= 1;
      element.style.fontSize = `${size}px`;
    }
  }

  // Last resort for the expression line: cut it from the start with "…" so the
  // end of the calculation (the part the user just typed) stays visible.
  function trimStart(element) {
    const text = element.textContent;
    let cut = 0;
    while (element.scrollWidth > element.clientWidth && cut < text.length) {
      cut += 1;
      element.textContent = `…${text.slice(cut)}`;
    }
  }

  function render() {
    const display = Calculator.getDisplay(state);
    expressionEl.textContent = display.expression;
    currentEl.textContent = display.current;
    currentEl.classList.toggle('display__current--error', display.isError);
    fitText(expressionEl);
    trimStart(expressionEl);
    fitText(currentEl);
    operatorKeys.forEach((key) => {
      const active = key.dataset.operator === display.activeOperator;
      key.classList.toggle('key--active', active);
      key.setAttribute('aria-pressed', String(active));
    });
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

  window.addEventListener('resize', render);
  render();
})();
