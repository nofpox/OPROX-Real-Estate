/**
 * City3DView — web (iframe shim, Metro picks this over City3DView.tsx on web)
 * Uses the same self-contained WebGL HTML as the native version.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
// Import shared HTML from native file — same content, no CDN deps
// We inline it here to keep Metro's platform split clean.

interface Props {
  onReady?: () => void;
}

export default function City3DView({ onReady }: Props) {
  React.useEffect(() => {
    const t = setTimeout(() => onReady?.(), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <iframe
        title="OPROX 3D City"
        srcDoc={CITY_HTML_WEB}
        style={{ width: "100%", height: "100%", border: "none", background: "#050a18" }}
        allow="accelerometer; autoplay"
      />
    </View>
  );
}

/* Same self-contained WebGL city — copied here for web platform build */
const CITY_HTML_WEB = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#050a18;font-family:-apple-system,system-ui,Arial,sans-serif}
canvas{display:block;width:100%;height:100%}
#lbl{position:absolute;top:16px;left:50%;transform:translateX(-50%);background:rgba(0,5,28,0.88);border:1px solid rgba(0,120,255,0.5);color:#5ab4ff;border-radius:12px;padding:6px 18px;font-size:12px;font-weight:700;letter-spacing:1px;pointer-events:none;white-space:nowrap}
#backBtn{position:absolute;top:16px;left:16px;background:rgba(0,10,40,0.9);border:1.5px solid rgba(0,120,255,0.5);color:#7bc8ff;border-radius:22px;padding:9px 20px;font-size:13px;cursor:pointer;display:none;font-weight:700}
#info{position:absolute;top:16px;right:16px;background:rgba(0,5,28,0.94);border:1.5px solid rgba(0,120,255,0.4);border-radius:18px;padding:14px 18px;min-width:150px;display:none;color:#fff;font-size:12px;line-height:1.8}
#info h3{font-size:14px;font-weight:800;color:#3aa0ff;margin-bottom:6px}
#tip{position:absolute;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(0,5,28,0.9);border:1px solid rgba(0,100,255,0.4);color:#aad4ff;border-radius:14px;padding:6px 16px;font-size:12px;pointer-events:none;display:none;white-space:nowrap}
#chatResp{position:absolute;bottom:90px;left:14px;right:14px;background:rgba(0,5,30,0.94);border:1.5px solid rgba(0,100,255,0.4);border-radius:14px;padding:10px 14px;color:#6bc8ff;font-size:13px;display:none}
#chatbar{position:absolute;bottom:0;left:0;right:0;background:rgba(2,5,22,0.96);border-top:1.5px solid rgba(0,120,255,0.3);padding:10px 14px 22px;display:flex;gap:10px;align-items:center}
#inp{flex:1;background:rgba(0,80,255,0.08);border:1.5px solid rgba(0,120,255,0.4);border-radius:24px;padding:10px 16px;color:#fff;font-size:14px;outline:none}
#inp::placeholder{color:rgba(120,160,255,0.4)}
#sendBtn{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#0055ff,#0099ff);border:none;cursor:pointer;flex-shrink:0}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="lbl">OPROX 3D · مدينة الرياض</div>
<button id="backBtn" onclick="goBack()">← العودة</button>
<div id="info"><h3 id="iTitle"></h3><div id="iBody"></div></div>
<div id="tip"></div>
<div id="chatResp"></div>
<div id="chatbar">
  <input id="inp" type="text" placeholder="اكتب: ٢ غرف • 3 bedrooms • فيلا ..."/>
  <button id="sendBtn" onclick="doChat()">▶</button>
