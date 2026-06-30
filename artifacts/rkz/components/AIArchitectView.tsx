/**
 * AIArchitectView — native WebView
 * Tripo3D-powered AI villa generator with 3-mode prompt system.
 * API key stored in localStorage; polls task completion natively.
 */
import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";

interface Props {
  onReady?: () => void;
}

export default function AIArchitectView({ onReady }: Props) {
  const wvRef = useRef<WebView>(null);
  function handleMessage(e: WebViewMessageEvent) {
    try {
      const d = JSON.parse(e.nativeEvent.data) as { type: string };
      if (d.type === "ready") onReady?.();
    } catch {}
  }
  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        ref={wvRef}
        /* baseUrl enables CDN script loading in Android WebView */
        source={{ html: ARCHITECT_HTML, baseUrl: "https://app.housin3d.ai" }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        onMessage={handleMessage}
        style={s.wv}
        scrollEnabled
        bounces={false}
        overScrollMode="never"
        keyboardDisplayRequiresUserAction={false}
        onLoad={() => { setTimeout(() => onReady?.(), 500); }}
      />
    </View>
  );
}

const s = StyleSheet.create({ wv: { flex: 1, backgroundColor: "#0a0f1e" } });

const ARCHITECT_HTML = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0f1e;--card:#0f1e3a;--gold:#c9a84c;--blue:#0077ff;--text:#e8eaf0;--muted:rgba(200,215,255,0.5)}
body{background:var(--bg);color:var(--text);font-family:-apple-system,system-ui,'Helvetica Neue',Arial,sans-serif;min-height:100vh;padding-bottom:32px}
h1{font-size:24px;font-weight:800}
h2{font-size:18px;font-weight:700}

/* Screens */
.screen{display:none;flex-direction:column;align-items:center;min-height:100vh;padding:0}
.screen.active{display:flex}

