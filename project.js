const MAX_COMPONENTS = 200;
const MAX_WIRES = 500;
const COMPONENT_TYPES = new Set(['resistor', 'voltage', 'led', 'lamp', 'switch']);

export function normalizeProject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Project must be an object');
  if (!Array.isArray(input.components) || !Array.isArray(input.wires)) throw new Error('Project requires components and wires');
  if (input.components.length > MAX_COMPONENTS || input.wires.length > MAX_WIRES) throw new Error('Project is too large');

  const ids = new Set();
  const components = input.components.map((component, index) => {
    if (!component || typeof component !== 'object' || !COMPONENT_TYPES.has(component.type)) {
      throw new Error(`Component ${index + 1} has an unsupported type`);
    }
    if (typeof component.id !== 'string' || !component.id || ids.has(component.id)) throw new Error('Component IDs must be unique');
    if (![component.x, component.y, component.value].every(Number.isFinite)) throw new Error(`Component ${component.id} has invalid values`);
    ids.add(component.id);
    return {
      id: component.id,
      type: component.type,
      x: Math.max(85, Math.min(915, component.x)),
      y: Math.max(70, Math.min(610, component.y)),
      value: Math.max(0.001, component.value),
      label: String(component.label || component.id).slice(0, 40),
      on: Boolean(component.on),
    };
  });

  const endpoint = (value) => {
    if (!value || !ids.has(value.id) || ![0, 1].includes(value.terminal)) throw new Error('Wire has an invalid endpoint');
    return { id: value.id, terminal: value.terminal };
  };
  const wires = input.wires.map((wire) => ({ from: endpoint(wire?.from), to: endpoint(wire?.to) }));
  return { name: String(input.name || 'Shared circuit').slice(0, 80), components, wires };
}

export function encodeProject(project) {
  const bytes = new TextEncoder().encode(JSON.stringify(normalizeProject(project)));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function decodeProject(encoded) {
  if (typeof encoded !== 'string' || encoded.length > 100000) throw new Error('Invalid shared project');
  const padded = encoded.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - encoded.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return normalizeProject(JSON.parse(new TextDecoder().decode(bytes)));
}
