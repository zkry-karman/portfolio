/* =====================================================================
   PAC-MAN SCENE SETTINGS (hero section). Edit these numbers freely.
   The route itself follows your name: along the top, down the gap between
   the two words, then along the bottom.
   ===================================================================== */
var ARCADE = {
  speed: 230,          // how fast Pac-Man runs, in pixels per second
  coinGap: 32,         // distance between coins in px
  laneGap: 44,         // how far the top and bottom lanes sit from the name, in px
  ghostColors: ['#ff2e97', '#19f9ff', '#ff8a3d'], // one color per ghost (3 colors = 3 ghosts)
  ghostDelay: 1.6,     // seconds between Pac-Man and the first ghost
  ghostSpacing: 0.5,   // seconds between each ghost
  pause: 1,            // empty-screen pause (seconds) before the scene restarts
  respawnDelay: 0.75,  // seconds after the last ghost passes a spot before its coin reappears
  offscreen: 70        // how far past the screen edges the lanes extend, in px
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
   Pac-Man scene: coins, Pac-Man and ghosts all follow one path, which is
   measured from the name in the hero (top lane, drop through the gap
   between the words, bottom lane).
   --------------------------------------------------------------------- */
(function(){
  var layer=document.getElementById('arcade');
  var nameEl=document.getElementById('name');
  if(!layer||!nameEl)return;
  var w1=nameEl.querySelector('.w1'),w2=nameEl.querySelector('.w2');
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

  var coins=[],next=0,back=0,t=0,T=1,visible=true,last=0;
  var W,x0,yTop,drop,dT,turnX,L;

  // Position, and direction, of a point d pixels along the path.
  function pointAt(d){
    if(d<=dT)return {x:x0+d,y:yTop,dx:1,dy:0};                          // top lane, heading right
    if(d<=dT+drop)return {x:turnX,y:yTop+(d-dT),dx:0,dy:1};             // down through the gap
    return {x:turnX+(d-dT-drop),y:yTop+drop,dx:1,dy:0};                 // bottom lane, heading right
  }

  function build(){
    coins.forEach(function(c){layer.removeChild(c.el);});coins=[];
    var heroEl=layer.parentNode,tiltEl=nameEl.parentNode,hT=heroEl.style.transform;
    heroEl.style.transform='none';tiltEl.style.transform='none';        // measure without the 3D tilt
    var lr=layer.getBoundingClientRect(),nr=nameEl.getBoundingClientRect();
    var a=w1.getBoundingClientRect(),b=w2.getBoundingClientRect();
    heroEl.style.transform=hT;tiltEl.style.transform='';
    W=lr.width;
    var gapX=(a.right+b.left)/2-lr.left;                                // middle of the space between the words
    yTop=nr.top-lr.top-C.laneGap;
    x0=-C.offscreen;
    var n1=Math.max(1,Math.round((gapX-x0)/C.coinGap));
    var gap=(gapX-x0)/n1;                                               // coin spacing, nudged so the drop lands exactly in the middle of the gap
    dT=n1*gap;turnX=gapX;
    drop=Math.max(1,Math.round((nr.bottom-lr.top+C.laneGap-yTop)/gap))*gap;
    L=dT+drop+(W+C.offscreen-turnX);                                    // total path length
    for(var d=gap;d<=L;d+=gap){
      var p=pointAt(d);
      if(p.x<8||p.x>W-8)continue;
      var el=document.createElement('div');el.className='coin';
      el.style.left=p.x+'px';el.style.top=p.y+'px';layer.appendChild(el);
      coins.push({el:el,d:d});
    }
    var tail=(C.ghostDelay+(ghosts.length-1)*C.ghostSpacing)*C.speed;   // lets the last ghost leave too
    T=(L+tail)/C.speed+C.pause;
    t=0;next=0;back=0;
    render(reduce?L*0.45/C.speed:0);
    layer.classList.add('ready');
  }

  function render(time){
    var D=time*C.speed,p=pointAt(D);
    pac.style.transform='translate('+p.x+'px,'+p.y+'px) rotate('+(p.dy>0?90:0)+'deg)';
    while(next<coins.length&&coins[next].d<=D){coins[next].el.classList.add('eaten');next++;}
    var lastD=D-(C.ghostDelay+(ghosts.length-1)*C.ghostSpacing+C.respawnDelay)*C.speed;   // just behind the last ghost
    while(back<next&&coins[back].d<=lastD){coins[back].el.classList.remove('eaten');back++;}   // its coin comes back
    ghosts.forEach(function(g,i){
      var q=pointAt(D-(C.ghostDelay+i*C.ghostSpacing)*C.speed);
      g.el.style.transform='translate('+q.x+'px,'+q.y+'px)';
      g.pupils.setAttribute('transform','translate('+(q.dx*1.8)+' '+(q.dy*1.8)+')');
    });
  }

  function restart(){
    coins.forEach(function(c){c.el.classList.remove('eaten');});
    next=0;back=0;t=0;
  }

  function frame(now){
    var dt=Math.min((now-last)/1000,.05);last=now;
    if(visible){t+=dt;if(t>=T)restart();render(t);}
    requestAnimationFrame(frame);
  }

  var timer;
  function rebuildSoon(){clearTimeout(timer);timer=setTimeout(build,120);}
  if('ResizeObserver' in window){var ro=new ResizeObserver(rebuildSoon);ro.observe(layer);ro.observe(nameEl);}
  if(document.fonts){                                                   // the name moves a little once the pixel font loads
    if(document.fonts.ready)document.fonts.ready.then(rebuildSoon);
    if(document.fonts.addEventListener)document.fonts.addEventListener('loadingdone',rebuildSoon);
  }
  build();
  if(reduce)return;
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(e){visible=e[0].isIntersecting;}).observe(layer);
  }
  last=performance.now();
  requestAnimationFrame(frame);
})();

