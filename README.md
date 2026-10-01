# calculadora-bots

Web calculator built with plain HTML, CSS and JavaScript (no frameworks, no runtime
dependencies). The UI text is in Brazilian Portuguese.

## Open the app

Open `index.html` in any modern browser (double-click it, or serve the folder with
any static server, e.g. `npx serve .`).

## Run the tests

Requires Node.js 18 or newer.

```sh
npm test
```

Tests use the built-in `node:test` runner and live in `test/`.

## Project structure

- `index.html` — page markup.
- `styles.css` — styles.
- `src/calculator.js` — calculator logic, no DOM access (testable in Node).
- `src/history.js` — history of finished calculations (last 10), no DOM access.
- `src/keyboard.js` — maps physical keyboard keys to calculator keys, no DOM access.
- `src/app.js` — UI wiring between the DOM and the logic; saves the history in `localStorage`.
- `test/` — automated tests for the logic.
- `bots/` — playbooks for the bot team that builds this project.
