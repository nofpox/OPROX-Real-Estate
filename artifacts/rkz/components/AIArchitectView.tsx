/**
 * AIArchitectView — native WebView
 *
 * Props:
 *  wvRef      — forwarded ref so the parent can inject JS (for credit approval)
 *  onReady    — called once the page loads
 *  onMessage  — receives {type} strings from the HTML
 *                "ready"            → page loaded
 *                "generate_request" → user tapped Generate; parent checks credits
 *
 * Credit gate protocol (HTML ↔ Native):
 *  HTML sends    → {type:"generate_request"}
 *  Native injects → window.onGenerateApproved() | window.onGenerateRejected()
 */
import React, { type RefObject } from "react";
import { StyleSheet, View } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";

interface Props {
  wvRef?:     RefObject<WebView | null>;
  onReady?:   () => void;
  onMessage?: (type: string) => void;
}

export default function AIArchitectView({ wvRef, onReady, onMessage }: Props) {
  function handleMessage(e: WebViewMessageEvent) {
    try {
      const d = JSON.parse(e.nativeEvent.data) as { type: string };
      if (d.type === "ready") onReady?.();
      onMessage?.(d.type);
    } catch {}
  }
  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        ref={wvRef}
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
        onLoad={() => { setTimeout(() => onReady?.(), 600); }}
      />
    </View>
  );
}

const s = StyleSheet.create({ wv: { flex: 1, backgroundColor: "#0a0f1e" } });

/* ──────────────────────────────────────────────────────────────────────────
   ARCHITECT_HTML
   Credit gate: startGenerate() posts "generate_request" to native.
   Native calls window.onGenerateApproved() or window.onGenerateRejected().
   ────────────────────────────────────────────────────────────────────────── */
