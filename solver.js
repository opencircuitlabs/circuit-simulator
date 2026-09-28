const EPS = 1e-10;

export function solveLinear(matrix, rhs) {
  const n = rhs.length;
  const a = matrix.map((row, i) => [...row, rhs[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < EPS) continue;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const p = a[col][col];
    for (let j = col; j <= n; j++) a[col][j] /= p;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let j = col; j <= n; j++) a[row][j] -= factor * a[col][j];
    }
  }
  return a.map((row, i) => Math.abs(row[i]) < EPS ? 0 : row[n]);
}

class UnionFind {
  constructor(items) { this.parent = new Map(items.map(x => [x, x])); }
  find(x) { const p = this.parent.get(x); if (p !== x) this.parent.set(x, this.find(p)); return this.parent.get(x); }
  union(a, b) { const ra = this.find(a), rb = this.find(b); if (ra !== rb) this.parent.set(ra, rb); }
}

const pin = (id, terminal) => `${id}:${terminal}`;

export function analyzeCircuit(components, wires) {
  if (!components.length) return { ok: false, message: 'Add components to begin', components: {} };
  const terminals = components.flatMap(c => [pin(c.id, 0), pin(c.id, 1)]);
  const uf = new UnionFind(terminals);
  wires.forEach(w => uf.union(pin(w.from.id, w.from.terminal), pin(w.to.id, w.to.terminal)));
  const sources = components.filter(c => c.type === 'voltage');
  if (!sources.length) return { ok: false, message: 'Add a battery to power the circuit', components: {} };

  const roots = [...new Set(terminals.map(t => uf.find(t)))];
  const ground = uf.find(pin(sources[0].id, 1));
  const nodes = roots.filter(r => r !== ground);
  const nodeIndex = new Map(nodes.map((n, i) => [n, i]));
  const size = nodes.length + sources.length;
  const A = Array.from({ length: size }, () => Array(size).fill(0));
  const z = Array(size).fill(0);
  const nodeOf = (id, terminal) => uf.find(pin(id, terminal));
  const ni = n => n === ground ? -1 : nodeIndex.get(n);
  const stampG = (n1, n2, g) => {
    const i = ni(n1), j = ni(n2);
    if (i >= 0) A[i][i] += g;
    if (j >= 0) A[j][j] += g;
    if (i >= 0 && j >= 0) { A[i][j] -= g; A[j][i] -= g; }
  };

  const resistance = c => {
    if (c.type === 'switch') return c.on ? 0.05 : 1e12;
    if (c.type === 'led') return 180;
    return Math.max(Number(c.value) || 1, .001);
  };
  components.filter(c => c.type !== 'voltage').forEach(c => stampG(nodeOf(c.id, 0), nodeOf(c.id, 1), 1 / resistance(c)));
  sources.forEach((c, k) => {
    const row = nodes.length + k, i = ni(nodeOf(c.id, 0)), j = ni(nodeOf(c.id, 1));
    if (i >= 0) { A[i][row] += 1; A[row][i] += 1; }
    if (j >= 0) { A[j][row] -= 1; A[row][j] -= 1; }
    z[row] = Number(c.value) || 0;
  });

  const values = solveLinear(A, z);
  if (values.some(v => !Number.isFinite(v))) return { ok: false, message: 'Circuit could not be solved', components: {} };
  const voltageAt = n => n === ground ? 0 : (values[ni(n)] || 0);
  const result = {};
  components.forEach(c => {
    const v = voltageAt(nodeOf(c.id, 0)) - voltageAt(nodeOf(c.id, 1));
    const current = c.type === 'voltage' ? (values[nodes.length + sources.indexOf(c)] || 0) : v / resistance(c);
    result[c.id] = { voltage: v, current, power: Math.abs(v * current) };
  });
  const connected = wires.length >= components.length;
  const hasCurrent = Object.values(result).some(r => Math.abs(r.current) > 1e-7);
  return {
    ok: connected && hasCurrent,
    message: connected && hasCurrent ? 'Simulation running — values are live' : 'Circuit is open — complete the loop',
    components: result,
    totalPower: components.filter(c => c.type !== 'voltage').reduce((sum, c) => sum + (result[c.id]?.power || 0), 0)
  };
}

export function formatEngineering(value, unit = '') {
  const abs = Math.abs(value);
  const scales = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n']];
  const [scale, prefix] = scales.find(([s]) => abs >= s) || scales.at(-1);
  const number = value / scale;
  return `${Math.abs(number) >= 100 ? number.toFixed(0) : Math.abs(number) >= 10 ? number.toFixed(1) : number.toFixed(2)} ${prefix}${unit}`;
}
