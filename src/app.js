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
  const copyButton = document.getElementById('copy-button');
  const copyToast = document.getElementById('copy-toast');
  const COPY_TOAST_MS = 2000;
  let copyToastTimer;

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
    document.querySelector('.display-area').inert = open;
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
    copyButton.disabled = display.isError;
    operatorKeys.forEach((key) => {
      const active = key.dataset.operator === display.activeOperator;
      key.classList.toggle('key--active', active);
      key.setAttribute('aria-pressed', String(active));
    });
  }

  const PRESSED_FEEDBACK_MS = 150;
  const pressedTimers = new Map();

  // Applies an on-screen key, whether it was clicked or typed.
  function pressKey(key) {
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
  }

  keypad.addEventListener('click', (event) => {
    const key = event.target.closest('.key');
    if (key) {
      pressKey(key);
    }
  });

  // Finds the on-screen key for a keyboard event, or null.
  function findKey(target) {
    if (target.digit !== undefined) {
      return keypad.querySelector(`[data-digit="${target.digit}"]`);
    }
    if (target.operator !== undefined) {
      return keypad.querySelector(`[data-operator="${target.operator}"]`);
    }
    return keypad.querySelector(`[data-action="${target.action}"]`);
  }

  // Shows the typed key as pressed for a moment, like a click.
  function flashKey(key) {
    key.classList.add('key--pressed');
    clearTimeout(pressedTimers.get(key));
    pressedTimers.set(
      key,
      setTimeout(() => key.classList.remove('key--pressed'), PRESSED_FEEDBACK_MS)
    );
  }

  document.addEventListener('keydown', (event) => {
    // With the history open the keypad is hidden: Escape closes the history
    // and every other key keeps its normal behavior inside the panel.
    if (!historyPanel.hidden) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setHistoryOpen(false);
        historyToggle.focus();
      }
      return;
    }
    // Enter keeps activating buttons outside the keypad (Histórico, Copiar);
    // only keypad buttons and the rest of the page turn it into "=".
    if (event.key === 'Enter' && event.target.closest('button') && !keypad.contains(event.target)) {
      return;
    }
    const target = Keyboard.keyFromEvent(event);
    const key = target && findKey(target);
    if (!key) {
      return;
    }
    // Stops Enter from also clicking the focused button, Backspace from
    // navigating back and "/" from opening the browser's quick find.
    event.preventDefault();
    flashKey(key);
    pressKey(key);
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
    if (event.detail === 0) {
      historyToggle.focus();
    }
    render();
  });

  historyClear.addEventListener('click', () => {
    history = History.clearHistory();
    saveHistory();
    renderHistory();
    historyToggle.focus();
  });

  // Copies with the Clipboard API, falling back to the older execCommand for
  // browsers or pages where the API is not available. Resolves to success.
  async function writeToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.append(field);
      field.select();
      let copied = false;
      try {
        copied = document.execCommand('copy');
      } catch {
        copied = false;
      }
      field.remove();
      return copied;
    }
  }

  function showCopyToast(message) {
    copyToast.textContent = message;
    copyToast.classList.add('copy-toast--visible');
    clearTimeout(copyToastTimer);
    copyToastTimer = setTimeout(() => {
      copyToast.classList.remove('copy-toast--visible');
      copyToast.textContent = '';
    }, COPY_TOAST_MS);
  }

  async function copyResult() {
    const text = Calculator.getCopyText(state);
    if (text === null) {
      return;
    }
    const copied = await writeToClipboard(text);
    showCopyToast(copied ? 'Copiado!' : 'Não foi possível copiar');
  }

  copyButton.addEventListener('click', copyResult);
  currentEl.addEventListener('click', copyResult);

  // A mouse click or tap (detail > 0) on a button outside the keypad must not
  // leave focus there, or the next Enter would press it again instead of "=".
  // Keyboard users (detail === 0) keep the focus where they put it.
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (button && event.detail > 0 && !keypad.contains(button) && !historyPanel.contains(button)) {
      button.blur();
    }
  });

  window.addEventListener('resize', render);
  renderHistory();
  render();
})();
