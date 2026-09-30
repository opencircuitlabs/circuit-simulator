# OpenCircuit

An interactive, dependency-free DC circuit simulator for learning electronics in the browser.

## What it can do

- Place and move batteries, resistors, LEDs, lamps, and switches
- Connect terminals with curved wires
- Run idealized DC analysis with live voltage, current, and power measurements
- Edit component labels and values
- Start from three ready-made circuit examples
- Undo, redo, save locally, and import/export circuit JSON
- Create portable share links without uploading circuit data
- Snap components to a consistent grid
- Work entirely offline after the first load
- Install as a progressive web app and use a responsive mobile layout

## Run locally

The app has no runtime dependencies. Serve the repository with any static server:

```sh
npx serve .
```

Then open the printed local address. Opening `index.html` directly also works in most modern browsers, but a local server is recommended because the app uses JavaScript modules.

## Test

```bash
npm test
```

Run `npm run check` to syntax-check every JavaScript module. GitHub Actions runs both commands on Node.js 18, 20 and 22.

## Sharing and privacy

The Share button encodes the circuit into the URL fragment and copies the link. Circuit data is not sent to an OpenCircuitLabs server. Imported and shared projects are validated and size-limited before they are loaded.

## Simulator scope

Version 1 focuses on approachable, idealized DC circuits. Resistors and lamps are modeled as resistive loads, switches as near-open/near-short resistances, and LEDs with a simplified educational model. It is not intended for safety-critical or production electrical engineering.

## Roadmap

- Junction nodes
- Capacitors and transient analysis
- Multimeter probes and oscilloscope view
- Shareable circuit URLs
- Mobile layout and keyboard-first accessibility

## Contributing

Issues and pull requests are welcome. Keep the interface friendly for beginners and include tests for solver changes.

## License

MIT © OpenCircuitLabs
