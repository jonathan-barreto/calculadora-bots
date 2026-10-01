// UI wiring: connects the DOM to the logic in calculator.js.
(function () {
  'use strict';

  const expressionEl = document.getElementById('display-expression');
  const currentEl = document.getElementById('display-current');
  const keypad = document.querySelector('.keypad');
  const operatorKeys = keypad.querySelectorAll('[data-operator]');
  const MIN_FONT_SIZE_PX = 10;

  const historyToggle = document.getElementById('history-toggle');
  const historyPanel = document.getElementById('history');
  const historyList = document.getElementById('history-list');
  const historyEmpty = document.getElementById('history-empty');
  const historyClear = document.getElementById('history-clear');
  const HISTORY_STORAGE_KEY = 'calculadora.history';

  let state = Calculator.createState();
  let history = loadHistory();

  // Storage can be unavailable (private mode, blocked site data): the history
  // then just lives until the page is closed.
  function loadHistory() {
    try {
      return History.parse(localStorage.getItem(HISTORY_STORAGE_KEY));
    } catch {
      return [];
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, History.serialize(history));
    } catch {
      // Keep working without persistence.
    }
  }

  function renderHistory() {
    historyList.replaceChildren(
      ...history.map((entry) => {
        const result = Calculator.formatNumber(entry.value);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'history__entry';
        button.dataset.value = entry.value;
        button.setAttribute('aria-label', `Usar ${result} (${entry.expression} ${result})`);
        const expression = document.createElement('span');
        expression.className = 'history__expression';
        expression.textContent = entry.expression;
        const value = document.createElement('span');
        value.className = 'history__result';
        value.textContent = result;
        button.append(expression, ' ', value);
        const item = document.createElement('li');
        item.append(button);
        return item;
      })
    );
    historyEmpty.hidden = history.length > 0;
    historyClear.hidden = history.length === 0;
  }

  function setHistoryOpen(open) {
    historyPanel.hidden = !open;
    historyToggle.setAttribute('aria-expanded', String(open));
    historyToggle.textContent = open ? 'Fechar histórico' : 'Histórico';
    // The panel covers the display and keypad: keep focus out of them.
    keypad.inert = open;
    document.querySelector('.display').inert = open;
  }

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
    const before = state;
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
    } else if (action === 'backspace') {
      state = Calculator.backspace(state);
    } else if (action === 'percent') {
      state = Calculator.percent(state);
    } else {
      return;
    }
    const entry = History.entryFromTransition(before, state);
    if (entry) {
      history = History.addEntry(history, entry);
      saveHistory();
      renderHistory();
    }
    render();
  });

  historyToggle.addEventListener('click', () => {
    setHistoryOpen(historyPanel.hidden);
  });

  historyList.addEventListener('click', (event) => {
    const entry = event.target.closest('.history__entry');
    if (!entry) {
      return;
    }
    state = Calculator.recallValue(state, entry.dataset.value);
    setHistoryOpen(false);
    historyToggle.focus();
    render();
  });

  historyClear.addEventListener('click', () => {
    history = History.clearHistory();
    saveHistory();
    renderHistory();
    historyToggle.focus();
  });

  window.addEventListener('resize', render);
  renderHistory();
  render();
})();