</div>
<script>
(function(){
'use strict';
var cv=document.getElementById('c');
cv.width=window.innerWidth;cv.height=window.innerHeight;
var gl=cv.getContext('webgl')||cv.getContext('experimental-webgl');
if(!gl){document.body.innerHTML='<div style="color:#5ab4ff;text-align:center;padding:40px;font-size:18px">⚠️ WebGL غير مدعوم</div>';return;}
var VS='attribute vec3 aP;attribute vec3 aC;uniform mat4 uM;varying vec3 vC;void main(){gl_Position=uM*vec4(aP,1.0);vC=aC;}';
var FS='precision mediump float;varying vec3 vC;void main(){gl_FragColor=vec4(vC,1.0);}';
function mkS(t,src){var s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);return s;}
var prog=gl.createProgram();gl.attachShader(prog,mkS(gl.VERTEX_SHADER,VS));gl.attachShader(prog,mkS(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);gl.useProgram(prog);
var aP2=gl.getAttribLocation(prog,'aP'),aC2=gl.getAttribLocation(prog,'aC'),uM=gl.getUniformLocation(prog,'uM');
gl.enableVertexAttribArray(aP2);gl.enableVertexAttribArray(aC2);
function mul(a,b){var o=new Float32Array(16);for(var c=0;c<4;c++)for(var r=0;r<4;r++){var s=0;for(var k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}return o;}
function norm3(v){var l=Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2])||1;return[v[0]/l,v[1]/l,v[2]/l];}
function cross3(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function dot3(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function persp(fov,asp,n,f){var t=1/Math.tan(fov/2);return new Float32Array([t/asp,0,0,0,0,t,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0]);}
function lookAt(eye,ctr){var fz=norm3([eye[0]-ctr[0],eye[1]-ctr[1],eye[2]-ctr[2]]);var rx=norm3(cross3([0,1,0],fz));var ry=cross3(fz,rx);return new Float32Array([rx[0],ry[0],fz[0],0,rx[1],ry[1],fz[1],0,rx[2],ry[2],fz[2],0,-dot3(rx,eye),-dot3(ry,eye),-dot3(fz,eye),1]);}
var cityVerts=[],BUILDINGS=[],highlightedIdxs=[];
var _s=12345;function rand(){_s=(_s*1664525+1013904223)>>>0;return _s/4294967296;}
function addQ(ax,ay,az,bx,by,bz,cx2,cy,cz,dx,dy,dz,r,g,b){cityVerts.push(ax,ay,az,r,g,b,bx,by,bz,r,g,b,cx2,cy,cz,r,g,b,ax,ay,az,r,g,b,cx2,cy,cz,r,g,b,dx,dy,dz,r,g,b);}
function addBox(cx,cz,w,h,d,r,g,b){var x0=cx-w/2,x1=cx+w/2,z0=cz-d/2,z1=cz+d/2;var tr=Math.min(1,r*1.35+0.05),tg=Math.min(1,g*1.25+0.05),tb=Math.min(1,b*1.15+0.1);addQ(x0,h,z0,x1,h,z0,x1,h,z1,x0,h,z1,tr,tg,tb);addQ(x0,0,z1,x1,0,z1,x1,h,z1,x0,h,z1,r,g,b);addQ(x1,0,z0,x0,0,z0,x0,h,z0,x1,h,z0,r*0.6,g*0.6,b*0.7);addQ(x1,0,z1,x1,0,z0,x1,h,z0,x1,h,z1,r*0.8,g*0.8,b*0.88);addQ(x0,0,z0,x0,0,z1,x0,h,z1,x0,h,z0,r*0.7,g*0.7,b*0.8);}
addQ(-250,0,-250,250,0,-250,250,0,250,-250,0,250,0.02,0.04,0.07);
for(var gi=-6;gi<=6;gi++){addQ(gi*16-0.15,0.02,-250,gi*16+0.15,0.02,-250,gi*16+0.15,0.02,250,gi*16-0.15,0.02,250,0.0,0.06,0.2);addQ(-250,0.02,gi*16-0.15,250,0.02,gi*16-0.15,250,0.02,gi*16+0.15,-250,0.02,gi*16+0.15,0.0,0.06,0.2);}
var TYPES=['apartment','apartment','apartment','villa','commercial'];
for(var row=0;row<11;row++){for(var col=0;col<11;col++){if(rand()<0.12)continue;var bx=(col-5)*16,bz=(row-5)*16;var tower=rand()<0.18;var w=tower?3+rand()*4:4+rand()*5;var d=tower?3+rand()*4:4+rand()*5;var h=tower?18+rand()*36:3+rand()*14;var cx=bx+(rand()-0.5)*(8-w);var cz2=bz+(rand()-0.5)*(8-d);var beds=Math.floor(rand()*5)+1;var type=TYPES[Math.floor(rand()*5)];var grey=0.22+rand()*0.28;var br=grey*0.55,bg2=grey*0.70,bb=Math.min(1,grey+0.28);addBox(cx,cz2,w,h,d,br,bg2,bb);var wR=Math.max(1,Math.floor(h/3.8)),wC=Math.max(1,Math.floor(w/1.8));for(var wr=0;wr<wR;wr++){for(var wc=0;wc<wC;wc++){if(rand()>0.55)continue;var wx=cx-w/2+(wc+0.5)*(w/wC);var wy=1.6+wr*3.8;var ws=0.24,wh2=0.55;addQ(wx-ws,wy,cz2+d/2+0.06,wx+ws,wy,cz2+d/2+0.06,wx+ws,wy+wh2,cz2+d/2+0.06,wx-ws,wy+wh2,cz2+d/2+0.06,0.0,0.55,1.0);if(rand()>0.5)addQ(cx+w/2+0.06,wy,cz2+ws,cx+w/2+0.06,wy,cz2-ws,cx+w/2+0.06,wy+wh2,cz2-ws,cx+w/2+0.06,wy+wh2,cz2+ws,0.0,0.45,0.9);}}BUILDINGS.push({cx:cx,cz:cz2,w:w,h:h,d:d,beds:beds,type:type,floors:Math.ceil(h/3)});}}
var citiBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,citiBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(cityVerts),gl.STATIC_DRAW);var totalVerts=cityVerts.length/6;
var hlBuf=gl.createBuffer();var hlVerts=0;
function rebuildHL(){if(!highlightedIdxs.length){hlVerts=0;return;}var hd=[];highlightedIdxs.forEach(function(i){var b=BUILDINGS[i];var x0=b.cx-b.w/2,x1=b.cx+b.w/2,z0=b.cz-b.d/2,z1=b.cz+b.d/2,h=b.h;[[x0,0,z1,x1,0,z1,x1,h,z1,x0,h,z1],[x1,0,z0,x0,0,z0,x0,h,z0,x1,h,z0],[x1,0,z1,x1,0,z0,x1,h,z0,x1,h,z1],[x0,0,z0,x0,0,z1,x0,h,z1,x0,h,z0],[x0,h,z0,x1,h,z0,x1,h,z1,x0,h,z1]].forEach(function(f){hd.push(f[0],f[1],f[2],0.8,0.55,0.0,f[3],f[4],f[5],0.8,0.55,0.0,f[6],f[7],f[8],0.8,0.55,0.0,f[0],f[1],f[2],0.8,0.55,0.0,f[6],f[7],f[8],0.8,0.55,0.0,f[9],f[10],f[11],0.8,0.55,0.0);});});gl.bindBuffer(gl.ARRAY_BUFFER,hlBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(hd),gl.DYNAMIC_DRAW);hlVerts=hd.length/6;}
var theta=0.55,phi=0.38,radius=92,TARGET=[0,0,0];
function camPos(){return[radius*Math.sin(phi)*Math.sin(theta)+TARGET[0],radius*Math.cos(phi)+5+TARGET[1],radius*Math.sin(phi)*Math.cos(theta)+TARGET[2]];}
var STATE='city',flyFrom=null,flyTo=null,flyP=0,selB=null;
var savedSph={theta:0.55,phi:0.38,radius:92};
function lerp3(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
function ease(t){return 1-Math.pow(1-t,3);}
var FOV=Math.PI/3.6,tanHalf=Math.tan(FOV/2);
function rayAABB(ox,oy,oz,dx,dy,dz,x0,y0,z0,x1,y1,z1){var ix=1/dx,iy=1/dy,iz=1/dz;var txa=(x0-ox)*ix,txb=(x1-ox)*ix;var tya=(y0-oy)*iy,tyb=(y1-oy)*iy;var tza=(z0-oz)*iz,tzb=(z1-oz)*iz;var tmin=Math.max(Math.min(txa,txb),Math.min(tya,tyb),Math.min(tza,tzb));var tmax=Math.min(Math.max(txa,txb),Math.max(tya,tyb),Math.max(tza,tzb));return tmax>=tmin&&tmax>0?tmin:-1;}
function pick(sx,sy){var eye=camPos();var fz=norm3([eye[0]-TARGET[0],eye[1]-TARGET[1]-5,eye[2]-TARGET[2]]);var rx=norm3(cross3([0,1,0],fz));var ry=cross3(fz,rx);var ndcx=(2*sx/cv.width-1)*tanHalf*(cv.width/cv.height);var ndcy=(1-2*sy/cv.height)*tanHalf;var dir=norm3([rx[0]*ndcx+ry[0]*ndcy-fz[0],rx[1]*ndcx+ry[1]*ndcy-fz[1],rx[2]*ndcx+ry[2]*ndcy-fz[2]]);var bestT=1e9,bestB=null;for(var i=0;i<BUILDINGS.length;i++){var b=BUILDINGS[i];var t=rayAABB(eye[0],eye[1],eye[2],dir[0],dir[1],dir[2],b.cx-b.w/2,0,b.cz-b.d/2,b.cx+b.w/2,b.h,b.cz+b.d/2);if(t>0&&t<bestT){bestT=t;bestB=b;}}return bestB;}
function flyTo2(b){if(STATE==='flying')return;selB=b;STATE='flying';flyP=0;var eye=camPos();savedSph={theta:theta,phi:phi,radius:radius};flyFrom={eye:eye};flyTo={eye:[b.cx,b.h/2+1.5,b.cz+b.d/2+4],look:[b.cx,b.h/2,b.cz]};var nType={apartment:'شقة',villa:'فيلا',commercial:'تجاري'};document.getElementById('iTitle').textContent=(nType[b.type]||b.type)+' · '+b.beds+' غرف';document.getElementById('iBody').innerHTML=b.floors+' طوابق<br>جارٍ الطيران...';document.getElementById('info').style.display='block';document.getElementById('backBtn').style.display='block';document.getElementById('lbl').style.display='none';}
window.goBack=function(){if(STATE==='city')return;STATE='city';flyP=0;theta=savedSph.theta;phi=savedSph.phi;radius=savedSph.radius;TARGET=[0,0,0];selB=null;highlightedIdxs=[];rebuildHL();document.getElementById('backBtn').style.display='none';document.getElementById('info').style.display='none';document.getElementById('lbl').style.display='block';};
var BEDMAP={'1':1,'2':2,'3':3,'4':4,'5':5,'one':1,'two':2,'three':3,'four':4,'five':5,'١':1,'٢':2,'٣':3,'٤':4,'٥':5,'واحد':1,'اثنين':2,'ثلاث':3,'أربع':4,'خمس':5,'غرفتين':2};
window.doChat=function(){var inp=document.getElementById('inp');var text=inp.value.trim();inp.value='';if(!text)return;var low=text.toLowerCase();var beds=null,tp=null;var nm=low.match(/(\\d+)\\s*(bed|room|غرف|غرفة)/);if(nm)beds=parseInt(nm[1]);if(!beds){for(var k in BEDMAP){if(low.indexOf(k)!==-1){beds=BEDMAP[k];break;}}}if(low.indexOf('villa')!==-1||low.indexOf('فيلا')!==-1)tp='villa';if(low.indexOf('apartment')!==-1||low.indexOf('شقة')!==-1)tp='apartment';if(low.indexOf('commercial')!==-1||low.indexOf('تجاري')!==-1)tp='commercial';var matches=BUILDINGS.reduce(function(a,b,i){if(beds&&b.beds!==beds)return a;if(tp&&b.type!==tp)return a;return a.concat(i);},[]);var resp=document.getElementById('chatResp');if(!matches.length){resp.textContent='لا توجد نتائج — جرّب: "٢ غرف" أو "فيلا" أو "3 bedrooms"';resp.style.display='block';setTimeout(function(){resp.style.display='none';},3500);return;}highlightedIdxs=matches;rebuildHL();resp.textContent='وجدنا '+matches.length+' عقار'+(beds?' · '+beds+' غرف':'')+' — الطيران...';resp.style.display='block';setTimeout(function(){resp.style.display='none';},4000);flyTo2(BUILDINGS[matches[0]]);};
document.getElementById('inp').addEventListener('keydown',function(e){if(e.key==='Enter')window.doChat();});
var drag2=false,prevT2={x:0,y:0},pinchD=null;
cv.addEventListener('mousedown',function(e){if(STATE!=='city')return;drag2=true;prevT2={x:e.clientX,y:e.clientY};});
window.addEventListener('mouseup',function(){drag2=false;});
window.addEventListener('mousemove',function(e){if(!drag2||STATE!=='city')return;theta-=(e.clientX-prevT2.x)/cv.width*Math.PI*1.8;phi=Math.max(0.1,Math.min(1.45,phi+(e.clientY-prevT2.y)/cv.height*Math.PI));prevT2={x:e.clientX,y:e.clientY};});
cv.addEventListener('wheel',function(e){if(STATE!=='city')return;radius=Math.max(18,Math.min(200,radius+e.deltaY*0.1));},{passive:true});
var tStart3=null;
cv.addEventListener('touchstart',function(e){if(e.touches.length===1&&STATE==='city'){drag2=true;tStart3={x:e.touches[0].clientX,y:e.touches[0].clientY};prevT2={x:e.touches[0].clientX,y:e.touches[0].clientY};}if(e.touches.length===2){pinchD=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);}},{passive:true});
cv.addEventListener('touchend',function(e){if(e.changedTouches.length===1&&tStart3&&STATE==='city'){var dx=Math.abs(e.changedTouches[0].clientX-tStart3.x);var dy2=Math.abs(e.changedTouches[0].clientY-tStart3.y);if(dx<12&&dy2<12){var b=pick(e.changedTouches[0].clientX,e.changedTouches[0].clientY);if(b)flyTo2(b);}}drag2=false;tStart3=null;pinchD=null;},{passive:true});
cv.addEventListener('touchmove',function(e){if(e.touches.length===1&&drag2&&STATE==='city'){theta-=(e.touches[0].clientX-prevT2.x)/cv.width*Math.PI*2.0;phi=Math.max(0.1,Math.min(1.45,phi+(e.touches[0].clientY-prevT2.y)/cv.height*Math.PI));prevT2={x:e.touches[0].clientX,y:e.touches[0].clientY};}if(e.touches.length===2&&pinchD!=null){var nd=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);radius=Math.max(18,Math.min(200,radius*(pinchD/nd)));pinchD=nd;}},{passive:true});
cv.addEventListener('click',function(e){if(STATE==='city'){var b=pick(e.clientX,e.clientY);if(b)flyTo2(b);}});
cv.addEventListener('mousemove',function(e){if(STATE!=='city'){document.getElementById('tip').style.display='none';return;}var b=pick(e.clientX,e.clientY);var tip=document.getElementById('tip');if(b){var n={apartment:'شقة',villa:'فيلا',commercial:'تجاري'};tip.textContent=(n[b.type]||b.type)+' · '+b.beds+' غرف · '+b.floors+' طوابق';tip.style.display='block';}else tip.style.display='none';});
function resize(){cv.width=window.innerWidth;cv.height=window.innerHeight;gl.viewport(0,0,cv.width,cv.height);}
window.addEventListener('resize',resize);
gl.enable(gl.DEPTH_TEST);gl.clearColor(0.018,0.035,0.09,1);
var proj=persp(FOV,cv.width/cv.height,0.5,600);
var eyeNow=camPos(),lookNow=TARGET.slice();
var last=performance.now();
function animate(){
  requestAnimationFrame(animate);
  var now=performance.now(),dt=Math.min((now-last)/1000,0.05);last=now;
  if(STATE==='flying'){flyP=Math.min(1,flyP+dt*0.7);var e3=ease(flyP);eyeNow=lerp3(flyFrom.eye,flyTo.eye,e3);lookNow=lerp3(flyFrom.eye,flyTo.look,e3);if(flyP>=1){STATE='room';document.getElementById('iBody').innerHTML=selB.floors+' طوابق<br>عرض الغرفة الداخلية';}}
  else if(STATE==='city'){var cp=camPos();eyeNow[0]+=(cp[0]-eyeNow[0])*0.12;eyeNow[1]+=(cp[1]-eyeNow[1])*0.12;eyeNow[2]+=(cp[2]-eyeNow[2])*0.12;lookNow[0]+=(TARGET[0]-lookNow[0])*0.12;lookNow[1]+=(TARGET[1]+2-lookNow[1])*0.12;lookNow[2]+=(TARGET[2]-lookNow[2])*0.12;}
  else if(STATE==='room'&&selB){var t2=now*0.001;lookNow[0]=selB.cx+Math.sin(t2*0.3)*1.5;lookNow[1]=selB.h/2+Math.sin(t2*0.4)*0.3;lookNow[2]=selB.cz+Math.cos(t2*0.25)*1.5;}
  proj=persp(FOV,cv.width/cv.height,0.5,600);
  var view=lookAt(eyeNow,lookNow);var mvp=mul(proj,view);
  gl.uniformMatrix4fv(uM,false,mvp);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.bindBuffer(gl.ARRAY_BUFFER,citiBuf);gl.vertexAttribPointer(aP2,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(aC2,3,gl.FLOAT,false,24,12);gl.drawArrays(gl.TRIANGLES,0,totalVerts);
  if(hlVerts>0){gl.bindBuffer(gl.ARRAY_BUFFER,hlBuf);gl.vertexAttribPointer(aP2,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(aC2,3,gl.FLOAT,false,24,12);gl.drawArrays(gl.TRIANGLES,0,hlVerts);}
}
animate();
try{window.parent.postMessage(JSON.stringify({type:'ready'}),'*');}catch(e){}
})();
</script>
</body>
</html>`;
