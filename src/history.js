// History of finished calculations. Must not touch the DOM so it can be
// tested in Node. Entries are plain objects and lists are never mutated.
(function (root) {
  'use strict';

  const MAX_ENTRIES = 10;

  // An entry is { expression: '287,4 ÷ 4 =', value: '71.85' }: the expression
  // exactly as the display showed it and the result as a plain number string.
  function isEntry(entry) {
    return (
      entry !== null &&
      typeof entry === 'object' &&
      typeof entry.expression === 'string' &&
      typeof entry.value === 'string' &&
      Number.isFinite(parseFloat(entry.value))
    );
  }

  // Returns the entry to record when "=" finished a calculation, or null when
  // nothing new was finished (no calculation, an error, or "=" pressed again).
  function entryFromTransition(before, after) {
    if (!after.evaluated || before.evaluated || after.error !== null) {
      return null;
    }
    return { expression: after.lastExpression, value: after.input };
  }

  // Newest first, keeping only the MAX_ENTRIES most recent.
  function addEntry(entries, entry) {
    return [entry, ...entries].slice(0, MAX_ENTRIES);
  }

  function clearHistory() {
    return [];
  }

  function serialize(entries) {
    return JSON.stringify(entries);
  }

  // Reads saved history, ignoring anything malformed.
  function parse(text) {
    try {
      const data = JSON.parse(text);
      return Array.isArray(data) ? data.filter(isEntry).slice(0, MAX_ENTRIES) : [];
    } catch {
      return [];
    }
  }

  const History = { MAX_ENTRIES, entryFromTransition, addEntry, clearHistory, serialize, parse };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = History;
  } else {
    root.History = History;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
