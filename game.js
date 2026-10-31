'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),c=canvas.getContext('2d');
const METERS_PER_PIXEL=.3; // 47 normal speed gives roughly 2000 m in 60 seconds.
let distance=0,packFear=0,shoutCooldown=0;
let airCombo=0,airPoints=0,trickProgress=0,trickKind='',airSpin=0,airFlip=0,fireVoiceCooldown=0;
let W,H,dpr,state='menu',mode='free',last=0,time=0,world=0,x=0,v=0,steer=0,score=0,fallen=0,jump=0,jumpTotal=0,generated=0,objects=[],tracks=[],particles=[],yeti=null,firstYetiAppeared=false,finalPack=[],finalTimer=0,shoutRing=0,notice=0,gates=0,misses=0,courseDone=false,best=0;
const keys=new Set(),touch=matchMedia('(pointer:coarse)').matches;
try{best=Number(localStorage.getItem('alpine-best'))||0}catch{} $('best').textContent=best+' m';
function resize(){W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=W*dpr;canvas.height=H*dpr;c.setTransform(dpr,0,0,dpr,0,0)}addEventListener('resize',resize);resize();
let audio=null,muted=false,wind=null,windGain=null,musicClock=0;
function initAudio(){if(audio){audio.resume();return}const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audio=new AC();const buf=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),a=buf.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1);wind=audio.createBufferSource();wind.buffer=buf;wind.loop=true;let filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;windGain=audio.createGain();windGain.gain.value=0;wind.connect(filter).connect(windGain).connect(audio.destination);wind.start()}
function tone(f,d=.15,type='sine',vol=.06){if(!audio||muted)return;let o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(f*.6,audio.currentTime+d);g.gain.setValueAtTime(vol,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+d)}
function stopVoice(){if(window.speechSynthesis)window.speechSynthesis.cancel()}
function fireSound(){
if(!audio||muted||fireVoiceCooldown>0)return;
fireVoiceCooldown=1.2;
// Original synthetic arcade call, with a short fire-like descending sound.
tone(135,.25,'sawtooth',.045);tone(900,.16,'triangle',.025);
if(window.speechSynthesis&&window.SpeechSynthesisUtterance){
stopVoice();const voice=new window.SpeechSynthesisUtterance('Fire!');
voice.lang='en-US';voice.pitch=.7;voice.rate=1.05;voice.volume=1;
window.speechSynthesis.speak(voice);
}
}
function beginJump(ramp=false){
if(state!=='playing'||jump>0||fallen>0)return false;
jumpTotal=ramp?Math.min(2.5,1+v/50):1.65;jump=jumpTotal;
airCombo=0;airPoints=0;trickProgress=0;trickKind='';airSpin=0;airFlip=0;
tone(440,.22);tell('NO AR! SETAS PARA MANOBRAS',1.2);return true;
}
function awardTrick(label,base){
airCombo++;const points=Math.round(base*(1+Math.min(airCombo-1,5)*.5))*(mode==='style'?2:1);
score+=points;airPoints+=points;tell(label+'  +'+points+'  |  COMBO '+airCombo,1.5);tone(440+airCombo*70,.12);
}
function updateAir(dt,left,right,back){
const side=Number(right)-Number(left);
let kind=back?(side?'corkscrew':'backflip'):(side?'carve':'');
if(kind!==trickKind){trickProgress=0;trickKind=kind}
if(!kind)return;
const duration=kind==='carve'?.32:kind==='backflip'?.65:.75;
trickProgress+=dt;
if(side)airSpin+=side*dt*(back?Math.PI*4:Math.PI*2);
if(back)airFlip+=dt*Math.PI*2/.65;
while(trickProgress>=duration){trickProgress-=duration;
if(kind==='carve')awardTrick(side<0?'DESVIO AÉREO ESQUERDO':'DESVIO AÉREO DIREITO',40);
else if(kind==='backflip')awardTrick('BACKFLIP 360',180);
else awardTrick('CORKSCREW! DUPLA ROTAÇÃO',350);
}
}
function igniteTree(o){
if(o.burning)return;o.burning=true;o.hit=true;awardTrick('FIRE! ÁRVORE EM CHAMAS',300);fireSound();
}
function screamSound(){
if(!audio||muted)return;
// Layered, vowel-like oscillators create a loud cartoon yell with a smooth envelope.
const now=audio.currentTime;
for(const [frequency,volume] of [[230,.18],[690,.075],[1150,.035]]){
const o=audio.createOscillator(),g=audio.createGain();o.type='sawtooth';
o.frequency.setValueAtTime(frequency,now);o.frequency.linearRampToValueAtTime(frequency*1.3,now+.16);o.frequency.exponentialRampToValueAtTime(frequency*.65,now+.85);
g.gain.setValueAtTime(.001,now);g.gain.linearRampToValueAtTime(volume,now+.045);g.gain.exponentialRampToValueAtTime(.001,now+.9);
const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1800;o.connect(filter).connect(g).connect(audio.destination);o.start(now);o.stop(now+.95);
}}
function shout(){
if(state!=='playing'||(!yeti&&!finalPack.length))return;
if(finalPack.length){
if(shoutCooldown>0){tell('RECUPERE O FÔLEGO PARA GRITAR DE NOVO!',1);return}
initAudio();screamSound();shoutRing=1;packFear=3.5;shoutCooldown=7;
tell('ELES HESITARAM! SEGURE F E APROVEITE O TURBO!',3);return
}
if(yeti.fleeing)return;
initAudio();screamSound();shoutRing=1;yeti.fleeing=true;yeti.fleeTime=0;
tell('AAAAAH! O PÉ GRANDE SAIU CORRENDO!',4);
}
function caught(pack=false){
state='over';stopVoice();save();$('resultTag').textContent=pack?'TRÊS CONTRA UM. A MONTANHA VENCEU.':'A MONTANHA TEM UM DONO.';
$('resultTitle').textContent=pack?'Eles te pegaram.':'Ele te pegou.';
$('resultText').textContent=`${Math.floor(distance)} m de aventura · ${score} pontos. Seu recorde: ${best} m. `+(pack?'O grito e o turbo deram trabalho, mas eles alcançaram você.':'A próxima descida pode ser diferente.');
$('resume').hidden=true;$('result').hidden=false;$('touch').hidden=true;keys.clear();tone(60,.8,'sawtooth',.1);
}
$('sound').onclick=()=>{initAudio();muted=!muted;if(muted)stopVoice();$('sound').textContent=muted?'SOM OFF':'SOM ON'};
function tell(text,seconds=2.5){$('alert').textContent=text;notice=seconds}
function save(){const n=Math.floor(distance);if(n>best){best=n;try{localStorage.setItem('alpine-best',best)}catch{}}}
function start(){initAudio();stopVoice();airCombo=0;airPoints=0;trickProgress=0;trickKind='';airSpin=0;airFlip=0;fireVoiceCooldown=0;state='playing';world=0;distance=0;packFear=0;shoutCooldown=0;x=0;v=18;steer=0;score=0;fallen=0;jump=0;generated=0;objects=[];tracks=[];particles=[];yeti=null;firstYetiAppeared=false;finalPack=[];finalTimer=0;shoutRing=0;gates=0;misses=0;courseDone=false;keys.clear();$('menu').hidden=true;$('result').hidden=true;$('hud').hidden=false;$('touch').hidden=!touch;document.body.classList.add('playing');generate();tell('BOA DESCIDA!');canvas.focus()}
$('start').onclick=start;$('restart').onclick=start;
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(a=>a.classList.toggle('selected',a===b))};
function pause(){if(state==='playing'){state='paused';stopVoice();keys.clear();$('resultTag').textContent='UMA PAUSA NA MONTANHA';$('resultTitle').textContent='Respire fundo.';$('resultText').textContent='Sua próxima curva está esperando.';$('resume').hidden=false;$('result').hidden=false}else if(state==='paused'){state='playing';$('result').hidden=true;canvas.focus()}}
$('pause').onclick=pause;$('resume').onclick=pause;addEventListener('blur',()=>{if(state==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','F2','F3'].includes(e.key))e.preventDefault();if(e.repeat)return;const k=e.key.toLowerCase();if(k==='x')shout();if(e.key===' '){if(state==='playing')canvas.focus();beginJump();}if(k==='p'||e.key==='F3'||e.key==='Escape')pause();if(e.key==='F2')start();if(e.key==='Enter'&&(state==='menu'||state==='over'))start();keys.add(e.key);keys.add(k)});addEventListener('keyup',e=>{keys.delete(e.key);keys.delete(e.key.toLowerCase())});
for(const b of document.querySelectorAll('[data-key]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);if(b.dataset.key==='x')shout();if(b.dataset.key===' ')beginJump()});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>keys.delete(b.dataset.key))}
function rand(a,b){return a+Math.random()*(b-a)}
function generate(){while(generated<world+H+700){generated+=62;for(let i=0;i<3;i++){let ox=rand(-1500,1500);if(generated<180&&Math.abs(ox)<170)continue;let r=Math.random();objects.push({x:ox,y:generated+rand(-20,20),type:r<.64?'tree':r<.80?'rock':r<.94?'ramp':'skier',size:rand(.8,1.3),hit:false,phase:rand(0,6)})}if(mode==='slalom'&&generated*METERS_PER_PIXEL>180&&generated*METERS_PER_PIXEL<1000&&Math.floor(generated/62)%3===0)objects.push({x:Math.sin(generated*.007)*220,y:generated,type:'gate',size:1,hit:false});}objects=objects.filter(o=>o.y>world-H*.4-180);}
function puff(px,py,n=12){for(let i=0;i<n;i++)particles.push({x:px,y:py,vx:rand(-55,55),vy:rand(-40,30),life:rand(.3,.8)})}
function update(dt){if(state!=='playing')return;const oldWorld=world,oldX=x;fireVoiceCooldown=Math.max(0,fireVoiceCooldown-dt);const left=keys.has('ArrowLeft')||keys.has('a'),right=keys.has('ArrowRight')||keys.has('d'),brake=keys.has('ArrowUp')||keys.has('w'),turbo=keys.has('f');steer+=(Number(right)-Number(left)-steer)*Math.min(1,dt*7);let target=brake&&jump<=0?0:turbo?115:keys.has('ArrowDown')||keys.has('s')?62:47;target*=1-Math.abs(steer)*.27;if(fallen>0){fallen-=dt;target=0}v+=(target-v)*dt*(brake&&jump<=0?3:1.2);x+=steer*v*2.7*dt;x=Math.max(-1350,Math.min(1350,x));const dy=v*2.4*dt;world+=dy;distance=Math.min(4000,distance+dy*METERS_PER_PIXEL);shoutCooldown=Math.max(0,shoutCooldown-dt);
if(jump>0){updateAir(Math.min(dt,jump),left,right,brake);jump=Math.max(0,jump-dt);if(jump===0){
const landing=Math.round(jumpTotal*100)*(mode==='style'?2:1);score+=landing;tone(660,.15);puff(x,world);
tell('POUSO PERFEITO +'+landing+' | '+airCombo+' MANOBRAS | '+airPoints+' PTS NO AR',2.5);airSpin=0;airFlip=0;
}}
if(v>2&&jump<=0&&fallen<=0){tracks.push({x:x-7,y:world,a:steer},{x:x+7,y:world,a:steer});if(tracks.length>700)tracks.splice(0,2)}
generate();for(const o of objects){if(o.type==='skier')o.x+=Math.sin(time+o.phase)*dt*18;const diff=o.y-world;if(o.hit)continue;if(o.type==='tree'&&jump>0&&Math.sin(jump/jumpTotal*Math.PI)>.3&&o.y>=oldWorld-12&&o.y<=world+12){const t=world===oldWorld?1:Math.max(0,Math.min(1,(o.y-oldWorld)/(world-oldWorld)));if(Math.abs(o.x-(oldX+(x-oldX)*t))<22*o.size){igniteTree(o);continue}}if(o.type==='gate'&&diff<0){o.hit=true;if(Math.abs(o.x-x)<65){score+=100;gates++;tone(880,.12);tell('PORTA CERTA  +100',1)}else{misses++;tell('PORTA PERDIDA  +5 s',1.3)}continue}if(Math.abs(diff)<(o.type==='ramp'?19:12)&&Math.abs(o.x-x)<(o.type==='tree'?22:24)*o.size&&fallen<=0){if(o.type==='ramp'&&jump<=0&&v>15){beginJump(true);o.hit=true}else if(o.type!=='ramp'&&o.type!=='gate'&&jump<=0){o.hit=true;fallen=1.7;v*=.12;score=Math.max(0,score-25);puff(x,world,24);tone(95,.4,'triangle',.13);tell('OPA!  −25',1.5)}}}
if(!courseDone&&distance>=1000&&mode!=='free'){courseDone=true;tell(mode==='slalom'?`SLALOM CONCLUÍDO · ${gates} PORTAS · ${misses*5}s DE PENALIDADE`:'PISTA CONCLUÍDA · CONTINUE EXPLORANDO',5)}
if(distance>=3000&&!finalPack.length){
yeti=null;finalTimer=0;packFear=0;shoutCooldown=0;
// Spawn above the camera; the entire pack runs into view from behind.
finalPack=Array.from({length:3},(_,i)=>({x:x+(i-1)*65,y:world-H*.36-100-i*35}));
tone(55,1,'sawtooth',.1);tell('OUVIU ISSO? TRÊS PÉS GRANDES VINDO ATRÁS! X + F!',5);
}
if(distance>=2000&&!firstYetiAppeared&&!finalPack.length){firstYetiAppeared=true;yeti={x:x,y:world-H*.36-100};tone(65,1,'sawtooth',.08);tell('PÉ GRANDE VINDO POR TRÁS! PRESSIONE X PARA GRITAR!',5)}
if(finalPack.length){
finalTimer+=dt;packFear=Math.max(0,packFear-dt);
const progress=Math.min(1,(distance-3000)/1000),playerSpeed=v*2.4;
for(const m of finalPack){
const dx=x-m.x,dy2=world-m.y,len=Math.hypot(dx,dy2)||1;
// They recover from each yell and become faster as the final kilometre unfolds.
const runSpeed=packFear>0?35:235+progress*310;
// A closing deadline accelerates actual pursuit, rather than placing monsters around the player.
const remainingTime=Math.max(.05,(4000-distance)/Math.max(1,playerSpeed*METERS_PER_PIXEL));
const speed=Math.max(runSpeed,progress>.8?playerSpeed+len/remainingTime:0);
const step=Math.min(len,speed*dt);m.x+=dx/len*step;m.y+=dy2/len*step;
if(Math.hypot(x-m.x,world-m.y)<26){jump=0;caught(true);break}
}
if(state==='playing'&&distance>=4000){jump=0;caught(true)}
}else if(yeti){
if(yeti.fleeing){yeti.fleeTime+=dt;yeti.x+=360*dt;yeti.y-=320*dt;if(yeti.fleeTime>2.5)yeti=null}
else{let dx=x-yeti.x,dy2=world-yeti.y,len=Math.hypot(dx,dy2)||1,ys=175;yeti.x+=dx/len*ys*dt;yeti.y+=dy2/len*ys*dt;if(len<30&&jump<=0)caught()}
}
shoutRing=Math.max(0,shoutRing-dt);
for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);$('distance').textContent=Math.floor(distance)+' m';$('speed').textContent=Math.round(v)+' km/h';$('score').textContent=score;if(notice>0){notice-=dt;if(notice<=0)$('alert').textContent=''}save();
if(audio&&!muted){musicClock+=dt;if(musicClock>2){musicClock=0;tone([220,277,330,440][Math.floor(time/2)%4],1.8,'sine',.014)}}}
function ellipse(x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()}
function line(x,y,x2,y2,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke()}
function tree(px,py,s,burning=false){c.save();c.translate(px,py);c.scale(s,s);ellipse(20,4,43,10,'#557b8620');c.fillStyle='#796e5d';c.fillRect(-4,-30,8,32);for(let j=0;j<3;j++){let yy=-j*22;c.fillStyle=burning?'#59433b':['#316261','#39736c','#49877b'][j];c.beginPath();c.moveTo(0,yy-58);c.lineTo(-31+j*6,yy);c.quadraticCurveTo(0,yy+10,31-j*6,yy);c.closePath();c.fill();c.fillStyle=burning?'#8b503b':'#eef6f2';c.beginPath();c.moveTo(0,yy-58);c.lineTo(-20+j*4,yy-20);c.quadraticCurveTo(-3,yy-12,18-j*4,yy-22);c.closePath();c.fill()}
if(burning){for(let i=0;i<7;i++){const fx=(i-3)*8,fy=-12-(i%3)*23,wave=Math.sin(time*13+i*2)*7;
c.fillStyle=i%2?'#ffb52e':'#ee6231';c.beginPath();c.moveTo(fx-11,fy);c.quadraticCurveTo(fx-16,fy-20,fx+wave,fy-48);c.quadraticCurveTo(fx+17,fy-15,fx+11,fy);c.fill();ellipse(fx,fy-6,5,12,'#ffe795')}
for(let i=0;i<4;i++){const rise=(time*24+i*24)%100;ellipse(Math.sin(i+time)*12,-85-rise,9+rise*.08,8+rise*.06,'#60757940')}}
c.restore()}
function skier(px,py,angle,air=0,npc=false){ellipse(px+10,py+5,20-air*.07,7,'#40677725');c.save();c.translate(px,py-air);c.rotate(angle*.5+(fallen>0&&!npc?1.4:0)+(!npc&&jump>0?airSpin:0));if(!npc&&jump>0){const tilt=Math.cos(airFlip);c.scale(1,Math.sign(tilt||1)*Math.max(.2,Math.abs(tilt)))}line(-8,-8,-9,22,'#234b55',4);line(8,-8,9,22,'#234b55',4);line(-8,4,-6,-6,'#243e4a',5);line(8,4,4,-6,'#243e4a',5);line(-14,-18,-22,7,'#78959b',1);line(14,-18,23,7,'#78959b',1);line(-14,-17,0,-20,npc?'#b89652':'#e57850',7);line(0,-20,14,-15,npc?'#b89652':'#e57850',7);line(0,-8,0,-24,npc?'#d5b66a':'#e87e54',16);ellipse(0,-33,9,9,'#efc5a1');ellipse(0,-37,10,7,'#244d58');line(-7,-33,7,-33,'#90d5d7',4);c.restore()}
function monster(px,py){const run=Math.sin(time*15)*9;ellipse(px+13,py+3,37,12,'#40677730');c.save();c.translate(px,py);line(-13,-9,-20,10+run,'#b0c5ca',13);line(13,-9,23,10-run,'#c3d5d8',13);line(-23,-39,-40,-15+run,'#c0d2d7',14);line(23,-39,40,-15-run,'#d9e5e5',14);ellipse(0,-30,29,34,'#d8e5e5');ellipse(0,-53,24,23,'#eaf1ed');ellipse(0,-49,17,13,'#3b5965');ellipse(-7,-53,3,3,'#ec7253');ellipse(7,-53,3,3,'#ec7253');ellipse(0,-42,8,5,'#223c47');c.fillStyle='white';c.fillRect(-6,-46,4,5);c.fillRect(3,-46,4,5);c.restore()}
function draw(){const menu=state==='menu',cx=menu?W*.74:W*.5,cy=menu?H*.60:H*.36;const camX=menu?0:x,camY=menu?250:world;c.fillStyle='#edf4f4';c.fillRect(0,0,W,H);let grad=c.createLinearGradient(0,0,W,H);grad.addColorStop(0,'#edf4f4');grad.addColorStop(1,'#d6e8eb');c.fillStyle=grad;c.fillRect(0,0,W,H);
// Soft contours and snow crystals give the slope depth without obscuring play.
c.strokeStyle='#b9d2d62b';c.lineWidth=1;for(let j=-2;j<12;j++){c.beginPath();let yy=j*130-(camY*.18%130);c.moveTo(0,yy);c.bezierCurveTo(W*.3,yy+90,W*.6,yy-100,W,yy+20);c.stroke()}
for(let i=0;i<75;i++){let px=((i*173.7-camX*.15)%W+W)%W,py=((i*97.3-camY*.4)%H+H)%H;ellipse(px,py,1.2,.8,'#fff9')}
if(menu){for(let i=0;i<19;i++){let xx=W*.52+((i*137)%(W*.5)),yy=((i*173+80)%(H+180));tree(xx,yy,.65+(i%4)*.2)}for(let n=0;n<2;n++){c.strokeStyle='#91afb65c';c.lineWidth=2;c.beginPath();c.moveTo(cx-70+n*12,0);c.bezierCurveTo(cx+120+n*12,H*.25,cx-130+n*12,H*.36,cx+n*12,cy);c.stroke()}skier(cx,cy,-.4,0);tree(W*.9,H*.91,1.6);return}
for(const t of tracks){let px=cx+t.x-camX,py=cy+t.y-camY;if(py>-20&&py<H+20)line(px,py,px-t.a*3,py-5,'#90aeb33d',1.5)}let render=objects.map(o=>({o,yy:o.y}));render.push({player:true,yy:world});if(yeti)render.push({monster:yeti,yy:yeti.y});for(const m of finalPack)render.push({monster:m,yy:m.y});render.sort((a,b)=>a.yy-b.yy);for(const r of render){if(r.player){let air=jump>0?Math.sin(jump/jumpTotal*Math.PI)*65:0;skier(cx,cy,steer,air);continue}if(r.monster){monster(cx+r.monster.x-camX,cy+r.monster.y-camY);continue}let o=r.o,px=cx+o.x-camX,py=cy+o.y-camY;if(px<-100||px>W+100||py<-150||py>H+130)continue;if(o.type==='tree')tree(px,py,o.size,o.burning);if(o.type==='rock'){ellipse(px+6,py+2,25,7,'#557b8620');ellipse(px,py-5,20*o.size,13*o.size,'#8da8b1');ellipse(px-3,py-11,15*o.size,7*o.size,'#f8fbfa')}if(o.type==='ramp'){c.fillStyle='#94bac2';c.beginPath();c.moveTo(px-26,py+12);c.lineTo(px-22,py-16);c.lineTo(px+22,py-16);c.lineTo(px+26,py+12);c.fill();line(px-22,py-16,px+22,py-16,'#f9ffff',5);line(px-13,py+4,px,py-7,'#d8f0ef',2);line(px,py-7,px+13,py+4,'#d8f0ef',2)}if(o.type==='skier')skier(px,py,Math.sin(time+o.phase)*.5,0,true);if(o.type==='gate'){for(const side of [-1,1]){line(px+side*65,py,px+side*65,py-45,o.hit?'#819f9e':'#d56f50',2);c.fillStyle=o.hit?'#819f9e':'#e77f59';c.fillRect(px+side*65,py-45,20,13)}line(px-65,py,px+65,py,'#c4d9dc',1)}}for(const p of particles)ellipse(cx+p.x-camX,cy+p.y-camY,3,3,'#fff');if(shoutRing>0){c.strokeStyle='#e57950';c.lineWidth=3*shoutRing;c.beginPath();c.arc(cx,cy-25,(1-shoutRing)*150+20,0,Math.PI*2);c.stroke();c.fillStyle='#bc5638';c.font='bold 23px Arial';c.textAlign='center';c.fillText('AAAAAH!',cx,cy-90);}}
function frame(now){let dt=Math.min(.035,(now-last)/1000||.016);last=now;time+=dt;update(dt);if(windGain)windGain.gain.setTargetAtTime(!muted&&state==='playing'?.018+v*.0005:0,audio.currentTime,.15);draw();requestAnimationFrame(frame)}requestAnimationFrame(frame);