/* ── Screen 1: API Key ── */
#s1{justify-content:center;padding:32px 24px}
.logo-wrap{font-size:56px;margin-bottom:12px;text-align:center}
.s1-title{font-size:26px;font-weight:800;color:#fff;text-align:center;margin-bottom:6px}
.s1-sub{font-size:14px;color:var(--muted);text-align:center;line-height:1.6;margin-bottom:28px}
.key-card{background:var(--card);border:1.5px solid rgba(201,168,76,0.25);border-radius:20px;padding:24px;width:100%;max-width:420px}
.key-label{font-size:13px;color:var(--gold);font-weight:700;margin-bottom:8px}
.key-input{width:100%;background:rgba(0,0,0,0.3);border:1.5px solid rgba(201,168,76,0.3);border-radius:12px;padding:12px 16px;color:#fff;font-size:14px;outline:none;margin-bottom:14px;font-family:inherit}
.key-input:focus{border-color:var(--gold)}
.key-input::placeholder{color:var(--muted);font-size:12px}
.btn-gold{width:100%;background:linear-gradient(135deg,#c9a84c,#e4c36a);color:#0a0f1e;font-size:15px;font-weight:800;border:none;border-radius:14px;padding:15px;cursor:pointer;margin-bottom:12px}
.key-link{display:block;text-align:center;color:var(--blue);font-size:13px;text-decoration:none;opacity:0.85}
.key-link:active{opacity:0.6}
.err-msg{color:#ff6b6b;font-size:12px;text-align:center;margin-top:8px;display:none}

/* ── Screen 2: Design Form ── */
#s2{padding:0;align-items:stretch}
.form-header{background:linear-gradient(180deg,#0f1e3a 0%,rgba(15,30,58,0.0) 100%);padding:52px 20px 20px;text-align:center;position:sticky;top:0;z-index:10}
.form-title{font-size:20px;font-weight:800;color:#fff}
.form-sub{font-size:12px;color:var(--muted);margin-top:4px}
.change-key{position:absolute;left:16px;top:52px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);color:rgba(200,215,255,0.7);border-radius:20px;padding:6px 12px;font-size:11px;cursor:pointer}
.form-body{padding:0 20px;display:flex;flex-direction:column;gap:16px;flex:1}

/* Mode tabs */
.mode-tabs{display:flex;gap:8px;background:rgba(0,0,0,0.25);border-radius:16px;padding:5px}
.mode-tab{flex:1;text-align:center;padding:10px 6px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;color:var(--muted);transition:all 0.2s;border:none;background:transparent}
.mode-tab.active{background:var(--gold);color:#0a0f1e}
.mode-desc{background:var(--card);border-radius:14px;padding:12px 16px;font-size:12px;color:var(--muted);line-height:1.6;border:1px solid rgba(201,168,76,0.12)}
.mode-desc b{color:var(--gold)}

/* Prompt */
.prompt-label{font-size:12px;color:var(--gold);font-weight:700;margin-bottom:6px}
.prompt-area{width:100%;background:rgba(0,0,0,0.3);border:1.5px solid rgba(201,168,76,0.2);border-radius:16px;padding:14px 16px;color:#fff;font-size:14px;min-height:110px;outline:none;resize:none;line-height:1.6;font-family:inherit}
.prompt-area:focus{border-color:rgba(201,168,76,0.55)}
.prompt-area::placeholder{color:var(--muted);font-size:12px}
.generate-btn{background:linear-gradient(135deg,#0055ff,#0099ff);color:#fff;font-size:16px;font-weight:800;border:none;border-radius:16px;padding:17px;cursor:pointer;box-shadow:0 6px 24px rgba(0,100,255,0.35);letter-spacing:0.3px;margin-bottom:24px}
.generate-btn:active{opacity:0.85}
.generate-btn:disabled{background:rgba(100,130,200,0.3);box-shadow:none;cursor:default}

/* ── Screen 3: Loading ── */
#s3{justify-content:center;padding:40px 28px}
.loading-icon{font-size:56px;text-align:center;margin-bottom:20px;animation:spin 3s linear infinite}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.loading-title{font-size:22px;font-weight:800;color:#fff;text-align:center;margin-bottom:10px}
.loading-status{font-size:14px;color:var(--muted);text-align:center;min-height:22px;margin-bottom:24px;line-height:1.6}
.progress-bar-wrap{width:100%;max-width:360px;height:6px;background:rgba(255,255,255,0.08);border-radius:6px;overflow:hidden;margin-bottom:24px}
.progress-bar{height:100%;background:linear-gradient(90deg,#0055ff,var(--gold));border-radius:6px;width:0%;transition:width 0.8s ease}
.steps{width:100%;max-width:360px;display:flex;flex-direction:column;gap:10px}
.step{display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--card);border-radius:12px;border:1px solid transparent}
.step.done{border-color:rgba(201,168,76,0.3)}
.step.active{border-color:rgba(0,100,255,0.4);background:rgba(0,50,200,0.12)}
.step-icon{font-size:20px;width:28px;text-align:center}
.step-text{font-size:13px;font-weight:600}
.step.done .step-text{color:var(--gold)}
.step.active .step-text{color:#7bc8ff}
.step.pending .step-text{color:var(--muted)}

/* ── Screen 4: Result ── */
#s4{padding:0;align-items:stretch}
.result-header{padding:52px 20px 16px;text-align:center}
.result-title{font-size:20px;font-weight:800;color:#fff}
.result-sub{font-size:12px;color:var(--muted);margin-top:4px}
.result-body{padding:0 20px;display:flex;flex-direction:column;gap:14px}
.preview-wrap{border-radius:20px;overflow:hidden;background:var(--card);border:1.5px solid rgba(201,168,76,0.25);position:relative}
.preview-img{width:100%;aspect-ratio:1;display:block;object-fit:cover}
.preview-badge{position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.7);border:1px solid var(--gold);border-radius:20px;padding:4px 12px;font-size:11px;color:var(--gold);font-weight:700}
#viewer3d{border-radius:20px;overflow:hidden;background:var(--card);border:1.5px solid rgba(0,100,255,0.25);min-height:260px;display:flex;align-items:center;justify-content:center}
.viewer-placeholder{text-align:center;color:var(--muted);font-size:13px;padding:20px}
.viewer-placeholder .vp-icon{font-size:36px;margin-bottom:8px}
.result-meta{background:var(--card);border-radius:16px;padding:14px 16px;border:1px solid rgba(201,168,76,0.15)}
.meta-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0}
.meta-row:not(:last-child){border-bottom:1px solid rgba(255,255,255,0.06)}
.meta-label{font-size:12px;color:var(--muted)}
.meta-val{font-size:12px;font-weight:700;color:var(--gold)}
.action-row{display:flex;gap:10px;margin-bottom:8px}
.btn-outline{flex:1;background:transparent;border:1.5px solid rgba(201,168,76,0.4);color:var(--gold);font-size:13px;font-weight:700;border-radius:14px;padding:13px;cursor:pointer}
.btn-blue{flex:1;background:linear-gradient(135deg,#0055ff,#0099ff);border:none;color:#fff;font-size:13px;font-weight:700;border-radius:14px;padding:13px;cursor:pointer}
.restart-btn{width:100%;background:linear-gradient(135deg,#c9a84c,#e4c36a);color:#0a0f1e;font-size:15px;font-weight:800;border:none;border-radius:14px;padding:15px;cursor:pointer;margin-bottom:28px}
</style>
</head>
<body>

<!-- ── Screen 1: API Key ── -->
<div id="s1" class="screen">
  <div class="logo-wrap">🤖</div>
  <div class="s1-title">المعماري الذكي</div>
  <div class="s1-sub">صمّم فيلتك بالذكاء الاصطناعي في 60 ثانية<br/>يحتاج مفتاح Tripo3D مجاني</div>
  <div class="key-card">
    <div class="key-label">🔑 مفتاح API من Tripo3D</div>
    <input id="keyInput" class="key-input" type="text" placeholder="tsk_xxxxxxxxxxxxxxxxxxxxxx" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"/>
    <div class="err-msg" id="keyErr">تحقق من المفتاح وحاول مرة أخرى</div>
    <button class="btn-gold" onclick="saveKey()" style="margin-top:14px">حفظ والبدء ←</button>
    <a class="key-link" href="https://tripo3d.ai" target="_blank">احصل على مفتاح مجاني من tripo3d.ai ↗</a>
  </div>
</div>

<!-- ── Screen 2: Design Form ── -->
<div id="s2" class="screen">
  <div class="form-header">
    <button class="change-key" onclick="changeKey()">🔑 تغيير المفتاح</button>
    <div class="form-title">🤖 المعماري الذكي</div>
    <div class="form-sub">اختر الوضع واكتب وصفك ← يصمم لك AI</div>
  </div>
  <div class="form-body">
    <!-- Mode tabs -->
    <div class="mode-tabs">
      <button class="mode-tab active" id="tab-auto"   onclick="setMode('auto')">🪄 أوتو</button>
      <button class="mode-tab"        id="tab-level"  onclick="setMode('level')">📊 مستوى</button>
      <button class="mode-tab"        id="tab-manual" onclick="setMode('manual')">✍️ يدوي</button>
    </div>
    <div class="mode-desc" id="modeDesc">
      <b>أوتو:</b> اكتب أي شيء وال AI يصمم فيلا عالمية كاملة بمسبح وحديقة وديكور فاخر
    </div>
    <!-- Prompt -->
    <div>
      <div class="prompt-label" id="promptLabel">💬 أضف تفاصيل إضافية (اختياري)</div>
      <textarea id="promptInput" class="prompt-area" placeholder="مثال: فيلا سعودية فخمة بمسبح وحديقة ..."></textarea>
    </div>
    <!-- Generate -->
    <button class="generate-btn" id="genBtn" onclick="startGenerate()">✨ صمم لي الآن</button>
  </div>
</div>

<!-- ── Screen 3: Loading ── -->
<div id="s3" class="screen">
  <div class="loading-icon">⚙️</div>
  <div class="loading-title">الذكاء الاصطناعي يصمم...</div>
  <div class="loading-status" id="loadStatus">جارٍ إرسال الطلب...</div>
  <div class="progress-bar-wrap">
    <div class="progress-bar" id="progressBar"></div>
  </div>
  <div class="steps">
    <div class="step active" id="step1">
      <span class="step-icon">📡</span>
      <span class="step-text">إرسال الطلب لـ Tripo3D</span>
    </div>
    <div class="step pending" id="step2">
      <span class="step-icon">🧠</span>
      <span class="step-text">الذكاء الاصطناعي يبني الموديل</span>
    </div>
    <div class="step pending" id="step3">
      <span class="step-icon">🎨</span>
      <span class="step-text">تطبيق المواد والإضاءة</span>
    </div>
    <div class="step pending" id="step4">
      <span class="step-icon">📦</span>
      <span class="step-text">تجهيز ملف الموديل 3D</span>
    </div>
  </div>
</div>

<!-- ── Screen 4: Result ── -->
<div id="s4" class="screen">
  <div class="result-header">
    <div class="result-title">✅ اكتمل التصميم!</div>
    <div class="result-sub" id="resultPromptPreview"></div>
  </div>
  <div class="result-body">
    <!-- Preview image -->
    <div class="preview-wrap">
      <img id="previewImg" class="preview-img" src="" alt=""/>
      <div class="preview-badge">🏡 AI Villa</div>
    </div>
    <!-- 3D Viewer -->
    <div id="viewer3d">
      <div class="viewer-placeholder">
        <div class="vp-icon">⏳</div>
        <div>جارٍ تحميل العارض ثلاثي الأبعاد...</div>
      </div>
    </div>
    <!-- Meta -->
    <div class="result-meta" id="resultMeta"></div>
    <!-- Actions -->
    <div class="action-row">
      <button class="btn-outline" onclick="downloadModel()">📥 تحميل GLB</button>
      <button class="btn-blue"    onclick="openInBrowser()">🌐 فتح في المتصفح</button>
    </div>
    <button class="restart-btn" onclick="restart()">🤖 صمم مرة أخرى</button>
  </div>
</div>

<script type="module" id="mvScript"></script>
<script>
(function(){
'use strict';

// ── State ─────────────────────────────────────────────────────────────────
var apiKey = localStorage.getItem('tripo_key') || '';
var mode = 'auto';
var pollTimer = null;
var currentTaskId = null;
var resultOutput = null;

// ── Init ──────────────────────────────────────────────────────────────────
if(apiKey) show('s2'); else show('s1');

function show(id) {
  ['s1','s2','s3','s4'].forEach(function(s){
    var el=document.getElementById(s);
    el.classList.toggle('active', s===id);
  });
  window.scrollTo(0,0);
}

// ── API Key ───────────────────────────────────────────────────────────────
window.saveKey = function(){
  var v = document.getElementById('keyInput').value.trim();
  if(!v || v.length<8){ document.getElementById('keyErr').style.display='block'; return; }
  document.getElementById('keyErr').style.display='none';
  apiKey=v; localStorage.setItem('tripo_key', v); show('s2');
};
window.changeKey = function(){
  localStorage.removeItem('tripo_key'); apiKey=''; show('s1');
  document.getElementById('keyInput').value='';
};
document.getElementById('keyInput').addEventListener('keydown',function(e){if(e.key==='Enter')window.saveKey();});

// ── Modes ─────────────────────────────────────────────────────────────────
var modeDescs={
  auto:'<b>أوتو:</b> اكتب أي شيء وال AI يصمم فيلا عالمية كاملة بمسبح وحديقة وديكور فاخر — أفضل خيار',
  level:'<b>مستوى:</b> اكتب <b>فخم</b> أو <b>متوسط</b> أو <b>بسيط</b> وال AI يصمم بما يتناسب',
  manual:'<b>يدوي:</b> وصف كل غرفة بالتفصيل — المجلس، الصالة، المطبخ، ألوان، مواد...'
};
var modePlaceholders={
  auto:'مثال: فيلا سعودية بمسبح لاي نيت وحديقة كبيرة وتصميم نيو كلاسيك',
  level:'اكتب: فخم / متوسط / بسيط / luxury / standard',
  manual:'مثال: المجلس — كنبة بنية كلاسيك وثريا ذهبية.\nالصالة — مودرن رمادي وأبيض.\nالمطبخ — مفتوح حجر أبيض...'
};
var modeLabels={
  auto:'💬 أضف تفاصيل إضافية (اختياري)',
  level:'📊 اكتب المستوى المطلوب',
  manual:'✍️ صف كل غرفة بالتفصيل'
};
window.setMode = function(m){
  mode=m;
  ['auto','level','manual'].forEach(function(k){
    document.getElementById('tab-'+k).classList.toggle('active',k===m);
  });
  document.getElementById('modeDesc').innerHTML=modeDescs[m];
  document.getElementById('promptInput').placeholder=modePlaceholders[m];
  document.getElementById('promptLabel').textContent=modeLabels[m];
};

// ── Build prompt ──────────────────────────────────────────────────────────
function buildPrompt(){
  var txt = document.getElementById('promptInput').value.trim();
  if(mode==='auto')
    return 'Design a stunning world-class luxury Saudi villa, modern architecture, fully furnished interior, swimming pool, garden, 8K quality, Unreal Engine render. ' + (txt||'');
  if(mode==='level')
    return 'Design a ' + (txt||'luxury') + ' Saudi villa with fully furnished interior, pool, garden, 8K quality render';
  return 'Generate a 3D Saudi villa with this exact specification: ' + (txt||'elegant modern villa with pool and garden') + '. Do not add anything not mentioned.';
}

// ── Generate ──────────────────────────────────────────────────────────────
window.startGenerate = function(){
  var finalPrompt = buildPrompt();
  document.getElementById('genBtn').disabled=true;
  setStep(1);
  setProgress(5);
  setStatus('جارٍ إرسال الطلب...');
  show('s3');

  fetch('https://api.tripo3d.ai/v2/openapi/task',{
    method:'POST',
    headers:{'Authorization':'Bearer '+apiKey,'Content-Type':'application/json'},
    body:JSON.stringify({type:'text_to_model',prompt:finalPrompt})
  })
  .then(function(r){return r.json();})
  .then(function(data){
    if(!data.data || !data.data.task_id){
      throw new Error(data.message||'فشل إنشاء الطلب — تحقق من المفتاح');
    }
    currentTaskId = data.data.task_id;
    setStep(2); setProgress(20);
    setStatus('جارٍ بناء الموديل ثلاثي الأبعاد...');
    pollTask(currentTaskId, finalPrompt);
  })
  .catch(function(e){ showFormError(e.message||'خطأ في الاتصال'); });
};

function pollTask(taskId, prompt){
  var attempts=0;
  pollTimer = setInterval(function(){
    attempts++;
    fetch('https://api.tripo3d.ai/v2/openapi/task/'+taskId,{
      headers:{'Authorization':'Bearer '+apiKey}
    })
    .then(function(r){return r.json();})
    .then(function(data){
      if(!data.data)return;
      var st=data.data.status;
      var prog=data.data.progress||0;
      var pct=20+Math.round(prog*70);
      setProgress(pct);

      if(st==='queued'||st==='running'){
        if(pct>50)setStep(3); else setStep(2);
        setStatus('جارٍ المعالجة... '+Math.round(prog*100)+'%  ('+attempts*4+' ثانية)');
      } else if(st==='success'){
        clearInterval(pollTimer);
        setStep(4,'done'); setProgress(100);
        setStatus('اكتمل! ✅');
        setTimeout(function(){ showResult(data.data.output, prompt); }, 600);
      } else if(st==='failed'||st==='cancelled'){
        clearInterval(pollTimer);
        showFormError('فشل إنشاء الموديل — حاول مرة أخرى');
      }
    })
    .catch(function(){}); // keep polling
  }, 4000);
}

function setStatus(msg){ document.getElementById('loadStatus').textContent=msg; }
function setProgress(pct){ document.getElementById('progressBar').style.width=pct+'%'; }
function setStep(n, forceClass){
  for(var i=1;i<=4;i++){
    var el=document.getElementById('step'+i);
    var cls=i<n?'done':i===n?(forceClass||'active'):'pending';
    el.className='step '+cls;
  }
}

// ── Show result ───────────────────────────────────────────────────────────
function showResult(output, prompt){
  resultOutput=output;
  var prevUrl = output.rendered_image && output.rendered_image.url;
  var modelUrl = output.model && output.model.url;

  if(prevUrl){
    var img=document.getElementById('previewImg');
    img.src=prevUrl;
    img.style.display='block';
    img.onerror=function(){img.style.display='none';};
  }

  document.getElementById('resultPromptPreview').textContent=
    prompt.length>60?prompt.substring(0,60)+'...':prompt;

  // Meta info
  var meta='';
  if(output.model){meta+='<div class="meta-row"><span class="meta-label">صيغة الملف</span><span class="meta-val">GLB ثلاثي الأبعاد</span></div>';}
  if(currentTaskId){meta+='<div class="meta-row"><span class="meta-label">رقم المهمة</span><span class="meta-val" style="font-size:10px;letter-spacing:0">'+currentTaskId.substring(0,16)+'...</span></div>';}
  document.getElementById('resultMeta').innerHTML=meta;

  // Load model-viewer dynamically (CDN)
  if(modelUrl){
    loadModelViewer(modelUrl);
  } else {
    document.getElementById('viewer3d').innerHTML=
      '<div class="viewer-placeholder"><div class="vp-icon">⚠️</div><div>رابط الموديل غير متاح</div></div>';
  }

  show('s4');
  document.getElementById('genBtn').disabled=false;
}

function loadModelViewer(modelUrl){
  var v3d=document.getElementById('viewer3d');
  v3d.innerHTML='<div class="viewer-placeholder"><div class="vp-icon">⏳</div><div>جارٍ تحميل العارض 3D...</div></div>';

  // Dynamically load model-viewer web component
  var script=document.createElement('script');
  script.type='module';
  script.src='https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';
  script.onload=function(){
    var mv=document.createElement('model-viewer');
    mv.setAttribute('src', modelUrl);
    mv.setAttribute('auto-rotate','');
    mv.setAttribute('camera-controls','');
    mv.setAttribute('shadow-intensity','0.8');
    mv.setAttribute('environment-image','neutral');
    mv.setAttribute('exposure','1');
    mv.style.cssText='width:100%;height:280px;background:#0f1e3a;border-radius:20px;--poster-color:#0f1e3a';
    v3d.innerHTML='';
    v3d.appendChild(mv);
    // Fallback if model-viewer doesn't show in 10s
    setTimeout(function(){
      if(!mv.modelIsVisible){
        v3d.innerHTML='<div class="viewer-placeholder"><div class="vp-icon">🏡</div><div>اضغط "فتح في المتصفح" لعرض الموديل ثلاثي الأبعاد بشكل كامل</div></div>';
      }
    },10000);
  };
  script.onerror=function(){
    v3d.innerHTML='<div class="viewer-placeholder"><div class="vp-icon">🏡</div><div>اضغط "فتح في المتصفح" لعرض الموديل 3D</div></div>';
  };
  document.head.appendChild(script);
}

// ── Actions ───────────────────────────────────────────────────────────────
window.downloadModel=function(){
  var url=resultOutput&&resultOutput.model&&resultOutput.model.url;
  if(url) window.open(url,'_blank');
};
window.openInBrowser=function(){
  var url=resultOutput&&resultOutput.model&&resultOutput.model.url;
  if(url) window.open(url,'_blank');
  else if(resultOutput&&resultOutput.rendered_image) window.open(resultOutput.rendered_image.url,'_blank');
};
window.restart=function(){
  if(pollTimer)clearInterval(pollTimer);
  pollTimer=null; currentTaskId=null; resultOutput=null;
  document.getElementById('promptInput').value='';
  document.getElementById('previewImg').src='';
  document.getElementById('viewer3d').innerHTML='<div class="viewer-placeholder"><div class="vp-icon">⏳</div><div>جارٍ تحميل العارض ثلاثي الأبعاد...</div></div>';
  show('s2');
};

function showFormError(msg){
  if(pollTimer)clearInterval(pollTimer);
  pollTimer=null;
  document.getElementById('genBtn').disabled=false;
  show('s2');
  // Show error toast
  var t=document.createElement('div');
  t.textContent='⚠️ '+msg;
  t.style.cssText='position:fixed;bottom:90px;left:16px;right:16px;background:#7f1d1d;color:#fca5a5;border-radius:14px;padding:12px 16px;font-size:13px;z-index:999;text-align:center';
  document.body.appendChild(t);
  setTimeout(function(){t.remove();},4500);
}

try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));}catch(e){}
})();
</script>
</body>
</html>`;
