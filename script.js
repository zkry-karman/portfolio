/* =====================================================================
   PAC-MAN SCENE SETTINGS (hero section). Edit these numbers freely.
   ===================================================================== */
var ARCADE = {
  speed: 200,          // how fast Pac-Man runs, in pixels per second
  coinGap: 32,         // distance between coins in px (also sets how tall the climb is)
  turnAt: 0.65,        // where he turns upward: 0.65 = 65% of the way across the screen
  climbCoins: 4,       // how many coins he climbs before turning right again
  bottomOffset: 36,    // height of the lower lane above the bottom of the hero, in px
  ghostColors: ['#ff2e97', '#19f9ff', '#ff8a3d'], // one color per ghost (3 colors = 3 ghosts)
  ghostDelay: 1.6,     // seconds between Pac-Man and the first ghost
  ghostSpacing: 0.5,   // seconds between each ghost
  pause: 1,            // empty-screen pause (seconds) before the scene restarts
  offscreen: 70,       // how far past the screen edges the lane extends, in px
  mobileWidth: 700     // under this screen width the climb is skipped (straight line)
};

(function(){
  var rail=document.getElementById('rail');
  var cards=[].slice.call(rail.querySelectorAll('.card:not(.ph)'));
  function closeAll(){cards.forEach(function(c){
    c.classList.remove('open');c.querySelector('.pv').setAttribute('aria-expanded','false');c.querySelector('.details').inert=true;});}
  function openCard(c){
    c.classList.add('open');c.querySelector('.pv').setAttribute('aria-expanded','true');c.querySelector('.details').inert=false;
    setTimeout(function(){rail.scrollTo({left:c.offsetLeft-(rail.clientWidth-c.offsetWidth)/2,behavior:'smooth'});},480);
  }
  cards.forEach(function(c){
    var b=c.querySelector('.pv');
    b.addEventListener('click',function(){var was=c.classList.contains('open');closeAll();if(!was)openCard(c);});
    c.querySelector('.close').addEventListener('click',function(){closeAll();b.focus();});
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeAll();});

  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var v=0;
  rail.addEventListener('pointermove',function(e){
    if(e.pointerType!=='mouse')return;
    var r=rail.getBoundingClientRect(),p=(e.clientX-r.left)/r.width;
    v=p>.75?(p-.75)/.25:p<.25?-(.25-p)/.25:0;v*=16;
  });
  rail.addEventListener('pointerleave',function(){v=0;});
  (function tick(){
    if(v&&!rail.querySelector('.card.open'))rail.scrollLeft+=v;
    requestAnimationFrame(tick);
  })();
})();

/* ---------------------------------------------------------------------
   Pac-Man scene: coins, Pac-Man and ghosts all follow one path, so the
   path is the only thing to change if you want a different route.
   --------------------------------------------------------------------- */
(function(){
  var layer=document.getElementById('arcade');
  if(!layer)return;
  var C=ARCADE;
  var GHOST_SVG='<svg viewBox="0 0 28 30" width="100%" height="100%"><path fill="COLOR" d="M1 29V14a13 13 0 0 1 26 0v15l-4-4-4 4-5-4-5 4-4-4z"/>'+
    '<ellipse cx="10" cy="13" rx="3.8" ry="4.6" fill="#fff"/><ellipse cx="19" cy="13" rx="3.8" ry="4.6" fill="#fff"/>'+
    '<g class="pupils" fill="#1a0b3d"><circle cx="10" cy="13" r="2"/><circle cx="19" cy="13" r="2"/></g></svg>';
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var pac=document.createElement('div');pac.className='pac';layer.appendChild(pac);
  var ghosts=C.ghostColors.map(function(color){
    var el=document.createElement('div');el.className='ghost';el.style.setProperty('--g',color);
    el.innerHTML=GHOST_SVG.replace('COLOR',color);layer.appendChild(el);
    return {el:el,pupils:el.querySelector('.pupils')};
  });

  var coins=[],next=0,t=0,T=1,visible=true,last=0;
  var W,H,x0,yLow,yHigh,dT,climb,turnX,L;

  // Position, and direction, of a point d pixels along the path.
  function pointAt(d){
    if(d<=dT)return {x:x0+d,y:yLow,dx:1,dy:0};                        // lower lane, heading right
    if(d<=dT+climb)return {x:turnX,y:yLow-(d-dT),dx:0,dy:-1};          // climbing up
    return {x:turnX+(d-dT-climb),y:yHigh,dx:1,dy:0};                   // upper lane, heading right
  }

  function build(){
    coins.forEach(function(c){layer.removeChild(c.el);});coins=[];
    W=layer.clientWidth;H=layer.clientHeight;
    var gap=C.coinGap;
    climb=(W<C.mobileWidth?0:C.climbCoins)*gap;
    x0=-C.offscreen;yLow=H-C.bottomOffset;yHigh=yLow-climb;
    dT=Math.round((C.turnAt*W-x0)/gap)*gap;turnX=x0+dT;                // snap the turn onto a coin
    L=dT+climb+(W+C.offscreen-turnX);                                   // total path length
    for(var d=gap;d<=L;d+=gap){
      var p=pointAt(d);
      if(p.x<8||p.x>W-8)continue;
      var el=document.createElement('div');el.className='coin';
      el.style.left=p.x+'px';el.style.top=p.y+'px';layer.appendChild(el);
      coins.push({el:el,d:d});
    }
    var tail=(C.ghostDelay+(ghosts.length-1)*C.ghostSpacing)*C.speed;   // lets the last ghost leave too
    T=(L+tail)/C.speed+C.pause;
    t=0;next=0;
    render(reduce?L*0.45/C.speed:0);
    layer.classList.add('ready');
  }

  function render(time){
    var D=time*C.speed,p=pointAt(D);
    pac.style.transform='translate('+p.x+'px,'+p.y+'px) rotate('+(p.dy<0?-90:0)+'deg)';
    while(next<coins.length&&coins[next].d<=D){coins[next].el.classList.add('eaten');next++;}
    ghosts.forEach(function(g,i){
      var q=pointAt(D-(C.ghostDelay+i*C.ghostSpacing)*C.speed);
      g.el.style.transform='translate('+q.x+'px,'+q.y+'px)';
      g.pupils.setAttribute('transform','translate('+(q.dx*1.8)+' '+(q.dy*1.8)+')');
    });
  }

  function restart(){
    coins.forEach(function(c){c.el.classList.remove('eaten');});
    next=0;t=0;
  }

  function frame(now){
    var dt=Math.min((now-last)/1000,.05);last=now;
    if(visible){t+=dt;if(t>=T)restart();render(t);}
    requestAnimationFrame(frame);
  }

  var timer;
  if('ResizeObserver' in window){
    new ResizeObserver(function(){clearTimeout(timer);timer=setTimeout(build,120);}).observe(layer);
  }
  build();
  if(reduce)return;
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(e){visible=e[0].isIntersecting;}).observe(layer);
  }
  last=performance.now();
  requestAnimationFrame(frame);
})();