/* ---------------------------------------------------------------------
   Immersive layer: fly-through floor, section 3D entrances, tickers,
   hero name tilt, card tilt. Numbers worth tweaking are marked.
   --------------------------------------------------------------------- */
(function(){
  var FX={ drift:22,          // idle forward speed of the floor, px per second
           scrollBoost:0.8,   // how much scrolling pushes the floor forward
           enterTilt:16,      // degrees a section leans back before it stands up
           enterRise:80,      // px a section rises as it arrives
           tickerSpeed:0.8,   // base ticker speed
           tickerBoost:0.9 }; // extra ticker speed while scrolling
  var doc=document.documentElement;doc.classList.add('js');
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var grid=document.querySelector('.grid');
  var secs=[].slice.call(document.querySelectorAll('main > .hero, main > section'));
  var hero=document.querySelector('.hero'),tilt=document.querySelector('.name3d');

  // level intros: headings reveal when their section arrives
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){[].forEach.call(e.target.querySelectorAll('h2'),function(h){h.classList.add('in');});io.unobserve(e.target);}});},{threshold:.15});
  [].forEach.call(document.querySelectorAll('section'),function(s){[].forEach.call(s.querySelectorAll('h2'),function(h){h.classList.add('rv');});io.observe(s);});

  // in-page links: scroll to the level band ourselves, because the browser would aim at a section's tilted position
  [].forEach.call(document.querySelectorAll('a[href^="#"]'),function(a){
    a.addEventListener('click',function(ev){
      var id=a.getAttribute('href').slice(1),el=id==='top'?null:document.getElementById(id);
      if(id!=='top'&&!el)return;
      ev.preventDefault();
      var band=el&&el.previousElementSibling&&el.previousElementSibling.classList.contains('ticker')?el.previousElementSibling:el;
      window.scrollTo({top:el?Math.max(0,band.offsetTop-72):0,behavior:reduce?'auto':'smooth'});
      try{history.replaceState(null,'','#'+id);}catch(err){}
    });
  });

  // tickers
  var tickers=[].slice.call(document.querySelectorAll('.ticker')).map(function(el,i){
    return {el:el,track:document.createElement('div'),dir:i%2?-1:1,pos:i*137,uw:1};
  });
  function fill(){tickers.forEach(function(t){
    var item='<span class="it"><span class="lv">'+t.el.getAttribute('data-level')+'</span><span class="nm">'+t.el.getAttribute('data-name')+'</span></span>';
    t.track.className='track';t.el.appendChild(t.track);
    t.track.innerHTML='<span class="u">'+item+'</span>';
    var w=t.track.firstChild.offsetWidth||300,n=Math.ceil(innerWidth*1.15/w)+1,rep=new Array(n+1).join(item);
    t.track.innerHTML='<span class="u">'+rep+'</span><span class="u">'+rep+'</span>';
    t.uw=t.track.firstChild.offsetWidth||1;
  });}
  fill();
  window.addEventListener('resize',fill);
  if(document.fonts&&document.fonts.addEventListener)document.fonts.addEventListener('loadingdone',fill);

  // card tilt + glare
  [].forEach.call(document.querySelectorAll('.card:not(.ph)'),function(c){
    c.addEventListener('pointermove',function(e){
      if(reduce||e.pointerType!=='mouse'||c.classList.contains('open'))return;
      var r=c.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;
      c.style.setProperty('--rx',((.5-py)*12)+'deg');c.style.setProperty('--ry',((px-.5)*14)+'deg');
      c.style.setProperty('--gx',(px*100)+'%');c.style.setProperty('--gy',(py*100)+'%');
    });
    c.addEventListener('pointerleave',function(){['--rx','--ry','--gx','--gy'].forEach(function(p){c.style.removeProperty(p);});});
  });

  // hero name tilt toward the cursor (gentle sway when idle)
  var tx=0,ty=0,ttx=0,tty=0,lastMove=-1e9;
  hero.addEventListener('pointermove',function(e){
    if(e.pointerType!=='mouse')return;
    var r=hero.getBoundingClientRect();
    ttx=((e.clientY-r.top)/r.height-.5)*-8;tty=((e.clientX-r.left)/r.width-.5)*10;lastMove=performance.now();
  });
  hero.addEventListener('pointerleave',function(){lastMove=-1e9;});

  function clamp(v){return v<0?0:v>1?1:v;}
  var prev=performance.now(),lastY=window.scrollY,vel=0,fly=0;
  function loop(now){
    var dt=Math.min(now-prev,50);prev=now;
    var sy=window.scrollY,dy=sy-lastY;lastY=sy;
    vel+=(Math.abs(dy)-vel)*.15;
    fly+=FX.drift*dt/1000+dy*FX.scrollBoost;
    grid.style.transform='translateY('+(((fly%96)+96)%96)+'px)';

    var vh=window.innerHeight;
    secs.forEach(function(s){
      var top=s.offsetTop-sy,bottom=top+s.offsetHeight;
      var e=Math.min(clamp((top-vh*.38)/(vh*.62)),clamp((bottom-vh)/(vh*.3))),x=clamp((120-bottom)/(vh*.5));
      if(e<.003&&x<.003){s.style.transform='';s.style.opacity='';return;}
      s.style.transform='perspective(1100px) translateY('+(e*FX.enterRise)+'px) rotateX('+(e*FX.enterTilt-x*8)+'deg)';
      s.style.opacity=Math.max(0,1-e*.7-x*.6);
    });

    tickers.forEach(function(t){
      t.pos+=t.dir*(FX.tickerSpeed+vel*FX.tickerBoost)*dt/16.7;
      t.track.style.transform='translateX('+(-(((t.pos%t.uw)+t.uw)%t.uw))+'px)';
    });

    if(now-lastMove>2500){ttx=Math.sin(now/2300)*1.6;tty=Math.sin(now/3100)*3.2;}
    tx+=(ttx-tx)*.08;ty+=(tty-ty)*.08;
    tilt.style.setProperty('--tx',tx+'deg');tilt.style.setProperty('--ty',ty+'deg');
    requestAnimationFrame(loop);
  }
  if(!reduce)requestAnimationFrame(loop);
})();