const ARCHITECT_HTML = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
:root{--bg:#0a0f1e;--card:#0f1e3a;--card2:#111e38;--gold:#c9a84c;--blue:#0077ff;--text:#e8eaf0;--muted:rgba(200,215,255,0.5);--border:rgba(201,168,76,0.2)}
html,body{height:100%;overflow:hidden}
body{background:var(--bg);color:var(--text);font-family:-apple-system,system-ui,'Helvetica Neue',Arial,sans-serif}
button{font-family:inherit;cursor:pointer}
input,textarea{font-family:inherit}
.screen{position:absolute;inset:0;display:none;flex-direction:column;overflow:hidden}
.screen.active{display:flex}
.scroll{overflow-y:auto;-webkit-overflow-scrolling:touch}
.header{padding:52px 20px 14px;text-align:center;background:linear-gradient(180deg,var(--card) 0%,transparent 100%);flex-shrink:0}
.header-title{font-size:19px;font-weight:800;color:#fff}
.header-sub{font-size:12px;color:var(--muted);margin-top:3px}
.input-field{width:100%;background:rgba(0,0,0,0.3);border:1.5px solid var(--border);border-radius:13px;padding:12px 15px;color:#fff;font-size:14px;outline:none}
.input-field:focus{border-color:rgba(201,168,76,0.55)}
.input-field::placeholder{color:var(--muted);font-size:12px}
.err{color:#f87171;font-size:11px;text-align:center;margin-top:6px;display:none}
.section-label{font-size:12px;color:var(--gold);font-weight:700;margin-bottom:6px}
#toast{position:fixed;bottom:100px;left:16px;right:16px;border-radius:14px;padding:12px 16px;font-size:13px;z-index:9999;text-align:center;display:none}
#toast.err{background:#7f1d1d;color:#fca5a5}
#toast.ok{background:#14532d;color:#86efac}

/* ── s1: Keys ── */
#s1 .body{padding:28px 22px;display:flex;flex-direction:column;gap:18px}
.logo{font-size:52px;text-align:center}
.s1-title{font-size:24px;font-weight:800;color:#fff;text-align:center}
.s1-sub{font-size:13px;color:var(--muted);text-align:center;line-height:1.7}
.key-card{background:var(--card);border:1.5px solid var(--border);border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:10px}
.key-card-title{font-size:14px;font-weight:700;color:#fff}
.key-card-sub{font-size:11px;color:var(--muted);line-height:1.6}
.key-badge{font-size:10px;background:#14532d;color:#86efac;border-radius:6px;padding:2px 8px;font-weight:700}
.key-badge-opt{background:#1e3a5f;color:#7bc8ff}
.key-link{font-size:12px;color:var(--blue);text-decoration:none;margin-top:2px;display:block}
.s1-continue{background:linear-gradient(135deg,#c9a84c,#e4c36a);color:#0a0f1e;font-size:15px;font-weight:800;border:none;border-radius:14px;padding:15px;width:100%}

/* ── s2: Form ── */
#s2 .header{position:relative}
.settings-btn{position:absolute;left:16px;top:52px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);color:rgba(200,215,255,0.6);border-radius:20px;padding:6px 12px;font-size:11px}
.mode-tabs{display:flex;gap:6px;padding:0 20px;flex-shrink:0}
.mode-tab{flex:1;text-align:center;padding:10px 4px;border-radius:12px;font-size:11px;font-weight:700;color:var(--muted);border:none;background:rgba(255,255,255,0.05)}
.mode-tab.active{background:var(--gold);color:#0a0f1e}
.mode-tab.active-chat{background:#7c3aed;color:#fff}
.mode-desc{background:var(--card);border-radius:13px;padding:11px 15px;font-size:12px;color:var(--muted);line-height:1.65;border:1px solid rgba(201,168,76,0.1);margin:0 20px;flex-shrink:0}
.mode-desc b{color:var(--gold)}
.mode-desc b.blue{color:#7bc8ff}
#s2 .body{display:flex;flex-direction:column;gap:14px;padding:14px 20px 20px;overflow-y:auto;flex:1}
.textarea-field{width:100%;background:rgba(0,0,0,0.3);border:1.5px solid var(--border);border-radius:14px;padding:13px 15px;color:#fff;font-size:14px;min-height:100px;outline:none;resize:none;line-height:1.65}
.textarea-field:focus{border-color:rgba(201,168,76,0.55)}
.textarea-field::placeholder{color:var(--muted);font-size:12px}
.gen-btn{background:linear-gradient(135deg,#0055ff,#0099ff);color:#fff;font-size:16px;font-weight:800;border:none;border-radius:16px;padding:17px;box-shadow:0 6px 24px rgba(0,100,255,0.32)}
.gen-btn:disabled{background:rgba(0,80,200,0.25);box-shadow:none;cursor:default}
.chat-enter-btn{background:linear-gradient(135deg,#5b21b6,#7c3aed);color:#fff;font-size:15px;font-weight:800;border:none;border-radius:16px;padding:17px;box-shadow:0 6px 24px rgba(90,30,200,0.35)}

/* ── s3: Loading ── */
#s3{justify-content:center;align-items:center;padding:40px 28px;gap:16px}
.loading-spin{font-size:52px;animation:spin 2.5s linear infinite}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.loading-title{font-size:21px;font-weight:800;color:#fff}
#loadStatus{font-size:13px;color:var(--muted);text-align:center;line-height:1.6;min-height:40px}
.prog-wrap{width:100%;max-width:340px;height:6px;background:rgba(255,255,255,0.08);border-radius:6px;overflow:hidden}
.prog-bar{height:100%;background:linear-gradient(90deg,#0055ff,var(--gold));border-radius:6px;width:0%;transition:width 1s ease}
.steps{width:100%;max-width:340px;display:flex;flex-direction:column;gap:8px}
.step{display:flex;align-items:center;gap:11px;padding:11px 13px;background:var(--card);border-radius:11px;border:1px solid transparent}
.step.done{border-color:rgba(201,168,76,0.3)}.step.active{border-color:rgba(0,100,255,0.4);background:rgba(0,40,180,0.13)}.step.pending .step-text{color:var(--muted)}
.step-icon{font-size:18px;width:26px;text-align:center}
.step-text{font-size:12px;font-weight:600}
.step.done .step-text{color:var(--gold)}.step.active .step-text{color:#7bc8ff}

/* ── s4: Result ── */
#s4 .header{text-align:center}
#s4 .body{padding:0 20px 28px;display:flex;flex-direction:column;gap:13px;overflow-y:auto;flex:1}
.preview-wrap{border-radius:18px;overflow:hidden;background:var(--card);border:1.5px solid rgba(201,168,76,0.25);position:relative}
.preview-img{width:100%;aspect-ratio:1;display:block;object-fit:cover}
.preview-badge{position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.7);border:1px solid var(--gold);border-radius:18px;padding:3px 11px;font-size:11px;color:var(--gold);font-weight:700}
#viewer3d{border-radius:18px;overflow:hidden;background:var(--card);border:1.5px solid rgba(0,100,255,0.2);min-height:240px;display:flex;align-items:center;justify-content:center}
.vp{text-align:center;color:var(--muted);font-size:12px;padding:20px}.vp .vi{font-size:34px;margin-bottom:8px}
.result-meta{background:var(--card);border-radius:14px;padding:13px 15px;border:1px solid rgba(201,168,76,0.12)}
.meta-row{display:flex;justify-content:space-between;padding:5px 0;font-size:12px}
.meta-row:not(:last-child){border-bottom:1px solid rgba(255,255,255,0.06)}
.meta-label{color:var(--muted)}.meta-val{font-weight:700;color:var(--gold)}
.action-row{display:flex;gap:9px}
.btn-outline-gold{flex:1;background:transparent;border:1.5px solid rgba(201,168,76,0.45);color:var(--gold);font-size:13px;font-weight:700;border-radius:12px;padding:11px}
.btn-outline-blue{flex:1;background:transparent;border:1.5px solid rgba(0,120,255,0.45);color:#55aaff;font-size:13px;font-weight:700;border-radius:12px;padding:11px}
.btn-gold-solid{background:linear-gradient(135deg,#c9a84c,#e4c36a);color:#0a0f1e;font-size:15px;font-weight:800;border:none;border-radius:14px;padding:15px;width:100%}

/* ── s5: Chat ── */
#s5{display:flex;flex-direction:column}
#s5 .chat-header{padding:52px 20px 12px;background:var(--card);flex-shrink:0;position:relative}
#s5 .chat-header-title{font-size:17px;font-weight:800;color:#fff;text-align:center}
#s5 .chat-header-sub{font-size:11px;color:var(--muted);text-align:center;margin-top:3px}
.back-btn{position:absolute;left:16px;top:52px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);color:rgba(200,215,255,0.65);border-radius:20px;padding:6px 12px;font-size:12px}
#chatMessages{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px 16px 8px;display:flex;flex-direction:column;gap:12px}
.msg{max-width:88%;display:flex;flex-direction:column;gap:6px}
.msg.user{align-self:flex-start}.msg.ai{align-self:flex-end}
.msg-bubble{padding:11px 14px;border-radius:16px;font-size:14px;line-height:1.65;white-space:pre-wrap;word-break:break-word}
.msg.user .msg-bubble{background:#0f2040;border:1.5px solid rgba(201,168,76,0.25);color:var(--text)}
.msg.ai .msg-bubble{background:linear-gradient(135deg,#12235e,#0d1e50);border:1.5px solid rgba(120,150,255,0.2);color:var(--text)}
.msg-name{font-size:10px;font-weight:700;opacity:0.7;padding:0 4px}
.msg.user .msg-name{color:var(--gold)}.msg.ai .msg-name{color:#7bc8ff}
.msg-gen-btn{background:linear-gradient(135deg,#0055ff,#0099ff);border:none;color:#fff;font-size:12px;font-weight:700;border-radius:10px;padding:8px 14px;align-self:flex-end}
.typing{display:flex;gap:5px;padding:12px 14px;background:var(--card2);border-radius:14px;align-self:flex-end;width:fit-content}
.dot{width:8px;height:8px;border-radius:50%;background:rgba(120,160,255,0.7);animation:bounce 1.2s infinite}.dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}}
.chat-input-bar{padding:10px 14px;background:var(--card);border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:9px;align-items:flex-end;flex-shrink:0}
#chatInput{flex:1;background:rgba(0,0,0,0.3);border:1.5px solid var(--border);border-radius:20px;padding:10px 15px;color:#fff;font-size:14px;outline:none;max-height:100px;resize:none;line-height:1.5}
#chatInput::placeholder{color:var(--muted);font-size:12px}
.send-btn{background:linear-gradient(135deg,#5b21b6,#7c3aed);border:none;color:#fff;border-radius:50%;width:42px;height:42px;font-size:18px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
</style>
</head>
<body>

<div id="toast"></div>

<!-- ══ s1: API Keys ══ -->
<div id="s1" class="screen active">
<div class="body scroll">
  <div class="logo">🤖</div>
  <div class="s1-title">المعماري الذكي</div>
  <div class="s1-sub">صمّم فيلتك بالذكاء الاصطناعي<br/>أدخل مفاتيح API للبدء</div>
  <div class="key-card">
    <div style="display:flex;justify-content:space-between;align-items:center"><span class="key-card-title">🏗️ Tripo3D — توليد الموديل 3D</span><span class="key-badge">مطلوب</span></div>
    <div class="key-card-sub">يولّد موديل فيلا ثلاثي الأبعاد كامل من النص</div>
    <div class="section-label">المفتاح</div>
    <input id="tripoInput" class="input-field" type="text" placeholder="tsk_xxxxxxxxxxxxxxxxxx" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"/>
    <a class="key-link" href="https://tripo3d.ai" target="_blank">↗ احصل على مفتاح مجاني</a>
  </div>
  <div class="key-card">
    <div style="display:flex;justify-content:space-between;align-items:center"><span class="key-card-title">💬 OpenAI — المعماري الذكي</span><span class="key-badge key-badge-opt">اختياري</span></div>
    <div class="key-card-sub">محادثة مع AI معماري يقترح تصاميم — ثم ينقل التصميم لـ Tripo3D</div>
    <div class="section-label">المفتاح</div>
    <input id="openaiInput" class="input-field" type="text" placeholder="sk-proj-xxxxxxxxxxxxxxxx" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"/>
    <a class="key-link" href="https://platform.openai.com/api-keys" target="_blank">↗ احصل على مفتاح OpenAI</a>
  </div>
  <div class="err" id="s1Err">أدخل مفتاح Tripo3D على الأقل للمتابعة</div>
  <button class="s1-continue" onclick="saveKeys()">حفظ والبدء ←</button>
</div>
</div>

<!-- ══ s2: Design Form ══ -->
<div id="s2" class="screen">
<div class="header">
  <button class="settings-btn" onclick="gotoSettings()">⚙️ الإعدادات</button>
  <div class="header-title">🤖 المعماري الذكي</div>
  <div class="header-sub">اختر الوضع وصمّم فيلتك</div>
</div>
<div class="mode-tabs" id="modeTabs" style="margin-bottom:10px">
  <button class="mode-tab active" id="tab-auto"   onclick="setMode('auto')">🪄 أوتو</button>
  <button class="mode-tab"        id="tab-level"  onclick="setMode('level')">📊 مستوى</button>
  <button class="mode-tab"        id="tab-manual" onclick="setMode('manual')">✍️ يدوي</button>
  <button class="mode-tab"        id="tab-chat"   onclick="setMode('chat')" style="display:none">💬 استشر</button>
</div>
<div class="mode-desc" id="modeDesc"><b>أوتو:</b> اكتب تفاصيل إضافية (اختياري) والـ AI يصمم فيلا عالمية كاملة بمسبح وحديقة</div>
<div class="body scroll">
  <div id="promptBlock">
    <div class="section-label" id="promptLabel">💬 أضف تفاصيل إضافية (اختياري)</div>
    <textarea id="promptInput" class="textarea-field" placeholder="مثال: فيلا سعودية بمسبح لاي نيت وحديقة كبيرة وتصميم نيو كلاسيك"></textarea>
  </div>
  <button class="gen-btn" id="genBtn" onclick="startGenerate()" style="display:block">✨ إنشاء الموديل 3D (1 كريديت)</button>
  <button class="chat-enter-btn" id="chatEnterBtn" onclick="openChat()" style="display:none">💬 ابدأ المحادثة مع المعماري الذكي</button>
</div>
</div>

<!-- ══ s3: Loading ══ -->
<div id="s3" class="screen">
  <div class="loading-spin">⚙️</div>
  <div class="loading-title">الذكاء الاصطناعي يصمم...</div>
  <div id="loadStatus">جارٍ إرسال الطلب...</div>
  <div class="prog-wrap"><div class="prog-bar" id="progressBar"></div></div>
  <div class="steps">
    <div class="step active"  id="step1"><span class="step-icon">📡</span><span class="step-text">إرسال الطلب لـ Tripo3D</span></div>
    <div class="step pending" id="step2"><span class="step-icon">🧠</span><span class="step-text">الذكاء الاصطناعي يبني الموديل</span></div>
    <div class="step pending" id="step3"><span class="step-icon">🎨</span><span class="step-text">تطبيق المواد والإضاءة</span></div>
    <div class="step pending" id="step4"><span class="step-icon">📦</span><span class="step-text">تجهيز ملف الموديل 3D</span></div>
  </div>
</div>

<!-- ══ s4: Result ══ -->
<div id="s4" class="screen">
<div class="header">
  <div class="header-title">✅ اكتمل التصميم!</div>
  <div class="header-sub" id="resultSub"></div>
</div>
<div class="body scroll">
  <div class="preview-wrap">
    <img id="previewImg" class="preview-img" src="" alt="" style="display:none"/>
    <div class="preview-badge">🏡 AI Villa</div>
  </div>
  <div id="viewer3d"><div class="vp"><div class="vi">⏳</div><div>جارٍ تحميل العارض 3D...</div></div></div>
  <div class="result-meta" id="resultMeta"></div>
  <div class="action-row">
    <button class="btn-outline-gold" onclick="downloadModel()">📥 تحميل GLB</button>
    <button class="btn-outline-blue" onclick="openInBrowser()">🌐 فتح في المتصفح</button>
  </div>
  <button class="btn-gold-solid" onclick="restart()">🤖 صمم مرة أخرى</button>
</div>
</div>

<!-- ══ s5: Chat ══ -->
<div id="s5" class="screen">
<div class="chat-header">
  <button class="back-btn" onclick="show('s2')">← رجوع</button>
  <div class="chat-header-title">💬 المعماري الذكي</div>
  <div class="chat-header-sub">Housin3D AI • صمّم، ناقش، ثم أنشئ موديلك 3D</div>
</div>
<div id="chatMessages"></div>
<div class="chat-input-bar">
  <textarea id="chatInput" rows="1" placeholder="اكتب طلبك أو استفسارك..." oninput="autoResize(this)" onkeydown="chatKeyDown(event)"></textarea>
  <button class="send-btn" onclick="sendChat()">↑</button>
</div>
</div>

<script>
(function(){
'use strict';

/* ── State ── */
var tripoKey    = localStorage.getItem('tripo_key')  || '';
var openaiKey   = localStorage.getItem('openai_key') || '';
var mode        = 'auto';
var pollTimer   = null;
var taskId      = null;
var resultOut   = null;
var chatHistory = [];
var pendingPrompt = null;

/* ── GPT-4o Brain ── */
var BRAIN = 'أنت مهندس معماري ذكاء اصطناعي اسمك Housin3D. تتحدث بأدب واحتراف مع العميل باللغة العربية.\n\nقواعد التعامل:\n1. إذا قال العميل "وش عندك؟" أو "عطني أفكارك" أو "ما رأيك؟"\n   → رد: "بكل سرور. إليك ثلاثة نماذج مقترحة:\\n\\nالنموذج الأول — الخليجي العريق: واجهة حجر مائل، مجلس فسيح، مسبح داخلي.\\n\\nالنموذج الثاني — العربي الكلاسيكي: أقواس مغربية، ثريات كريستال، حديقة داخلية.\\n\\nالنموذج الثالث — العالمي المعاصر: خطوط نظيفة، زجاج بانورامي، مسبح ببحر لا نهائي.\\n\\nأي نموذج يناسب ذوقك؟"\n2. إذا قال "ما عجبني" أو "غيّر" → قدم 3 بدائل جديدة.\n3. إذا أعطاك تفاصيل → لخصها واقل "تم، سأنفذ طلبك بالتفصيل."\n4. في نهاية كل اقتراح أضف: ⬇️ اضغط "إنشاء موديل 3D" لتحويل هذا التصميم لنموذج ثلاثي الأبعاد.\n\nالأسلوب: محترم ولبق. لا كلام عامي مفرط.';

/* ── Init ── */
if (tripoKey) {
  if (openaiKey) document.getElementById('tab-chat').style.display = '';
  show('s2');
} else {
  show('s1');
}

/* ── Navigation ── */
function show(id) {
  ['s1','s2','s3','s4','s5'].forEach(function(s){
    document.getElementById(s).classList.toggle('active', s===id);
  });
  window.scrollTo(0,0);
}
window.show = show;

/* ── s1: Keys ── */
window.saveKeys = function() {
  var t = (document.getElementById('tripoInput').value||'').trim();
  var o = (document.getElementById('openaiInput').value||'').trim();
  if (!t) { document.getElementById('s1Err').style.display='block'; return; }
  document.getElementById('s1Err').style.display='none';
  tripoKey=t; localStorage.setItem('tripo_key',t);
  openaiKey=o;
  if (o) { localStorage.setItem('openai_key',o); document.getElementById('tab-chat').style.display=''; }
  else   { localStorage.removeItem('openai_key'); document.getElementById('tab-chat').style.display='none'; }
  show('s2');
};
document.getElementById('tripoInput').addEventListener('keydown',function(e){ if(e.key==='Enter') window.saveKeys(); });

window.gotoSettings = function() {
  document.getElementById('tripoInput').value  = tripoKey;
  document.getElementById('openaiInput').value = openaiKey;
  show('s1');
};

/* ── s2: Modes ── */
var modeDescs = {
  auto:   '<b>أوتو:</b> اكتب تفاصيل إضافية (اختياري) والـ AI يصمم فيلا عالمية كاملة — أفضل خيار',
  level:  '<b>مستوى:</b> اكتب <b>فخم</b> أو <b>متوسط</b> أو <b>بسيط</b>',
  manual: '<b>يدوي:</b> صف كل غرفة بالتفصيل — المجلس، الصالة، المطبخ...',
  chat:   '<b class="blue">💬 استشر:</b> تحدث مع المعماري — يقترح تصاميم ويحاورك، ثم أنشئ موديلك 3D'
};
var modePH = {
  auto:   'مثال: فيلا سعودية بمسبح لاي نيت وحديقة كبيرة ونيو كلاسيك...',
  level:  'اكتب: فخم / متوسط / بسيط / luxury / standard',
  manual: 'مثال: المجلس — كنبة بنية كلاسيك وثريا ذهبية.\nالصالة — مودرن رمادي وأبيض...'
};
var modeLabels = {
  auto:'💬 أضف تفاصيل إضافية (اختياري)',
  level:'📊 اكتب المستوى المطلوب',
  manual:'✍️ صف كل غرفة بالتفصيل'
};
window.setMode = function(m) {
  mode=m;
  ['auto','level','manual','chat'].forEach(function(k){
    var el=document.getElementById('tab-'+k);
    if(!el)return;
    el.classList.remove('active','active-chat');
    if(k===m) el.classList.add(m==='chat'?'active-chat':'active');
  });
  document.getElementById('modeDesc').innerHTML = modeDescs[m]||'';
  var isChat = m==='chat';
  document.getElementById('promptBlock').style.display   = isChat?'none':'block';
  document.getElementById('genBtn').style.display        = isChat?'none':'block';
  document.getElementById('chatEnterBtn').style.display  = isChat?'block':'none';
  if (!isChat) {
    document.getElementById('promptInput').placeholder = modePH[m]||'';
    document.getElementById('promptLabel').textContent  = modeLabels[m]||'';
  }
};

/* ── Build Tripo prompt ── */
function buildTripoPrompt(custom) {
  var txt = custom || (document.getElementById('promptInput').value||'').trim();
  if (mode==='auto'||custom)
    return 'Design a stunning world-class luxury Saudi villa, modern architecture, fully furnished interior, swimming pool, garden, 8K photorealistic. '+(txt||'');
  if (mode==='level')
    return 'Design a '+(txt||'luxury')+' Saudi villa with fully furnished interior, pool, garden, 8K photorealistic render';
  return 'Generate a 3D Saudi villa with this specification: '+(txt||'elegant modern villa')+'. Do not add extras.';
}

/* ══════════════════════════════════════════════════════════════════
   CREDIT GATE
   startGenerate() → posts "generate_request" to native.
   Native calls onGenerateApproved() or onGenerateRejected().
══════════════════════════════════════════════════════════════════ */
window.startGenerate = function(customPrompt) {
  document.getElementById('genBtn').disabled = true;
  pendingPrompt = buildTripoPrompt(customPrompt);
  // Send credit request to native parent
  try {
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'generate_request'}));
  } catch(e) {
    // Not in RN (web dev mode) → bypass gate
    window._doGenerate(pendingPrompt);
  }
};

/* Native approves → proceed */
window.onGenerateApproved = function() {
  var fp = pendingPrompt;
  pendingPrompt = null;
  window._doGenerate(fp);
};

/* Native rejects → show error, re-enable button */
window.onGenerateRejected = function() {
  document.getElementById('genBtn').disabled = false;
  showToast('رصيدك نفد — اضغط ⚡ لشراء المزيد من الكريديت', 'err');
};

/* ── Actual Tripo3D generation ── */
window._doGenerate = function(fp) {
  setStep(1); setProgress(5);
  setStatus('جارٍ إرسال الطلب إلى Tripo3D...');
  show('s3');

  fetch('https://api.tripo3d.ai/v2/openapi/task', {
    method:'POST',
    headers:{'Authorization':'Bearer '+tripoKey,'Content-Type':'application/json'},
    /* ── Credit deduction hook (Supabase/backend):
       Before this fetch, the native layer already verified credits via
       the generate_request / onGenerateApproved message protocol.
       To wire Supabase: call your edge-function here and await it
       before proceeding with the Tripo3D request.             ── */
    body:JSON.stringify({type:'text_to_model', prompt:fp, model_version:'v2.5'})
  })
  .then(function(r){return r.json();})
  .then(function(data){
    if (!data.data||!data.data.task_id) throw new Error(data.message||'فشل إنشاء الطلب — تحقق من مفتاح Tripo3D');
    taskId=data.data.task_id;
    setStep(2); setProgress(20);
    setStatus('جارٍ بناء الموديل ثلاثي الأبعاد...');
    pollTask(taskId, fp);
  })
  .catch(function(e){ errAndBack(e.message||'خطأ في الاتصال بـ Tripo3D'); });
};

function pollTask(id, prompt) {
  var attempts=0;
  pollTimer=setInterval(function(){
    attempts++;
    fetch('https://api.tripo3d.ai/v2/openapi/task/'+id,{headers:{'Authorization':'Bearer '+tripoKey}})
    .then(function(r){return r.json();})
    .then(function(data){
      if(!data.data)return;
      var st=data.data.status, prog=data.data.progress||0, pct=20+Math.round(prog*70);
      setProgress(pct);
      if(st==='queued'||st==='running'){
        if(pct>55)setStep(3);else setStep(2);
        setStatus('معالجة... '+Math.round(prog*100)+'%  ('+(attempts*4)+' ثانية)');
      } else if(st==='success'){
        clearInterval(pollTimer); setStep(4,'done'); setProgress(100); setStatus('اكتمل ✅');
        setTimeout(function(){showResult(data.data.output,prompt);},600);
      } else if(st==='failed'||st==='cancelled'){
        clearInterval(pollTimer); errAndBack('فشل إنشاء الموديل — حاول مرة أخرى');
      }
    })
    .catch(function(){});
  },4000);
}

function setStatus(msg){document.getElementById('loadStatus').textContent=msg;}
function setProgress(p){document.getElementById('progressBar').style.width=p+'%';}
function setStep(n,fc){for(var i=1;i<=4;i++){document.getElementById('step'+i).className='step '+(i<n?'done':i===n?(fc||'active'):'pending');}}
function errAndBack(msg){
  if(pollTimer)clearInterval(pollTimer); pollTimer=null;
  document.getElementById('genBtn').disabled=false;
  show('s2'); showToast(msg,'err');
}

/* ── s4: Result ── */
function showResult(output, prompt){
  resultOut=output;
  var prevUrl=output.rendered_image&&output.rendered_image.url;
  var modelUrl=output.model&&output.model.url;
  if(prevUrl){var img=document.getElementById('previewImg');img.src=prevUrl;img.style.display='block';img.onerror=function(){img.style.display='none';};}
  document.getElementById('resultSub').textContent=prompt.length>60?prompt.substring(0,60)+'...':prompt;
  var meta='';
  if(output.model)meta+='<div class="meta-row"><span class="meta-label">صيغة الملف</span><span class="meta-val">GLB ثلاثي الأبعاد</span></div>';
  if(taskId)meta+='<div class="meta-row"><span class="meta-label">رقم المهمة</span><span class="meta-val" style="font-size:10px">'+taskId.substring(0,18)+'…</span></div>';
  document.getElementById('resultMeta').innerHTML=meta;
  if(modelUrl)loadModelViewer(modelUrl);
  else document.getElementById('viewer3d').innerHTML='<div class="vp"><div class="vi">⚠️</div><div>رابط الموديل غير متاح</div></div>';
  show('s4');
  document.getElementById('genBtn').disabled=false;
}

function loadModelViewer(url){
  var v=document.getElementById('viewer3d');
  v.innerHTML='<div class="vp"><div class="vi">⏳</div><div>جارٍ تحميل العارض 3D...</div></div>';
  var scr=document.createElement('script');scr.type='module';
  scr.src='https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';
  scr.onload=function(){
    var mv=document.createElement('model-viewer');
    mv.setAttribute('src',url);mv.setAttribute('auto-rotate','');mv.setAttribute('camera-controls','');
    mv.setAttribute('shadow-intensity','0.8');mv.setAttribute('environment-image','neutral');
    mv.style.cssText='width:100%;height:260px;background:#0f1e3a;border-radius:18px;--poster-color:#0f1e3a';
    v.innerHTML='';v.appendChild(mv);
    setTimeout(function(){if(!mv.modelIsVisible)v.innerHTML='<div class="vp"><div class="vi">🏡</div><div>اضغط "فتح في المتصفح" لعرض الموديل 3D</div></div>';},12000);
  };
  scr.onerror=function(){v.innerHTML='<div class="vp"><div class="vi">🏡</div><div>اضغط "فتح في المتصفح" لعرض الموديل 3D</div></div>';};
  document.head.appendChild(scr);
}

window.downloadModel=function(){var url=resultOut&&resultOut.model&&resultOut.model.url;if(url)window.open(url,'_blank');};
window.openInBrowser=function(){var url=(resultOut&&resultOut.model&&resultOut.model.url)||(resultOut&&resultOut.rendered_image&&resultOut.rendered_image.url);if(url)window.open(url,'_blank');};
window.restart=function(){
  if(pollTimer)clearInterval(pollTimer);pollTimer=null;taskId=null;resultOut=null;pendingPrompt=null;
  document.getElementById('promptInput').value='';
  document.getElementById('previewImg').src='';
  document.getElementById('viewer3d').innerHTML='<div class="vp"><div class="vi">⏳</div><div>جارٍ تحميل العارض...</div></div>';
  show('s2');
};

/* ── s5: Chat ── */
window.openChat=function(){
  chatHistory=[{role:'system',content:BRAIN}];
  document.getElementById('chatMessages').innerHTML='';
  show('s5');
  setTimeout(function(){
    addMsg('ai','مرحباً بك في Housin3D 🏡\n\nأنا معمارك الذكي. يمكنني مساعدتك في تصميم فيلتك المثالية.\n\nأخبرني: وش تبي؟ عطني فكرتك أو قل لي "وش عندك؟" لأقترح عليك نماذج جاهزة.',null,true);
  },150);
};

function addMsg(role,text,tripoPrompt,noGenBtn){
  var container=document.getElementById('chatMessages');
  var wrap=document.createElement('div');wrap.className='msg '+role;
  var nameEl=document.createElement('div');nameEl.className='msg-name';
  nameEl.textContent=role==='user'?'أنت':'🤖 Housin3D';
  var bubble=document.createElement('div');bubble.className='msg-bubble';bubble.textContent=text;
  wrap.appendChild(nameEl);wrap.appendChild(bubble);
  if(role==='ai'&&!noGenBtn&&tripoKey){
    var btn=document.createElement('button');btn.className='msg-gen-btn';
    btn.innerHTML='🏗️ إنشاء موديل 3D من هذا التصميم';
    var captured=tripoPrompt||text;
    btn.onclick=function(){show('s2');setTimeout(function(){window.startGenerate(captured);},100);};
    wrap.appendChild(btn);
  }
  container.appendChild(wrap);
  container.scrollTop=container.scrollHeight;
}

function showTyping(){
  var c=document.getElementById('chatMessages');
  var el=document.createElement('div');el.id='typingIndicator';el.className='msg ai';
  el.innerHTML='<div class="msg-name">🤖 Housin3D</div><div class="typing"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';
  c.appendChild(el);c.scrollTop=c.scrollHeight;
}
function hideTyping(){var el=document.getElementById('typingIndicator');if(el)el.remove();}

window.sendChat=function(){
  var input=document.getElementById('chatInput');
  var text=(input.value||'').trim();
  if(!text||!openaiKey)return;
  input.value='';input.style.height='';
  addMsg('user',text);
  chatHistory.push({role:'user',content:text});
  showTyping();
  fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{'Authorization':'Bearer '+openaiKey,'Content-Type':'application/json'},
    body:JSON.stringify({model:'gpt-4o',messages:chatHistory,max_tokens:700})
  })
  .then(function(r){return r.json();})
  .then(function(data){
    hideTyping();
    if(!data.choices||!data.choices[0])throw new Error(data.error&&data.error.message||'خطأ في OpenAI');
    var reply=data.choices[0].message.content;
    chatHistory.push({role:'assistant',content:reply});
    addMsg('ai',reply,text+'. '+reply);
  })
  .catch(function(e){hideTyping();addMsg('ai','⚠️ '+(e.message||'خطأ في الاتصال'),null,true);});
};

window.chatKeyDown=function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();window.sendChat();}};
window.autoResize=function(el){el.style.height='';el.style.height=Math.min(el.scrollHeight,100)+'px';};

function showToast(msg,type){
  var t=document.getElementById('toast');t.textContent=(type==='err'?'⚠️ ':'✅ ')+msg;
  t.className=type||'err';t.style.display='block';
  setTimeout(function(){t.style.display='none';},4500);
}

try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));}catch(e){}
})();
</script>
</body>
</html>`;
