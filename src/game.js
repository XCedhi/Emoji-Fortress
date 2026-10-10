(() => {
  'use strict';
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const ui = {
    level: $('levelValue'), timer: $('timerValue'), lives: $('livesValue'), score: $('scoreValue'),
    phase: $('phaseLabel'), projectile: $('projectileLabel'), icon: $('statusIcon'),
    title: $('statusTitle'), text: $('statusText'), start: $('startBtn'), retry: $('retryBtn'),
    next: $('nextBtn'), custom: $('customEmoji'), toast: $('toast')
  };
  const EMOJIS = ['😀','😎','🥺','🤖','👻','🐱','🍕','💎','🐸','❤️','🦄','🐼'];
  const state = {
    level: 1, lives: 3, score: 0, best: Number(localStorage.getItem('emojiFortressBest') || 0),
    emoji: '😀', wallColor: '#7958ff', phase: 'ready', points: [], drawing: false,
    projectiles: [], particles: [], emojiR: 30, center: {x:0,y:0}, drawLeft: 6,
    lastTime: 0, spawnLeft: 0, spawnCount: 0, spawned: 0, survived: 0,
    invuln: 0, shake: 0, toastTimer: 0, resultTimer: 0, waveRemaining: 0,
    pointer: null, dpr: 1, width: 800, height: 520
  };
  const levelConfig = n => ({
    count: Math.min(1 + Math.floor((n-1)*1.25), 24),
    speed: 95 * Math.pow(1.105, Math.min(n-1, 25)),
    drawTime: Math.max(1.5, 6 - (n-1)*0.42),
    interval: Math.max(0.18, 0.95 - n*0.035)
  });
  let toastTimeout;
  function toast(msg) {
    ui.toast.textContent = msg; ui.toast.classList.add('show');
    clearTimeout(toastTimeout); toastTimeout = setTimeout(() => ui.toast.classList.remove('show'), 1900);
  }
  function setStatus(icon, title, text) {
    ui.icon.textContent = icon; ui.title.textContent = title; ui.text.textContent = text;
  }
  function updateHud() {
    ui.level.textContent = state.level;
    ui.timer.textContent = state.phase === 'draw' ? `${Math.max(0,state.drawLeft).toFixed(1)}s` : `${levelConfig(state.level).drawTime.toFixed(1)}s`;
    ui.lives.textContent = '❤️'.repeat(Math.max(0,state.lives)) + '🖤'.repeat(3-Math.max(0,state.lives));
    ui.score.textContent = state.score.toLocaleString();
    ui.phase.textContent = ({
      ready:'READY TO DRAW', draw:'✏️ DRAW YOUR SHIELD', defense:'🛡️ DEFEND THE EMOJI',
      won:'🎉 LEVEL COMPLETE', lost:'💥 TRY AGAIN', gameover:'GAME OVER'
    })[state.phase] || state.phase.toUpperCase();
    ui.projectile.textContent = `${state.projectiles.length} projectile${state.projectiles.length === 1 ? '' : 's'}`;
    ui.start.textContent = state.phase === 'ready' ? `Start level ${state.level} 🚀` : 'Restart level ↻';
    ui.next.disabled = state.phase !== 'won';
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.dpr = dpr; state.width = Math.max(300, rect.width); state.height = Math.max(330, rect.height);
    canvas.width = Math.round(state.width*dpr); canvas.height = Math.round(state.height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    state.center = {x: state.width/2, y: state.height/2};
    state.emojiR = Math.max(25, Math.min(37, state.width*0.055));
    if (state.phase === 'ready') state.points = [];
  }
  window.addEventListener('resize', resize);
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  function pointSegDist(p,a,b) {
    const dx=b.x-a.x, dy=b.y-a.y, len=dx*dx+dy*dy;
    if (!len) return distance(p,a);
    const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/len,0,1);
    return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));
  }
  function segmentsIntersect(a,b,c,d) {
    const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
    const ab1=cross(a,b,c), ab2=cross(a,b,d), cd1=cross(c,d,a), cd2=cross(c,d,b);
    return ((ab1>0&&ab2<0)||(ab1<0&&ab2>0)) && ((cd1>0&&cd2<0)||(cd1<0&&cd2>0));
  }
  function pointInPolygon(p, poly) {
    let inside=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const a=poly[i], b=poly[j];
      if(((a.y>p.y)!==(b.y>p.y)) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) inside=!inside;
    }
    return inside;
  }
  function validateShape(points) {
    if(points.length<12) return 'Draw a larger, more complete loop.';
    const first=points[0], last=points[points.length-1];
    const closeTolerance=Math.max(22, state.width*0.045);
    if(distance(first,last)>closeTolerance) return 'There is a gap! Finish near where you started.';
    const poly=points.slice(0,-1);
    if(!pointInPolygon(state.center,poly)) return 'Your loop must surround the emoji.';
    const minX=Math.min(...poly.map(p=>p.x)), maxX=Math.max(...poly.map(p=>p.x));
    const minY=Math.min(...poly.map(p=>p.y)), maxY=Math.max(...poly.map(p=>p.y));
    if(maxX-minX < state.emojiR*2.8 || maxY-minY < state.emojiR*2.8) return 'Your fortress is too small.';
    if(minX<8||minY<8||maxX>state.width-8||maxY>state.height-8) return 'Keep your fortress away from the screen edges.';
    for(let i=0;i<poly.length;i++){
      if(pointSegDist(state.center,poly[i],poly[(i+1)%poly.length]) < state.emojiR+8) return 'Your wall is too close to the emoji!';
    }
    const n=poly.length;
    for(let i=0;i<n;i++){
      for(let j=i+2;j<n;j++){
        if(i===0&&j===n-1) continue;
        if(segmentsIntersect(poly[i],poly[(i+1)%n],poly[j],poly[(j+1)%n])) return 'Keep the shield line from crossing itself.';
      }
    }
    return null;
  }
  function startLevel() {
    state.phase='draw'; state.points=[]; state.drawing=false; state.projectiles=[]; state.particles=[];
    state.drawLeft=levelConfig(state.level).drawTime; state.spawned=0; state.survived=0;
    state.spawnLeft=.35; state.invuln=0; state.shake=0;
    ui.next.disabled=true;
    setStatus('✏️','Draw a closed fortress!',`You have ${state.drawLeft.toFixed(1)} seconds. Close the loop around ${state.emoji}, without touching it.`);
    updateHud();
  }
  function beginDefense() {
    const problem=validateShape(state.points);
    if(problem) {
      state.points=[]; state.drawing=false; state.drawLeft=Math.max(1.2, state.drawLeft);
      setStatus('🧐','Not quite!',problem); toast(problem); updateHud(); return;
    }
    state.points.push({...state.points[0]});
    state.phase='defense'; state.drawing=false;
    const cfg=levelConfig(state.level); state.spawned=0; state.survived=0; state.spawnLeft=.25;
    setStatus('🛡️','Fortress locked!',`Hold steady! Block all ${cfg.count} incoming projectile${cfg.count===1?'':'s'}.`);
    burst(state.center.x,state.center.y,state.wallColor,20);
    toast('Shield locked in! Incoming!'); updateHud();
  }
  function loseLife(message) {
    if(state.phase!=='defense') return;
    state.lives--; state.phase=state.lives>0?'lost':'gameover'; state.projectiles=[];
    burst(state.center.x,state.center.y,'#ff5d9e',35); state.shake=13;
    setStatus('💥',state.lives>0?'Your emoji got hit!':'Fortress fallen!',message);
    if(state.lives>0) toast('Oof! One life lost. Try again!');
    else toast('Game over — your best is saved.');
    updateHud();
  }
  function winLevel() {
    if(state.phase!=='defense') return;
    state.phase='won';
    const bonus=Math.round(100 + Math.max(0,state.drawLeft)*10 + Math.max(0, 45-state.points.length)*1.5);
    state.score+=bonus;
    state.best=Math.max(state.best,state.score);
    localStorage.setItem('emojiFortressBest',String(state.best));
    burst(state.center.x,state.center.y,'#ffd85b',65);
    setStatus('🏆','Fortress defended!',`All projectiles blocked! +${bonus} points. Ready for level ${state.level+1}?`);
    toast(`Level ${state.level} cleared! +${bonus} points 🎉`); updateHud();
  }
  function spawnProjectile() {
    const w=state.width,h=state.height,c=state.center,cfg=levelConfig(state.level);
    const side=Math.floor(Math.random()*4);
    let x,y;
    if(side===0){x=Math.random()*w;y=-12}
    else if(side===1){x=w+12;y=Math.random()*h}
    else if(side===2){x=Math.random()*w;y=h+12}
    else{x=-12;y=Math.random()*h}
    const dx=c.x-x,dy=c.y-y,len=Math.hypot(dx,dy)||1;
    const speed=cfg.speed*(.82+Math.random()*.38);
    const angle=(Math.random()-.5)*.20;
    const ca=Math.cos(angle),sa=Math.sin(angle);
    state.projectiles.push({
      x,y,vx:(dx/len*ca-dy/len*sa)*speed,vy:(dx/len*sa+dy/len*ca)*speed,
      r:state.level>=6?5:6.5,color:['#ff5d9e','#ffad33','#27b7ff','#8d68ff'][Math.floor(Math.random()*4)],
      trail:[],bounces:0
    });
  }
  function burst(x,y,color,count) {
    for(let i=0;i<count;i++){
      const a=Math.random()*Math.PI*2, s=35+Math.random()*210;
      state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.45+Math.random()*.65,max:.45+Math.random()*.65,r:2+Math.random()*4,color});
    }
  }
  function collideProjectile(p,dt) {
    const prev={x:p.x,y:p.y};
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    const wall=state.points;
    for(let i=0;i<wall.length-1;i++){
      const a=wall[i],b=wall[i+1];
      if(pointSegDist(p,a,b) <= p.r+5) {
        const sx=b.x-a.x,sy=b.y-a.y,sl=Math.hypot(sx,sy)||1;
        let nx=-sy/sl,ny=sx/sl;
        if(p.vx*nx+p.vy*ny>0){nx=-nx;ny=-ny;}
        const dot=p.vx*nx+p.vy*ny;
        p.vx-=2*dot*nx; p.vy-=2*dot*ny;
        p.x=prev.x+p.vx*dt; p.y=prev.y+p.vy*dt;
        p.bounces++;
        burst(p.x,p.y,p.color,7);
        p.x+=nx*2; p.y+=ny*2;
        return 'bounce';
      }
    }
    if(distance(p,state.center)<state.emojiR+p.r-2) return 'hit';
    if(p.x < -55 || p.x > state.width+55 || p.y < -55 || p.y > state.height+55) return 'gone';
    return null;
  }
  function update(dt) {
    if(state.phase==='draw') {
      state.drawLeft-=dt;
      if(state.drawLeft<=0) {
        state.drawLeft=0; state.phase='lost'; state.drawing=false; state.points=[];
        setStatus('⏰','Time ran out!','Your shield was not ready in time. Retry and draw a little faster.');
        toast('Too slow! Try again.'); updateHud();
      }
    } else if(state.phase==='defense') {
      const cfg=levelConfig(state.level);
      state.spawnLeft-=dt;
      if(state.spawned<cfg.count && state.spawnLeft<=0) {
        spawnProjectile(); state.spawned++; state.spawnLeft=cfg.interval;
      }
      for(let i=state.projectiles.length-1;i>=0;i--){
        const result=collideProjectile(state.projectiles[i],dt);
        if(result==='hit'){loseLife('A projectile slipped past your wall. Redraw your fortress and try again.');break;}
        if(result==='gone'){state.projectiles.splice(i,1);state.survived++;}
      }
      if(state.phase==='defense' && state.spawned>=cfg.count && state.projectiles.length===0) winLevel();
    }
    for(let i=state.particles.length-1;i>=0;i--){
      const p=state.particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.1,dt);p.vy*=Math.pow(.1,dt);
      if(p.life<=0)state.particles.splice(i,1);
    }
    state.shake=Math.max(0,state.shake-dt*35);
    updateHud();
  }
  function roundedRect(x,y,w,h,r) {
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);
  }
  function drawBackground() {
    const w=state.width,h=state.height;
    ctx.clearRect(0,0,w,h);
    const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#fffdf8');g.addColorStop(1,'#f4f0ff');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    ctx.save();ctx.globalAlpha=.32;ctx.strokeStyle='#d8d1f1';ctx.lineWidth=1;
    const step=25;
    for(let x=12;x<w;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let y=12;y<h;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    ctx.restore();
    const blobs=[{x:w*.12,y:h*.16,r:40,c:'#ffd5e5'},{x:w*.86,y:h*.18,r:48,c:'#d4f3ff'},{x:w*.85,y:h*.85,r:54,c:'#e7dcff'}];
    blobs.forEach(b=>{ctx.globalAlpha=.55;ctx.fillStyle=b.c;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
  }
  function drawEmoji(time) {
    const c=state.center, r=state.emojiR, bounce=Math.sin(time*.004)*2;
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.shadowColor='#f0a4c7';ctx.shadowBlur=15;
    ctx.font=`${r*2.05}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.fillText(state.emoji,c.x,c.y+bounce);
    ctx.restore();
    if(state.phase==='draw') {
      ctx.save();ctx.strokeStyle='#b9afd9';ctx.setLineDash([5,7]);ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(c.x,c.y,r+19,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
  }
  function drawWall() {
    if(state.points.length<2)return;
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(state.points[0].x,state.points[0].y);
    for(let i=1;i<state.points.length;i++)ctx.lineTo(state.points[i].x,state.points[i].y);
    if(state.phase==='defense'||state.phase==='won')ctx.closePath();
    ctx.strokeStyle=state.wallColor;ctx.lineWidth=10;ctx.shadowColor=state.wallColor;ctx.shadowBlur=17;ctx.stroke();
    ctx.shadowBlur=0;ctx.strokeStyle='#ffffff';ctx.lineWidth=3;ctx.stroke();
    if(state.phase==='draw'&&state.points.length){
      const p=state.points[0];ctx.fillStyle='#ff5d9e';ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function drawProjectiles(time) {
    state.projectiles.forEach(p=>{
      ctx.save();ctx.globalAlpha=.2;ctx.strokeStyle=p.color;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(p.x-p.vx*.045,p.y-p.vy*.045);ctx.lineTo(p.x,p.y);ctx.stroke();
      ctx.globalAlpha=1;ctx.shadowColor=p.color;ctx.shadowBlur=14;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x-p.r*.25,p.y-p.r*.25,p.r*.28,0,Math.PI*2);ctx.fill();ctx.restore();
    });
    state.particles.forEach(p=>{ctx.save();ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.restore();});
  }
  function drawOverlay() {
    if(state.phase==='ready') {
      ctx.save();ctx.fillStyle='#25234b';ctx.textAlign='center';
      ctx.font='900 20px system-ui';ctx.fillText('Ready to defend?',state.width/2,state.height*.79);
      ctx.fillStyle='#77758f';ctx.font='600 12px system-ui';ctx.fillText('Choose an emoji, then tap Start level',state.width/2,state.height*.79+23);ctx.restore();
    }
    if(['won','lost','gameover'].includes(state.phase)) {
      ctx.save();ctx.fillStyle='#fffdf5e8';roundedRect(state.width/2-133,state.height*.76-32,266,65,17);ctx.fill();
      ctx.textAlign='center';ctx.fillStyle='#25234b';ctx.font='900 17px system-ui';
      const msg=state.phase==='won'?'LEVEL CLEARED! 🎉':state.phase==='gameover'?'GAME OVER 💥':'TRY AGAIN 💪';
      ctx.fillText(msg,state.width/2,state.height*.76-3);ctx.fillStyle='#77758f';ctx.font='600 11px system-ui';
      ctx.fillText(state.phase==='won'?'Tap Next level when ready':'Tap Retry to give it another go',state.width/2,state.height*.76+17);ctx.restore();
    }
  }
  function render(time) {
    ctx.save();
    if(state.shake>0)ctx.translate((Math.random()-.5)*state.shake,(Math.random()-.5)*state.shake);
    drawBackground();drawWall();drawProjectiles(time);drawEmoji(time);drawOverlay();ctx.restore();
  }
  function frame(time) {
    const dt=Math.min(.033,Math.max(0,(time-(state.lastTime||time))/1000));state.lastTime=time;
    update(dt);render(time);requestAnimationFrame(frame);
  }
  function pointerPos(e) {
    const rect=canvas.getBoundingClientRect();
    return {x:clamp(e.clientX-rect.left,0,state.width),y:clamp(e.clientY-rect.top,0,state.height)};
  }
  canvas.addEventListener('pointerdown',e=>{
    if(state.phase!=='draw')return;
    e.preventDefault();canvas.setPointerCapture?.(e.pointerId);
    const p=pointerPos(e);
    if(distance(p,state.center)<state.emojiR+12){toast('Start your wall away from the emoji.');return;}
    state.drawing=true;state.points=[p];state.pointer=e.pointerId;
  });
  canvas.addEventListener('pointermove',e=>{
    if(!state.drawing||e.pointerId!==state.pointer)return;
    e.preventDefault();const p=pointerPos(e),last=state.points[state.points.length-1];
    if(distance(p,last)>3)state.points.push(p);
  });
  function endDrawing(e) {
    if(!state.drawing|| (e && e.pointerId!==state.pointer))return;
    state.drawing=false;state.pointer=null;
    if(state.points.length<12){state.points=[];toast('Draw a bigger loop in one continuous motion.');return;}
    beginDefense();
  }
  canvas.addEventListener('pointerup',endDrawing);
  canvas.addEventListener('pointercancel',endDrawing);
  document.querySelectorAll('.emoji-btn').forEach(btn=>btn.addEventListener('click',()=>{
    if(state.phase==='draw'||state.phase==='defense'){toast('Finish or retry this round before changing emoji.');return;}
    state.emoji=btn.dataset.emoji;ui.custom.value=state.emoji;
    document.querySelectorAll('.emoji-btn').forEach(b=>b.classList.toggle('active',b===btn));
    setStatus('😊','Hero selected!',`Ready to protect ${state.emoji}? Start the level when you are ready.`);
    render(performance.now());
  }));
  document.getElementById('useCustom').addEventListener('click',()=>{
    const value=ui.custom.value.trim();
    if(!value){toast('Enter an emoji first.');return;}
    if(state.phase==='draw'||state.phase==='defense'){toast('Retry the round before changing emoji.');return;}
    state.emoji=Array.from(value)[0];document.querySelectorAll('.emoji-btn').forEach(b=>b.classList.remove('active'));
    setStatus('🌟','Custom hero selected!',`Your fortress will protect ${state.emoji}.`);
    render(performance.now());
  });
  document.querySelectorAll('.swatch').forEach(btn=>btn.addEventListener('click',()=>{
    state.wallColor=btn.dataset.color;document.querySelectorAll('.swatch').forEach(b=>b.classList.toggle('active',b===btn));
  }));
  ui.start.addEventListener('click',startLevel);
  ui.retry.addEventListener('click',()=>startLevel());
  ui.next.addEventListener('click',()=>{
    if(state.phase!=='won')return;
    state.level++;startLevel();
  });
  resize();updateHud();requestAnimationFrame(frame);
})();
