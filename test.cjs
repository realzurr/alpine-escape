const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const elements=new Map();function el(id){if(!elements.has(id))elements.set(id,{hidden:false,textContent:'',classList:{add(){},toggle(){}},focus(){},addEventListener(){},dataset:{}});return elements.get(id)}
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});el('game').getContext=()=>ctx;
const sandbox={console,Math,Set,innerWidth:1280,innerHeight:800,devicePixelRatio:1,matchMedia:()=>({matches:false}),localStorage:{getItem:()=>0,setItem(){}},document:{getElementById:el,querySelectorAll:()=>[],addEventListener(){},body:{classList:{add(){}}}},window:{},addEventListener(){},requestAnimationFrame(){}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(__dirname+'/game.js','utf8'),sandbox);
function run(s){return vm.runInContext(s,sandbox)}
run('start()');assert.equal(run('state'),'playing');run('objects=[];generated=1e9;update(1)');assert(run('world')>0);
run('pause()');const before=run('world');run('update(1)');assert.equal(run('world'),before);run('pause()');assert.equal(run('state'),'playing');
run("world=300;x=0;v=40;objects=[{x:0,y:300,type:'tree',size:1,hit:false}];update(.001)");assert(run('fallen')>0);
run("fallen=0;v=40;objects=[{x:0,y:world,type:'ramp',size:1,hit:false}];update(.001)");assert(run('jump')>0);
run("jump=0;world=500;x=0;v=0;mode='slalom';objects=[{x:0,y:499,type:'gate',size:1,hit:false}];update(.01)");assert.equal(run('gates'),1);

// Normal descent reaches the first encounter in about one minute; scenery keeps its pace.
run('start();objects=[];generated=1e9;let elapsed=0;while(distance<2000){update(1/60);elapsed+=1/60}');
const normalSeconds=run('elapsed');assert(normalSeconds>58&&normalSeconds<62);
assert(run('yeti.y+H*.36-world < -60'));assert.equal(run('firstYetiAppeared'),true);
const initialYetiY=run('yeti.y');run('update(.1)');assert(run('yeti.y')>initialYetiY);
// The first monster can catch the player, but a shout permanently sends it fleeing.
run('yeti={x:x,y:world};jump=0;update(.001)');assert.equal(run('state'),'over');
run('start();shout()');assert.equal(run('shoutRing'),0);
run('objects=[];generated=1e9;distance=2000;update(.001);shout()');assert.equal(run('yeti.fleeing'),true);
run('draw();for(let i=0;i<180;i++)update(1/60)');assert.equal(run('yeti'),null);assert.equal(run('state'),'playing');
run('update(.01)');assert.equal(run('yeti'),null);
function setupPack(){run('start();objects=[];generated=1e9;distance=2999;world=distance/METERS_PER_PIXEL;v=115;keys.add("f");update(.001)');assert.equal(run('finalPack.length'),0);run('distance=3000;update(.001)');assert.equal(run('finalPack.length'),3);assert(run('finalPack.every(m=>m.y+H*.36-world < -60)'));}
setupPack();run('draw();shout()');assert(run('packFear')>3);assert.equal(run('shoutCooldown'),7);
run('update(1/60)');const cooldown=run('shoutCooldown');run('shout()');assert.equal(run('shoutCooldown'),cooldown);
// A shout slows the pack and turbo increases the gap. No teleporting to the skier.
const gap=run('world-finalPack[0].y');const oldPosition=run('finalPack[0].y');run('update(1/60)');assert(run('world-finalPack[0].y')>gap);assert(run('finalPack[0].y')-oldPosition<2);
run('for(let i=0;i<300;i++)update(1/60)');assert.equal(run('state'),'playing');
// Compare otherwise identical chases: shouting buys additional distance.
setupPack();run('for(let i=0;i<3600&&state==="playing";i++)update(1/60)');const withoutShout=run('distance');assert.equal(run('state'),'over');
setupPack();run('shout();for(let i=0;i<3600&&state==="playing";i++){if(shoutCooldown===0)shout();update(1/60)}');const withShout=run('distance');assert.equal(run('state'),'over');assert(withShout>withoutShout);assert(withShout<=4000);
// Lateral turbo, repeated shouts and airborne movement cannot bypass the final limit.
setupPack();run('keys.add("ArrowRight");jump=100;jumpTotal=100;for(let i=0;i<3600&&state==="playing";i++){shout();update(1/60)}');assert.equal(run('state'),'over');assert(run('distance')<=4000);assert.equal(run('jump'),0);
assert.match(el('resultTitle').textContent,/Eles/);
setupPack();run('pause()');const packTime=run('finalTimer');run('update(1)');assert.equal(run('finalTimer'),packTime);
run('start()');assert.equal(run('finalPack.length'),0);assert.equal(run('firstYetiAppeared'),false);assert.equal(run('shoutCooldown'),0);assert.equal(run('distance'),0);

