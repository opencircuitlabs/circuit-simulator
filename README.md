# OpenCircuit

An interactive, dependency-free DC circuit simulator for learning electronics in the browser.

## What it can do

- Place and move batteries, resistors, LEDs, lamps, and switches
- Connect terminals with curved wires
- Run idealized DC analysis with live voltage, current, and power measurements
- Edit component labels and values
- Start from three ready-made circuit examples
- Undo, redo, save locally, and import/export circuit JSON
- Work entirely offline after the first load

## Run locally

The app has no runtime dependencies. Serve the repository with any static server:

```bash
npx serve .
```

Then open the printed local address. Opening `index.html` directly also works in most modern browsers, but a local server is recommended because the app uses JavaScript modules.

## Test

```bash
npm test
```

## Simulator scope

Version 1 focuses on approachable, idealized DC circuits. Resistors and lamps are modeled as resistive loads, switches as near-open/near-short resistances, and LEDs with a simplified educational model. It is not intended for safety-critical or production electrical engineering.

## Roadmap

- Snap-to-grid and junction nodes
- Capacitors and transient analysis
- Multimeter probes and oscilloscope view
- Shareable circuit URLs
- Mobile layout and keyboard-first accessibility

## Contributing

Issues and pull requests are welcome. Keep the interface friendly for beginners and include tests for solver changes.

## License

MIT © OpenCircuitLabs
