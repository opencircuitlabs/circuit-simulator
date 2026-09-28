import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCircuit, formatEngineering, solveLinear } from '../solver.js';

test('solves a two by two linear system', () => {
  assert.deepEqual(solveLinear([[2,1],[1,-1]],[7,2]).map(x=>Math.round(x)), [3,1]);
});

test('solves a simple 9 V, 1 kΩ loop', () => {
  const components=[{id:'V1',type:'voltage',value:9},{id:'R1',type:'resistor',value:1000}];
  const wires=[{from:{id:'V1',terminal:0},to:{id:'R1',terminal:0}},{from:{id:'R1',terminal:1},to:{id:'V1',terminal:1}}];
  const result=analyzeCircuit(components,wires);
  assert.equal(result.ok,true);
  assert.ok(Math.abs(Math.abs(result.components.R1.current)-0.009)<1e-9);
  assert.ok(Math.abs(result.components.R1.power-0.081)<1e-9);
});

test('reports an open circuit', () => {
  const result=analyzeCircuit([{id:'V1',type:'voltage',value:5},{id:'R1',type:'resistor',value:100}],[]);
  assert.equal(result.ok,false);
  assert.match(result.message,/open/i);
});

test('formats engineering units', () => {
  assert.equal(formatEngineering(0.009,'A'),'9.00 mA');
  assert.equal(formatEngineering(1200,'Ω'),'1.20 kΩ');
});
