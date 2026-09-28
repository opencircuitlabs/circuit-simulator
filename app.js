import { analyzeCircuit, formatEngineering } from './solver.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const meta = {
  resistor: { name: 'Resistor', short: 'R', value: 1000, unit: 'Ω', color: '#e9b54a' },
  voltage: { name: 'Battery', short: 'V', value: 9, unit: 'V', color: '#5476e8' },
  led: { name: 'LED', short: 'D', value: 2, unit: 'Vf', color: '#ff5b45' },
  lamp: { name: 'Lamp', short: 'L', value: 100, unit: 'Ω', color: '#f09d35' },
  switch: { name: 'Switch', short: 'S', value: 0.05, unit: '', color: '#23a78f' }
};
const unitOptions = {
  resistor: [['Ω',1], ['kΩ',1000], ['MΩ',1e6]], lamp: [['Ω',1], ['kΩ',1000]],
  voltage: [['V',1], ['mV',.001]], led: [['V',1]], switch: [['Ω',1]]
};
const examples = {
  ohm: { name:"Ohm's law", components:[
    {id:'V1',type:'voltage',x:250,y:330,value:9,label:'9 V battery'}, {id:'R1',type:'resistor',x:575,y:210,value:1000,label:'1 kΩ resistor'}
  ], wires:[{from:{id:'V1',terminal:0},to:{id:'R1',terminal:0}},{from:{id:'R1',terminal:1},to:{id:'V1',terminal:1}}]},
  led: { name:'LED starter', components:[
    {id:'V1',type:'voltage',x:185,y:330,value:5,label:'5 V supply'}, {id:'R1',type:'resistor',x:470,y:210,value:330,label:'330 Ω'}, {id:'D1',type:'led',x:730,y:350,value:2,label:'Red LED'}
  ], wires:[{from:{id:'V1',terminal:0},to:{id:'R1',terminal:0}},{from:{id:'R1',terminal:1},to:{id:'D1',terminal:0}},{from:{id:'D1',terminal:1},to:{id:'V1',terminal:1}}]},
  divider: { name:'Voltage divider', components:[
    {id:'V1',type:'voltage',x:170,y:340,value:12,label:'12 V supply'}, {id:'R1',type:'resistor',x:450,y:190,value:1000,label:'R1 · 1 kΩ'}, {id:'R2',type:'resistor',x:720,y:360,value:2000,label:'R2 · 2 kΩ'}
  ], wires:[{from:{id:'V1',terminal:0},to:{id:'R1',terminal:0}},{from:{id:'R1',terminal:1},to:{id:'R2',terminal:0}},{from:{id:'R2',terminal:1},to:{id:'V1',terminal:1}}]}
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const canvas = $('#circuitCanvas'), componentLayer = $('#componentLayer'), wireLayer = $('#wireLayer');
let state = { name:'Untitled circuit', components:[], wires:[], selected:null, selectedWire:null, connecting:null, placing:'resistor', results:null };
let history = [], future = [], zoom = 1, toastTimer;

function uid(type) { const prefix = meta[type].short; let i = 1; while (state.components.some(c => c.id === prefix+i)) i++; return prefix+i; }
function snapshot() { return JSON.stringify({name:state.name,components:state.components,wires:state.wires}); }
function pushHistory() { history.push(snapshot()); if(history.length>60) history.shift(); future=[]; updateHistoryButtons(); }
function restore(raw) { const x=JSON.parse(raw); state={...state,...x,selected:null,selectedWire:null,connecting:null,results:null}; $('#projectName').value=state.name; render(); }
function undo() { if(!history.length)return; future.push(snapshot()); restore(history.pop()); updateHistoryButtons(); }
function redo() { if(!future.length)return; history.push(snapshot()); restore(future.pop()); updateHistoryButtons(); }
function updateHistoryButtons(){ $('#undoBtn').disabled=!history.length; $('#redoBtn').disabled=!future.length; }
function showToast(text){ const t=$('#toast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1800); }

function svgEl(tag, attrs={}) { const el=document.createElementNS(SVG_NS,tag); Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v)); return el; }
function terminals(c){ return [{x:c.x-75,y:c.y},{x:c.x+75,y:c.y}]; }
function wirePath(a,b){ const dx=Math.max(45,Math.abs(b.x-a.x)*.42); return `M ${a.x} ${a.y} C ${a.x+dx} ${a.y}, ${b.x-dx} ${b.y}, ${b.x} ${b.y}`; }
function componentMarkup(c){
  const common=`<rect class="body" x="-58" y="-38" width="116" height="76" rx="12"/><line class="part-line" x1="-75" y1="0" x2="-42" y2="0"/><line class="part-line" x1="42" y1="0" x2="75" y2="0"/>`;
  let shape='';
  if(c.type==='resistor') shape='<path class="part-line" d="M-42 0l9-13 12 26 12-26 12 26 12-26 12 26 9-13"/>';
  if(c.type==='voltage') shape='<line class="part-line" x1="-11" y1="-20" x2="-11" y2="20"/><line class="part-line" x1="9" y1="-11" x2="9" y2="11"/><text x="-29" y="-13" font-size="15" font-weight="800">+</text><text x="20" y="-12" font-size="15" font-weight="800">−</text>';
  if(c.type==='led') shape='<circle class="led-glow" cx="0" cy="0" r="32"/><path class="part-line" d="M-25-20L18 0-25 20zM20-22v44"/><path class="part-line" d="M8-24l14-12m-2 17 14-12" stroke-width="2"/>';
  if(c.type==='lamp') shape='<circle class="part-line" cx="0" cy="0" r="25"/><path class="part-line" d="M-17-17l34 34m0-34-34 34"/>';
  if(c.type==='switch') shape=`<circle class="part-line" cx="-27" cy="0" r="4"/><circle class="part-line" cx="27" cy="0" r="4"/><path class="part-line" d="M-23 0L${c.on?'23 0':'18 -21'}"/>`;
  return `${common}${shape}<circle class="terminal" data-terminal="0" cx="-75" cy="0" r="7"/><circle class="terminal" data-terminal="1" cx="75" cy="0" r="7"/><text class="component-label" x="0" y="55" text-anchor="middle">${escapeText(c.label||c.id)}</text><text class="component-value" x="0" y="70" text-anchor="middle">${displayValue(c)}</text>`;
}
function escapeText(text){ return String(text).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function displayValue(c){ if(c.type==='switch')return c.on?'Closed':'Open'; if(c.type==='led')return `${c.value} V forward`; return formatEngineering(c.value,meta[c.type].unit); }

function render(){
  componentLayer.innerHTML='';wireLayer.innerHTML='';$('#emptyState').style.display=state.components.length?'none':'';
  state.wires.forEach((w,i)=>{ const ca=state.components.find(c=>c.id===w.from.id), cb=state.components.find(c=>c.id===w.to.id); if(!ca||!cb)return; const a=terminals(ca)[w.from.terminal],b=terminals(cb)[w.to.terminal]; const p=svgEl('path',{d:wirePath(a,b),class:`wire ${state.selectedWire===i?'selected':''} ${state.results?.ok?'live':''}`,'data-wire':i}); wireLayer.appendChild(p); });
  state.components.forEach(c=>{ const g=svgEl('g',{class:`component ${state.selected===c.id?'selected':''} ${Math.abs(state.results?.components?.[c.id]?.current||0)>.001?'powered':''}`,transform:`translate(${c.x} ${c.y})`,'data-id':c.id}); g.innerHTML=componentMarkup(c); componentLayer.appendChild(g); });
  bindCanvasItems(); updateInspector(); updateResults(); $('#savedState').textContent='Unsaved changes';
}
function bindCanvasItems(){
  $$('.component').forEach(g=>{ g.addEventListener('click',e=>{e.stopPropagation(); const terminal=e.target.dataset.terminal; if(terminal!==undefined){handleTerminal(g.dataset.id,Number(terminal));return;} state.selected=g.dataset.id;state.selectedWire=null;render();});
    let start=null; g.addEventListener('pointerdown',e=>{if(e.target.dataset.terminal!==undefined)return;start={x:e.clientX,y:e.clientY,c:state.components.find(c=>c.id===g.dataset.id),ox:0,oy:0};start.ox=start.c.x;start.oy=start.c.y;g.setPointerCapture(e.pointerId)});g.addEventListener('pointermove',e=>{if(!start)return;const box=canvas.getBoundingClientRect();start.c.x=Math.max(85,Math.min(915,start.ox+(e.clientX-start.x)*1000/box.width));start.c.y=Math.max(70,Math.min(610,start.oy+(e.clientY-start.y)*680/box.height));render()});g.addEventListener('pointerup',()=>{if(start){pushHistory();start=null;}})
  });
  $$('.wire').forEach(p=>p.addEventListener('click',e=>{e.stopPropagation();state.selectedWire=Number(p.dataset.wire);state.selected=null;render();}));
}
function handleTerminal(id,terminal){ if(!state.connecting){state.connecting={id,terminal};showToast('Now choose another terminal');render();return;} if(state.connecting.id===id&&state.connecting.terminal===terminal){state.connecting=null;render();return;} const duplicate=state.wires.some(w=>(w.from.id===state.connecting.id&&w.from.terminal===state.connecting.terminal&&w.to.id===id&&w.to.terminal===terminal)||(w.to.id===state.connecting.id&&w.to.terminal===state.connecting.terminal&&w.from.id===id&&w.from.terminal===terminal));if(!duplicate){pushHistory();state.wires.push({from:state.connecting,to:{id,terminal}});}state.connecting=null;simulate(false);render(); }
function addComponent(type,x,y){ pushHistory(); const c={id:uid(type),type,x,y,value:meta[type].value,label:meta[type].name,on:false};state.components.push(c);state.selected=c.id;render();showToast(`${meta[type].name} added`); }
function removeSelected(){ if(state.selected){pushHistory();state.components=state.components.filter(c=>c.id!==state.selected);state.wires=state.wires.filter(w=>w.from.id!==state.selected&&w.to.id!==state.selected);state.selected=null;}else if(state.selectedWire!==null){pushHistory();state.wires.splice(state.selectedWire,1);state.selectedWire=null;}simulate(false);render(); }
function simulate(notify=true){state.results=analyzeCircuit(state.components,state.wires);$('#analysisStatus').textContent=state.results.message;$('#runBtn').classList.toggle('running',state.results.ok);$('#runBtn').innerHTML=state.results.ok?'<span>■</span> Simulation live':'<span>▶</span> Run simulation';document.querySelector('.pulse').classList.toggle('live',state.results.ok);if(notify)showToast(state.results.message);updateResults();}
function updateInspector(){ const c=state.components.find(x=>x.id===state.selected);$('#noSelection').classList.toggle('hidden',!!c);$('#propertiesForm').classList.toggle('hidden',!c);if(!c)return; const m=meta[c.type];$('#selectedIcon').textContent=m.short;$('#selectedTitle').textContent=m.name;$('#propLabel').value=c.label||c.id;$('#valueField').classList.toggle('hidden',c.type==='switch');$('#switchControl').classList.toggle('hidden',c.type!=='switch');$('#switchState').textContent=c.on?'Closed':'Open';$('#propValue').value=c.value;$('#valueLabel').textContent=c.type==='voltage'?'Voltage':c.type==='led'?'Forward voltage':'Resistance';$('#propUnit').innerHTML=unitOptions[c.type].map(([u,f])=>`<option value="${f}">${u}</option>`).join('');const r=state.results?.components?.[c.id];$('#selectedCurrent').textContent=r?formatEngineering(r.current,'A'):'—';$('#selectedVoltage').textContent=r?`Voltage drop ${formatEngineering(r.voltage,'V')}`:'Voltage drop —'; }
function updateResults(){ const results=state.results?.components||{};$('#totalPower').textContent=formatEngineering(state.results?.totalPower||0,'W');$('#resultList').innerHTML=state.components.map(c=>{const r=results[c.id];return `<div class="result-item"><span>${meta[c.type].short}</span><div><b>${escapeText(c.label||c.id)}</b><small>${r?formatEngineering(r.voltage,'V'):'Not analyzed'}</small></div><em>${r?formatEngineering(r.current,'A'):'—'}</em></div>`}).join('')||'<div class="no-selection" style="margin-top:45px"><p>Run a circuit to see measurements here.</p></div>'; }
function loadExample(key){pushHistory();const x=structuredClone(examples[key]);state={...state,name:x.name,components:x.components,wires:x.wires,selected:null,selectedWire:null,connecting:null};$('#projectName').value=x.name;simulate(false);render();showToast(`${x.name} loaded`);}
function saveLocal(){state.name=$('#projectName').value.trim()||'Untitled circuit';localStorage.setItem('opencircuit-project',snapshot());$('#savedState').textContent='Saved locally';showToast('Project saved in this browser');}
function exportProject(){const blob=new Blob([snapshot()],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${state.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')||'circuit'}.json`;a.click();URL.revokeObjectURL(a.href);showToast('Circuit exported');}
function importProject(file){const reader=new FileReader();reader.onload=()=>{try{pushHistory();restore(reader.result);simulate(false);showToast('Circuit imported')}catch{showToast('That file is not a valid circuit')}};reader.readAsText(file);}

$('#componentGrid').addEventListener('click',e=>{const b=e.target.closest('[data-type]');if(!b)return;state.placing=b.dataset.type;$$('.component-tile').forEach(x=>x.classList.toggle('active',x===b));$('#toolLabel').textContent=`Place ${meta[state.placing].name.toLowerCase()}`;});
canvas.addEventListener('click',e=>{if(e.target.closest('.component,.wire'))return;const box=canvas.getBoundingClientRect();const x=(e.clientX-box.left)*1000/box.width,y=(e.clientY-box.top)*680/box.height;addComponent(state.placing,x,y)});
$$('[data-example]').forEach(b=>b.addEventListener('click',()=>loadExample(b.dataset.example)));
$('#newBtn').addEventListener('click',()=>{pushHistory();state={...state,name:'Untitled circuit',components:[],wires:[],selected:null,selectedWire:null,results:null};$('#projectName').value=state.name;render()});
$('#runBtn').addEventListener('click',()=>simulate());$('#deleteBtn').addEventListener('click',removeSelected);$('#undoBtn').addEventListener('click',undo);$('#redoBtn').addEventListener('click',redo);$('#saveBtn').addEventListener('click',saveLocal);$('#exportBtn').addEventListener('click',exportProject);$('#importBtn').addEventListener('click',()=>$('#fileInput').click());$('#fileInput').addEventListener('change',e=>e.target.files[0]&&importProject(e.target.files[0]));
$('#projectName').addEventListener('change',e=>{state.name=e.target.value;render()});
$('#propLabel').addEventListener('change',e=>{const c=state.components.find(x=>x.id===state.selected);if(c){pushHistory();c.label=e.target.value;render()}});
$('#propValue').addEventListener('change',e=>{const c=state.components.find(x=>x.id===state.selected);if(c){pushHistory();c.value=Math.max(.001,Number(e.target.value))*Number($('#propUnit').value);simulate(false);render()}});
$('#switchControl').addEventListener('click',()=>{const c=state.components.find(x=>x.id===state.selected);if(c){pushHistory();c.on=!c.on;simulate(false);render()}});
$('#propUnit').addEventListener('change',()=>$('#propValue').dispatchEvent(new Event('change')));
$$('.tabs button').forEach(b=>b.addEventListener('click',()=>{$$('.tabs button').forEach(x=>x.classList.toggle('active',x===b));$('#inspectTab').classList.toggle('hidden',b.dataset.tab!=='inspect');$('#resultsTab').classList.toggle('hidden',b.dataset.tab!=='results')}));
function setZoom(z){zoom=Math.max(.7,Math.min(1.35,z));canvas.style.transform=`scale(${zoom})`;$('#zoomLabel').textContent=`${Math.round(zoom*100)}%`;}
$('#zoomIn').addEventListener('click',()=>setZoom(zoom+.1));$('#zoomOut').addEventListener('click',()=>setZoom(zoom-.1));$('#fitBtn').addEventListener('click',()=>setZoom(1));
document.addEventListener('keydown',e=>{if(['INPUT','SELECT'].includes(e.target.tagName))return;if(e.key==='Delete'||e.key==='Backspace')removeSelected();if(e.key==='Escape'){state.connecting=null;state.selected=null;state.selectedWire=null;render()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}});

const saved=localStorage.getItem('opencircuit-project');if(saved){try{restore(saved);$('#savedState').textContent='Saved locally'}catch{loadExample('ohm')}}else loadExample('led');updateHistoryButtons();
