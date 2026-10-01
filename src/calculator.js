// Calculator logic. Must not touch the DOM so it can be tested in Node.
// Every action takes a state and returns a new state; nothing is mutated.
(function (root) {
  'use strict';

  const OPERATOR_SYMBOLS = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  const MAX_DIGITS = 15;
  // Results with more integer digits than this do not fit the display even
  // with the smallest font, so they are shown as ERROR_OUT_OF_RANGE.
  const MAX_RESULT_DIGITS = 30;
  // Rounding to 15 significant digits hides binary floating point noise
  // such as 0.1 + 0.2 = 0.30000000000000004 while keeping every digit of
  // numbers up to MAX_DIGITS long.
  const PRECISION = 15;

  // Messages shown on the display instead of Infinity or NaN (UI text in pt-BR).
  const ERROR_DIVIDE_BY_ZERO = 'Não é possível dividir por zero';
  const ERROR_OUT_OF_RANGE = 'Número grande demais';

  function createState() {
    return {
      input: '0', // number being typed or shown, with "." as decimal separator
      previous: null, // left operand, as a number
      operator: null, // '+', '-', '*' or '/'
      waitingForOperand: false, // operator pressed, second number not typed yet
      evaluated: false, // "=" was just pressed
      lastExpression: '', // expression shown after "=", e.g. "1 + 2 ="
      error: null, // message shown instead of a number, e.g. after dividing by zero
      computedInput: false, // input came from "%", so the next digit replaces it
    };
  }

  function roundResult(value) {
    return parseFloat(value.toPrecision(PRECISION));
  }

  // Returns the result, or an error message when it cannot be shown as a number.
  function compute(left, operator, right) {
    if (operator === '/' && right === 0) {
      return { error: ERROR_DIVIDE_BY_ZERO };
    }
    return checkRange(calculate(left, operator, right));
  }

  function checkRange(value) {
    if (!Number.isFinite(value) || Math.abs(value) >= 10 ** MAX_RESULT_DIGITS) {
      return { error: ERROR_OUT_OF_RANGE };
    }
    return { value };
  }

  function calculate(left, operator, right) {
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

  // Formats a number (or a typed number string such as "1250." while typing)
  // the Brazilian way: "." groups thousands, "," is the decimal separator and
  // negatives use the minus sign (−1.250,5). The grouping is only visual.
  function formatNumber(value) {
    const text = typeof value === 'number' ? toPlainString(value) : value;
    const negative = text.startsWith('-');
    const [integerPart, decimalPart] = (negative ? text.slice(1) : text).split('.');
    const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const decimals = decimalPart === undefined ? '' : `,${decimalPart}`;
    return `${negative ? '−' : ''}${grouped}${decimals}`;
  }

  function countDigits(input) {
    return input.replace(/[^0-9]/g, '').length;
  }

  // Starts a fresh number when the previous one is finished (after an
  // operator or after "="); otherwise keeps the current one.
  function startNumber(state) {
    if (state.evaluated || state.error !== null) {
      return { ...createState(), input: '0' };
    }
    if (state.waitingForOperand || state.computedInput) {
      return { ...state, input: '0', waitingForOperand: false, computedInput: false };
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
    // After an error there is no number to operate on: wait for a new one.
    if (state.error !== null) {
      return state;
    }
    // Pressing another operator before the second number replaces it.
    if (state.waitingForOperand) {
      return { ...state, operator };
    }
    const current = parseFloat(state.input);
    let previous = current;
    // Chained operation (1 + 2 +): compute the partial result first.
    if (state.operator !== null && !state.evaluated) {
      const outcome = compute(state.previous, state.operator, current);
      if (outcome.error) {
        return errorState(outcome.error, describe(state.previous, state.operator, current));
      }
      previous = outcome.value;
    }
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
    const expression = `${describe(state.previous, state.operator, right)} =`;
    const outcome = compute(state.previous, state.operator, right);
    if (outcome.error) {
      return errorState(outcome.error, expression);
    }
    return {
      ...createState(),
      input: toPlainString(outcome.value),
      evaluated: true,
      lastExpression: expression,
    };
  }

  // "⌫": removes the last character of the number being typed. Results, the
  // number shown while an operator waits, and numbers produced by "%" are not
  // being typed, so they are left alone.
  function backspace(state) {
    if (state.evaluated || state.error !== null || state.waitingForOperand || state.computedInput) {
      return state;
    }
    const input = state.input.slice(0, -1);
    return { ...state, input: input === '' || input === '-' ? '0' : input };
  }

  // "%": alone, divides the number by 100 (50 % = 0,5). In "+" and "−" it is a
  // percentage of the first number (200 + 10 % = 200 + 20); in "×" and "÷" it
  // becomes a fraction (200 × 10 % = 200 × 0,1).
  function percent(state) {
    if (state.error !== null || state.waitingForOperand) {
      return state;
    }
    const value = parseFloat(state.input);
    const usesBase = !state.evaluated && (state.operator === '+' || state.operator === '-');
    const outcome = checkRange(roundResult(usesBase ? (state.previous * value) / 100 : value / 100));
    if (outcome.error) {
      return errorState(outcome.error, '');
    }
    const input = toPlainString(outcome.value);
    // After "=" the result becomes a new standalone number.
    const base = state.evaluated ? createState() : state;
    return { ...base, input, computedInput: true };
  }

  // Expression text such as "1 + 2".
  function describe(left, operator, right) {
    return `${formatNumber(left)} ${OPERATOR_SYMBOLS[operator]} ${formatNumber(right)}`;
  }

  // Shows a message instead of a number; the next digit starts a new calculation.
  function errorState(error, expression) {
    return { ...createState(), error, lastExpression: expression };
  }

  // "C": back to the initial state, display 0 and no expression.
  function clear() {
    return createState();
  }

  // Text for the two display lines: the expression in progress and the current
  // number (or an error message, flagged by isError), plus the operator key to
  // highlight while it waits for the second number.
  function getDisplay(state) {
    if (state.error !== null) {
      return { expression: state.lastExpression, current: state.error, isError: true, activeOperator: null };
    }
    let expression = '';
    if (state.evaluated) {
      expression = state.lastExpression;
    } else if (state.operator !== null) {
      expression = `${formatNumber(state.previous)} ${OPERATOR_SYMBOLS[state.operator]}`;
      if (!state.waitingForOperand) {
        expression += ` ${formatNumber(state.input)}`;
      }
    }
    return {
      expression,
      current: formatNumber(state.input),
      isError: false,
      activeOperator: state.waitingForOperand ? state.operator : null,
    };
  }

  const Calculator = {
    createState,
    inputDigit,
    inputDecimal,
    chooseOperator,
    evaluate,
    clear,
    backspace,
    percent,
    getDisplay,
    formatNumber,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calculator;
  } else {
    root.Calculator = Calculator;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