/* ---------------------------------------------------------------------
   Zoom transition: the hero stays pinned while you scroll, and zooms into
   the slit between the K and the A of KARMAN; "Level 02" grows out of it.
   --------------------------------------------------------------------- */
var ZOOM = {
  endScale: 24,   // how far the hero zooms in before it's gone (bigger = deeper dive)
  gapAt: 0.97,    // where the zoom aims inside the K (1 = right edge of the K, 0.9 = a bit further left). Nudge this if the aim looks off.
  aimY: 0.5,      // vertical aim: 0 = top of the name, 0.5 = middle, 1 = bottom
  fadeFrom: 0.5   // how far into the zoom (0 to 1) the hero starts fading out
  // how long the zoom lasts: change 120vh in style.css (.zone height)
};
(function(){
  var zone=document.getElementById('zone');
  if(!zone)return;
  var stage=zone.querySelector('.stage'),hero=zone.querySelector('.hero'),lvl2=zone.querySelector('.lvl2'),hint=zone.querySelector('.scrollhint');
  var nameEl=document.getElementById('name'),header=document.querySelector('header');
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce){zone.classList.add('flat');return;}
  var fx=0,fy=0,queued=false;

  function measure(){
    var tilt=nameEl.parentNode,ht=hero.style.transform,tt=tilt.style.transform;
    hero.style.transform='none';tilt.style.transform='none';                // measure without zoom or tilt
    zone.style.setProperty('--hh',header.offsetHeight+'px');
    var hr=hero.getBoundingClientRect(),nr=nameEl.getBoundingClientRect();
    var node=nameEl.querySelector('.w2').firstChild,r=document.createRange();
    r.setStart(node,0);r.setEnd(node,1);                                    // the K
    var kr=r.getBoundingClientRect(),em=parseFloat(getComputedStyle(nameEl).fontSize);
    fx=kr.right-hr.left-(1-ZOOM.gapAt)*em;                                  // the slit between K and A
    fy=nr.top-hr.top+nr.height*ZOOM.aimY;                                // height of the aim point on the tall letters
    hero.style.transform=ht;tilt.style.transform=tt;
    stage.style.setProperty('--fx',fx+'px');stage.style.setProperty('--fy',fy+'px');
    update();
  }

  function update(){
    queued=false;
    var zd=zone.offsetHeight-stage.offsetHeight;
    var p=zd>0?Math.min(1,Math.max(0,window.scrollY/zd)):0;
    hero.style.transform=p<.0005?'':'scale('+Math.pow(ZOOM.endScale,p)+')';
    hero.style.opacity=p<ZOOM.fadeFrom?'':String(Math.max(0,1-(p-ZOOM.fadeFrom)/(0.9-ZOOM.fadeFrom)));
    hero.style.pointerEvents=p>.3?'none':'';
    var q=Math.min(1,Math.max(0,(p-.3)/.7)),e=1-Math.pow(1-q,3);           // level card: grows out of the slit, then glides to center
    lvl2.style.left=(fx+(stage.clientWidth/2-fx)*e)+'px';
    lvl2.style.top=(fy+(stage.clientHeight/2-fy)*e)+'px';
    lvl2.style.transform='translate(-50%,-50%) scale('+(0.02+0.98*e)+')';
    lvl2.style.opacity=Math.min(1,q*3);
    hint.style.opacity=Math.max(0,1-p*6);
  }
  function queue(){if(!queued){queued=true;requestAnimationFrame(update);}}

  window.addEventListener('scroll',queue,{passive:true});
  var t;window.addEventListener('resize',function(){clearTimeout(t);t=setTimeout(measure,120);});
  if(document.fonts&&document.fonts.addEventListener)document.fonts.addEventListener('loadingdone',function(){setTimeout(measure,150);});
  window.addEventListener('load',function(){setTimeout(measure,200);});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){setTimeout(measure,150);});
  measure();
})();