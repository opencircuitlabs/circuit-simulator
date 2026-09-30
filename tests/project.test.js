import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeProject, encodeProject, normalizeProject } from '../project.js';

const project = {
  name: 'LED Ω demo',
  components: [
    { id: 'V1', type: 'voltage', x: 100, y: 200, value: 5, label: 'Supply', on: false },
    { id: 'R1', type: 'resistor', x: 400, y: 200, value: 330, label: '330 Ω', on: false },
  ],
  wires: [{ from: { id: 'V1', terminal: 0 }, to: { id: 'R1', terminal: 0 } }],
};

test('share links round-trip Unicode projects', () => {
  assert.deepEqual(decodeProject(encodeProject(project)), project);
});

test('normalization rejects unknown components and broken wires', () => {
  assert.throws(() => normalizeProject({ ...project, components: [{ ...project.components[0], type: 'script' }] }), /unsupported/);
  assert.throws(() => normalizeProject({ ...project, wires: [{ from: { id: 'missing', terminal: 0 }, to: { id: 'R1', terminal: 0 } }] }), /endpoint/);
});

test('normalization clamps coordinates and labels', () => {
  const normalized = normalizeProject({ ...project, components: [{ ...project.components[0], x: -2, y: 9999, label: 'x'.repeat(100) }], wires: [] });
  assert.equal(normalized.components[0].x, 85);
  assert.equal(normalized.components[0].y, 610);
  assert.equal(normalized.components[0].label.length, 40);
});