// Manual jump is edge-triggered, works at rest, and cannot be stacked or used while fallen.
run('start();objects=[];generated=1e9;v=0;beginJump()');assert(run('jump')>0);assert.equal(run('beginJump()'),false);
run('jump=0;fallen=1');assert.equal(run('beginJump()'),false);
run('fallen=0;state="paused"');assert.equal(run('beginJump()'),false);
function aerial(input,seconds=.8){run('start();objects=[];generated=1e9;v=47;beginJump()');for(const key of input)run(`keys.add(${JSON.stringify(key)})`);run(`for(let i=0;i<${Math.round(seconds*60)};i++)update(1/60)`);return run('score')}
const lateralPoints=aerial(['ArrowRight']);assert(lateralPoints>0);assert(run('x')>0);assert(run('airSpin')>0);
const flipPoints=aerial(['ArrowUp']);assert(flipPoints>lateralPoints);assert(run('v')>40);assert(run('airFlip')>0);
const corkscrewPoints=aerial(['ArrowUp','ArrowLeft']);assert(corkscrewPoints>flipPoints);assert(run('x')<0);
run('draw()');
// Combos grow with successive tricks; completed movements count before landing.
aerial(['ArrowUp','ArrowRight'],1.55);assert.equal(run('airCombo'),2);assert(run('airPoints')>corkscrewPoints*2);
run('keys.clear();for(let i=0;i<30;i++)update(1/60)');assert.equal(run('jump'),0);assert.equal(run('airSpin'),0);assert(run('score')>run('airPoints'));
// Airborne crossing ignites a tree once; grounded and far-away trees stay unlit.
run('start();objects=[];generated=1e9;v=47;beginJump();for(let i=0;i<30;i++)update(1/60);objects=[{x:x,y:world+1,type:"tree",size:1,hit:false}];update(1/60)');assert.equal(run('objects[0].burning'),true);assert.equal(run('fallen'),0);
const fireScore=run('score');run('update(1/60);draw()');assert.equal(run('score'),fireScore);
run('start();objects=[{x:1000,y:0,type:"tree",size:1,hit:false}];generated=1e9;beginJump();update(.01)');assert.equal(run('objects[0].burning'),undefined);
run('start();objects=[{x:0,y:0,type:"tree",size:1,hit:false}];generated=1e9;update(.001)');assert.equal(run('objects[0].burning'),undefined);assert(run('fallen')>0);
// Speech is optional, muted correctly, and throttled to avoid overlapping calls.
run(`let calls=[];window.speechSynthesis={cancel(){},speak(voice){calls.push(voice)}};window.SpeechSynthesisUtterance=function(text){this.text=text};
const param={setValueAtTime(){},exponentialRampToValueAtTime(){}};
const audioNode=()=>({connect(){return this},start(){},stop(){},frequency:param,gain:param});
audio={currentTime:0,createOscillator:audioNode,createGain:audioNode};muted=false;fireVoiceCooldown=0;fireSound();fireSound();`);
assert.equal(run('calls.length'),1);assert.equal(run('calls[0].text'),'Fire!');
run('fireVoiceCooldown=0;muted=true;fireSound()');assert.equal(run('calls.length'),1);
run('audio=null;start()');assert.equal(run('airCombo'),0);assert.equal(run('airPoints'),0);
run('draw();state="menu";draw()');console.log(`OK: normal descent ${normalSeconds.toFixed(1)} s; capture without yell ${withoutShout.toFixed(0)} m, with yell ${withShout.toFixed(0)} m; entry from behind, cooldown, final limit, pause, restart, manual jumps, aerial tricks, combos, tree fire and Fire voice.`);
