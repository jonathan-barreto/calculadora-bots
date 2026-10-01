// Calculator logic. Must not touch the DOM so it can be tested in Node.
// Every action takes a state and returns a new state; nothing is mutated.
(function (root) {
  'use strict';

  const OPERATOR_SYMBOLS = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  const MAX_DIGITS = 15;
  // Rounding to 15 significant digits hides binary floating point noise
  // such as 0.1 + 0.2 = 0.30000000000000004 while keeping every digit of
  // numbers up to MAX_DIGITS long.
  const PRECISION = 15;

  function createState() {
    return {
      input: '0', // number being typed or shown, with "." as decimal separator
      previous: null, // left operand, as a number
      operator: null, // '+', '-', '*' or '/'
      waitingForOperand: false, // operator pressed, second number not typed yet
      evaluated: false, // "=" was just pressed
      lastExpression: '', // expression shown after "=", e.g. "1 + 2 ="
    };
  }

  function roundResult(value) {
    return parseFloat(value.toPrecision(PRECISION));
  }

  function compute(left, operator, right) {
    switch (operator) {
      case '+':
        return roundResult(left + right);
      case '-':
        return roundResult(left - right);
      case '*':
        return roundResult(left * right);
      case '/':
        return roundResult(left / right);
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  // Converts a number to a plain decimal string, never in exponent notation
  // (1e-7 becomes "0.0000001").
  function toPlainString(value) {
    return value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 });
  }

  // Formats a number (or a typed number string) using the Brazilian decimal comma.
  function formatNumber(value) {
    const text = typeof value === 'number' ? toPlainString(value) : value;
    return text.replace('.', ',');
  }

  function countDigits(input) {
    return input.replace(/[^0-9]/g, '').length;
  }

  // Starts a fresh number when the previous one is finished (after an
  // operator or after "="); otherwise keeps the current one.
  function startNumber(state) {
    if (state.evaluated) {
      return { ...createState(), input: '0' };
    }
    if (state.waitingForOperand) {
      return { ...state, input: '0', waitingForOperand: false };
    }
    return state;
  }

  function inputDigit(state, digit) {
    if (!/^[0-9]$/.test(digit)) {
      throw new Error(`Invalid digit: ${digit}`);
    }
    const next = startNumber(state);
    if (countDigits(next.input) >= MAX_DIGITS) {
      return next;
    }
    const input = next.input === '0' ? digit : next.input + digit;
    return { ...next, input };
  }

  function inputDecimal(state) {
    const next = startNumber(state);
    if (next.input.includes('.')) {
      return next;
    }
    return { ...next, input: `${next.input}.` };
  }

  function chooseOperator(state, operator) {
    if (!(operator in OPERATOR_SYMBOLS)) {
      throw new Error(`Invalid operator: ${operator}`);
    }
    // Pressing another operator before the second number replaces it.
    if (state.waitingForOperand) {
      return { ...state, operator };
    }
    const current = parseFloat(state.input);
    // Chained operation (1 + 2 +): compute the partial result first.
    const previous =
      state.operator !== null && !state.evaluated
        ? compute(state.previous, state.operator, current)
        : current;
    return {
      ...state,
      input: toPlainString(previous),
      previous,
      operator,
      waitingForOperand: true,
      evaluated: false,
      lastExpression: '',
    };
  }

  function evaluate(state) {
    // Nothing to compute: no operator, already evaluated, or no second number yet.
    if (state.operator === null || state.evaluated || state.waitingForOperand) {
      return state;
    }
    const right = parseFloat(state.input);
    const result = compute(state.previous, state.operator, right);
    return {
      ...createState(),
      input: toPlainString(result),
      evaluated: true,
      lastExpression: `${formatNumber(state.previous)} ${OPERATOR_SYMBOLS[state.operator]} ${formatNumber(
        right
      )} =`,
    };
  }

  // Text for the two display lines: the expression in progress and the current number.
  function getDisplay(state) {
    let expression = '';
    if (state.evaluated) {
      expression = state.lastExpression;
    } else if (state.operator !== null) {
      expression = `${formatNumber(state.previous)} ${OPERATOR_SYMBOLS[state.operator]}`;
      if (!state.waitingForOperand) {
        expression += ` ${formatNumber(state.input)}`;
      }
    }
    return { expression, current: formatNumber(state.input) };
  }

  const Calculator = {
    createState,
    inputDigit,
    inputDecimal,
    chooseOperator,
    evaluate,
    getDisplay,
    formatNumber,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calculator;
  } else {
    root.Calculator = Calculator;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
