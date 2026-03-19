import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════
   APP VERSION & CONFIG
═══════════════════════════════════════════════════ */
const APP_VERSION = "1.0.0";
const APP_NAME = "within";

/* ═══════════════════════════════════════════════════
   OAUTH CONFIG — plug in your real credentials
   Google:  console.cloud.google.com → Create OAuth 2.0 Client ID (Web)
   Apple:   developer.apple.com → Certificates → Sign in with Apple → Service ID
═══════════════════════════════════════════════════ */
const OAUTH = {
  GOOGLE_CLIENT_ID: "",   // e.g. "123456789-abc.apps.googleusercontent.com"
  APPLE_SERVICE_ID: "",   // e.g. "com.yourcompany.within"
  APPLE_REDIRECT_URI: typeof window !== "undefined" ? window.location.origin : "",
};

/* ═══════════════════════════════════════════════════
   FONTS
═══════════════════════════════════════════════════ */
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');`;

/* ═══════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════ */
const MOODS = [
  { id:"thriving", emoji:"🌸", label:"Thriving", color:"#e8a598" },
  { id:"okay",     emoji:"🌤", label:"Okay",     color:"#c4a882" },
  { id:"tired",    emoji:"🌧", label:"Tired",    color:"#9bafc4" },
  { id:"low",      emoji:"🌑", label:"Low",      color:"#8b8b9e" },
  { id:"anxious",  emoji:"🌀", label:"Anxious",  color:"#a89fc4" },
];
const CRISIS_RESOURCES = [
  { name:"Crisis Text Line", info:"Text HOME to 741741", link:"smslink" },
  { name:"988 Suicide & Crisis Lifeline", info:"Call or text 988", link:"tel:988" },
  { name:"International Crisis Centers", info:"iasp.info/resources/Crisis_Centres", link:"https://www.iasp.info/resources/Crisis_Centres/" },
];
const CHAT_PROMPTS = ["I'm feeling overwhelmed lately...","I keep procrastinating on my goal","I had a rough day today","I'm doubting myself"];
const REWARD_SUGGESTIONS = ["A long bath with candles 🛁","My favourite snack or dessert 🍰","30 min of guilt-free TV 📺","A walk in a place I love 🌿","A coffee at my favourite café ☕","Time to read with no distractions 📚","A phone call with someone I miss 💛","A nap — just because 😴"];
const REMINDER_MESSAGES = [
  { title:"Time to check in 🌿", body:"Hey — you set this moment aside for yourself. Step in when you're ready." },
  { title:"within is thinking of you 💛", body:"A quiet moment, just for you. How are you feeling today?" },
  { title:"Your daily check-in ✨", body:"You planned to check in right about now. I'm here whenever you are." },
  { title:"Gentle nudge from within 🌸", body:"You made time for this. That already says something." },
  { title:"It's check-in time 🌤", body:"No pressure. Just a moment to see how you're doing." },
];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const HABIT_TIPS = [
  { icon:"🌅", tip:"Habit stack: attach your check-in to an existing morning routine — right after coffee, before your phone." },
  { icon:"📍", tip:"Place a visual cue somewhere you'll see it at your usual check-in time." },
  { icon:"🎯", tip:"On tough days, a 2-minute check-in still counts. Showing up small is still showing up." },
  { icon:"🌙", tip:"If mornings feel hard, try a brief evening reflection instead — review the day, not plan the next." },
  { icon:"🤝", tip:"Telling someone your goal increases follow-through by 65%. Consider sharing with your buddy." },
  { icon:"📈", tip:"Completion rates dip around week 3. If you're there, that's normal — push through this week." },
  { icon:"💛", tip:"Reward yourself within 60 seconds of completing a habit for the strongest neural reinforcement." },
  { icon:"🔁", tip:"Missed a day? Two misses in a row is the real danger zone. The next one is the most important." },
];

/* ═══════════════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════════════ */
const SK = {
  auth:"within:auth_v1",
  users:"within:users_v1",
  profile:"within:profile_v1",
  checkins:"within:checkins_v1",
  rewards:"within:rewards_v1",
  streak:"within:streak_v1",
  reminders:"within:reminders_v1",
  journal:"within:journal_v1",
  buddy:"within:buddy_v1",
  disclaimer:"within:disclaimer_v1",
};
async function load(key) {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; } catch { return null; }
}
async function save(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); } catch {}
}

/* ═══════════════════════════════════════════════════
   SIMPLE AUTH HASH (for demo — replace with bcrypt in production)
═══════════════════════════════════════════════════ */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "within_salt_2025");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

/* ═══════════════════════════════════════════════════
   SEED DATA for demo
═══════════════════════════════════════════════════ */
function generateSeedCheckins() {
  const moods = ["thriving","okay","okay","tired","anxious","okay","thriving","low","okay","tired","okay","thriving"];
  const notes = ["Kept going despite the rain.","Hit a small milestone — felt amazing.","Rest is part of the journey too.","Breathed through the hard moment.","Showed up. That's enough.","A small step forward.","Feeling clearer today.","Hard day, but I made it.","Just a moment of peace.","Took it slow and steady.","Progress feels real today.","Something shifted. Good."];
  const entries = [];
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate()-i);
    if (Math.random() < 0.22) continue;
    const mood = moods[Math.floor(Math.random()*moods.length)];
    entries.push({ isoDate:d.toISOString().split("T")[0], date:d.toLocaleDateString("en-US",{weekday:"short"}), mood, completed:Math.random()>0.2, note:notes[Math.floor(Math.random()*notes.length)], nudge:"Take one intentional step today." });
  }
  return entries;
}

/* ═══════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════ */
const styles = `
  ${FONTS}
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --cream:#faf7f2;--warm:#f0e9dc;--amber:#c4956a;--amber-deep:#a07040;
    --text:#2d2418;--muted:#8a7560;--border:#e8ddd0;--white:#fff;
    --serif:'Cormorant Garamond',Georgia,serif;--sans:'DM Sans',sans-serif;
    --gold:#d4a843;--gold-light:#f5e6c0;--teal:#4a9e8a;--teal-light:#e4f5f1;
    --rose:#e8a598;--danger:#c46a6a;--danger-light:#fff0f0;
  }
  html,body{height:100%;background:var(--cream);font-family:var(--sans);-webkit-font-smoothing:antialiased}

  /* ── LAYOUT ── */
  .app{height:100vh;background:var(--cream);display:flex;flex-direction:column;align-items:center;position:relative;overflow:hidden}
  .blob{position:fixed;border-radius:50%;filter:blur(80px);opacity:.28;pointer-events:none;z-index:0;animation:drift 18s ease-in-out infinite alternate}
  .blob-1{width:400px;height:400px;background:#e8c4a0;top:-100px;right:-80px}
  .blob-2{width:300px;height:300px;background:#d4b8c8;bottom:80px;left:-80px;animation-delay:-6s}
  .blob-3{width:200px;height:200px;background:#b8d4c8;top:40%;right:-40px;animation-delay:-12s}
  @keyframes drift{from{transform:translate(0,0) scale(1)}to{transform:translate(20px,28px) scale(1.08)}}

  .nav{width:100%;max-width:480px;flex-shrink:0;display:flex;justify-content:space-between;align-items:center;padding:18px 20px 8px;position:relative;z-index:10}
  .nav-logo{font-family:var(--serif);font-size:22px;font-weight:400;color:var(--text)}
  .nav-logo span{color:var(--amber);font-style:italic}
  .nav-right{display:flex;align-items:center;gap:8px}
  .nav-badge{background:var(--white);border:1px solid var(--border);border-radius:20px;padding:4px 12px;font-size:12px;color:var(--muted);display:flex;align-items:center;gap:5px;box-shadow:0 1px 4px rgba(0,0,0,.05)}

  .content{flex:1;width:100%;max-width:480px;overflow-y:auto;padding:0 16px 8px;position:relative;z-index:10;-webkit-overflow-scrolling:touch;min-height:0}
  .content::-webkit-scrollbar{display:none}

  .bottom-nav{width:100%;max-width:480px;flex-shrink:0;display:flex;background:var(--white);border-top:1px solid var(--border);padding:8px 0 max(14px,env(safe-area-inset-bottom));z-index:20}
  .bnb{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:none;cursor:pointer;padding:6px 0;transition:all .2s;position:relative}
  .bnb-icon{font-size:18px;line-height:1;transition:transform .2s}
  .bnb-label{font-size:9px;font-weight:500;letter-spacing:.05em;color:var(--muted);transition:color .2s}
  .bnb.active .bnb-label{color:var(--amber)}
  .bnb.active .bnb-icon{transform:scale(1.15)}
  .bnb-dot{position:absolute;top:2px;right:calc(50% - 13px);width:7px;height:7px;border-radius:50%;background:var(--gold);border:2px solid var(--white);animation:dotPop .4s ease}
  @keyframes dotPop{from{transform:scale(0)}to{transform:scale(1)}}

  /* ── SCREENS ── */
  .screen{width:100%}
  .screen-enter{animation:fadeUp .4s ease forwards}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}

  /* ── CARDS ── */
  .card{background:var(--white);border:1px solid var(--border);border-radius:20px;padding:22px;box-shadow:0 4px 24px rgba(0,0,0,.05);margin-bottom:13px}
  .card-accent{background:linear-gradient(135deg,#f9f0e6,#f5ede0);border-color:#e8d8c4}
  .card-teal{background:linear-gradient(135deg,#edf9f6,#e0f5f0);border-color:#c0e8de}
  .card-gold{background:linear-gradient(135deg,#fdf8ee,#f9f0d8);border:1px solid #e8d4a0}
  .card-dark{background:linear-gradient(135deg,#2d2418,#3d3020);border:none}

  /* ── TYPE ── */
  .display{font-family:var(--serif);font-size:28px;line-height:1.15;font-weight:300;color:var(--text)}
  .display em{font-style:italic;color:var(--amber)}
  .subtext{font-size:14px;color:var(--muted);line-height:1.6}
  .label{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:500;margin-bottom:11px}

  /* ── INPUTS ── */
  .input{width:100%;background:var(--cream);border:1px solid var(--border);border-radius:12px;padding:12px 15px;font-family:var(--sans);font-size:15px;color:var(--text);outline:none;transition:border-color .2s;resize:none}
  .input:focus{border-color:var(--amber)}
  .input::placeholder{color:#c4b8a8}
  .input-sm{font-size:14px;padding:10px 13px}
  .input-error{border-color:var(--danger)!important}

  /* ── BUTTONS ── */
  .btn{width:100%;padding:13px;border-radius:14px;border:none;cursor:pointer;font-family:var(--sans);font-size:15px;font-weight:500;transition:all .2s}
  .btn:disabled{opacity:.55;cursor:not-allowed;transform:none!important}
  .btn-primary{background:var(--amber);color:white;box-shadow:0 4px 16px rgba(196,149,106,.35)}
  .btn-primary:not(:disabled):hover{background:var(--amber-deep);transform:translateY(-1px)}
  .btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border)}
  .btn-ghost:not(:disabled):hover{background:var(--warm)}
  .btn-teal{background:var(--teal);color:white;box-shadow:0 4px 16px rgba(74,158,138,.3)}
  .btn-teal:not(:disabled):hover{background:#3a8878;transform:translateY(-1px)}
  .btn-danger{background:transparent;color:var(--danger);border:1px solid #f0d4d4}
  .btn-sm{padding:8px 18px;width:auto;font-size:13px;border-radius:10px}

  /* ── MOOD ── */
  .mood-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
  .mood-btn{display:flex;flex-direction:column;align-items:center;gap:5px;padding:12px 4px;border-radius:14px;border:2px solid transparent;background:var(--cream);cursor:pointer;transition:all .2s}
  .mood-btn:hover{background:var(--warm);transform:translateY(-2px)}
  .mood-btn.selected{border-color:var(--amber);background:#fdf6ee;box-shadow:0 0 0 4px rgba(196,149,106,.12)}
  .mood-emoji{font-size:24px}
  .mood-label{font-size:10px;color:var(--muted);font-weight:500}

  /* ── MISC ── */
  .ai-message{font-family:var(--serif);font-size:17px;line-height:1.7;font-weight:300;color:var(--text);font-style:italic;border-left:3px solid var(--amber);padding-left:17px;margin:4px 0 13px}
  .nudge{display:flex;align-items:center;gap:12px;background:var(--cream);border-radius:12px;padding:13px;border:1px solid var(--border)}
  .nudge-text{font-size:14px;color:var(--text);line-height:1.5}
  .nudge-text strong{font-weight:500;display:block;margin-bottom:2px}
  .why-card{background:linear-gradient(135deg,#2d2418,#3d3020);border-radius:20px;padding:20px;color:white;margin-bottom:13px;position:relative;overflow:hidden}
  .why-card::before{content:'"';position:absolute;top:-10px;left:14px;font-family:var(--serif);font-size:100px;color:rgba(255,255,255,.05);line-height:1}
  .why-label{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:9px}
  .why-text{font-family:var(--serif);font-size:16px;line-height:1.5;font-weight:300;color:rgba(255,255,255,.9);font-style:italic;position:relative;z-index:1}
  .tabs{display:flex;gap:7px;margin-bottom:13px}
  .tab{flex:1;padding:8px;border-radius:11px;border:1px solid var(--border);background:transparent;cursor:pointer;font-family:var(--sans);font-size:13px;font-weight:500;color:var(--muted);transition:all .2s}
  .tab.active{background:var(--amber);color:white;border-color:var(--amber)}
  .story-entry{display:flex;gap:11px;margin-bottom:13px;position:relative}
  .story-dot{width:9px;height:9px;border-radius:50%;background:var(--amber);margin-top:5px;flex-shrink:0}
  .story-line{position:absolute;left:3.5px;top:16px;bottom:-10px;width:2px;background:var(--border)}
  .story-note{font-size:14px;color:var(--muted);line-height:1.5}
  .story-date{font-size:11px;color:var(--amber);font-weight:500;margin-bottom:2px}
  .week-row{display:flex;gap:6px;align-items:flex-end;margin-top:8px}
  .week-bar{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
  .week-bar-fill{width:100%;border-radius:6px 6px 0 0}
  .week-bar-label{font-size:10px;color:var(--muted)}
  .week-bar-emoji{font-size:13px}
  .divider{height:1px;background:var(--border);margin:11px 0}
  .check{display:inline-flex;align-items:center;justify-content:center;width:25px;height:25px;border-radius:50%;background:#e8f5e8;color:#4caf50;font-size:13px;flex-shrink:0}

  /* ── LOADING ── */
  .loading{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:14px;padding:6px 0}
  .dot{width:6px;height:6px;border-radius:50%;background:var(--amber);animation:pulse 1.2s ease-in-out infinite}
  .dot:nth-child(2){animation-delay:.2s}
  .dot:nth-child(3){animation-delay:.4s}
  @keyframes pulse{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}

  /* ── CRISIS ── */
  .crisis-banner{background:#f5f0ff;border:1px solid #d4c8f0;border-radius:14px;padding:13px 15px;margin-top:10px}
  .crisis-title{font-size:13px;font-weight:600;color:#5a4080;margin-bottom:8px}
  .crisis-link{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(212,200,240,.4);text-decoration:none;cursor:pointer}
  .crisis-link:last-child{border-bottom:none;padding-bottom:0}
  .crisis-link-name{font-size:13px;font-weight:500;color:#5a4080}
  .crisis-link-info{font-size:12px;color:#8a70b0;margin-top:1px}

  /* ── GIFT ── */
  .gift-nudge-hint{display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,#fdf6e8,#faefd6);border:1px dashed var(--gold);border-radius:12px;padding:11px 13px;font-size:13px;color:#8a6820}
  .gift-box-btn{width:100%;margin-top:11px;background:linear-gradient(135deg,#2d2418,#3a2c1a);border:none;border-radius:16px;padding:20px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;position:relative;overflow:hidden;box-shadow:0 6px 28px rgba(45,36,24,.25);transition:transform .2s;animation:giftGlow 2.5s ease-in-out infinite}
  .gift-box-btn:hover{transform:translateY(-3px) scale(1.01)}
  @keyframes giftGlow{0%,100%{box-shadow:0 6px 28px rgba(45,36,24,.25),0 0 0 0 rgba(212,168,67,0)}50%{box-shadow:0 6px 28px rgba(45,36,24,.25),0 0 0 8px rgba(212,168,67,.15)}}
  .gift-box-shine{position:absolute;top:-50%;left:-60%;width:40%;height:200%;background:rgba(255,255,255,.06);transform:rotate(20deg);animation:shine 3s ease-in-out infinite}
  @keyframes shine{0%,100%{left:-60%}50%{left:120%}}
  .gift-box-emoji{font-size:50px;animation:float 3s ease-in-out infinite;line-height:1}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  .gift-box-label{font-family:var(--serif);font-size:15px;font-weight:300;color:rgba(255,255,255,.9);font-style:italic}
  .gift-box-sub{font-size:11px;color:rgba(255,255,255,.4);letter-spacing:.08em;text-transform:uppercase}
  .gift-ribbons{position:absolute;top:0;left:50%;transform:translateX(-50%);width:3px;height:100%;background:rgba(212,168,67,.3)}
  .gift-ribbons::after{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(90deg);width:3px;height:100%;background:rgba(212,168,67,.3)}
  .gift-overlay{position:fixed;inset:0;z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(20,14,8,.9);backdrop-filter:blur(16px);animation:fadeIn .4s ease forwards;padding:24px}
  .gift-reveal-box{display:flex;flex-direction:column;align-items:center;gap:18px;animation:revealPop .5s cubic-bezier(.34,1.56,.64,1) forwards;max-width:340px;width:100%}
  @keyframes revealPop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
  .gift-open-emoji{font-size:76px;animation:celebrate .6s ease forwards .3s;opacity:0}
  @keyframes celebrate{0%{opacity:0;transform:scale(.5) rotate(-10deg)}60%{transform:scale(1.2) rotate(5deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
  .gift-reveal-title{font-family:var(--serif);font-size:30px;font-weight:300;color:white;text-align:center;font-style:italic}
  .gift-reveal-title span{color:var(--gold)}
  .gift-reveal-reward{background:rgba(255,255,255,.08);border:1px solid rgba(212,168,67,.35);border-radius:20px;padding:18px 26px;text-align:center;width:100%}
  .gift-reveal-reward-label{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:9px}
  .gift-reveal-reward-text{font-family:var(--serif);font-size:20px;font-weight:300;color:white;line-height:1.4}
  .gift-close-btn{background:var(--gold);color:#2d2418;border:none;border-radius:14px;padding:13px 30px;font-family:var(--sans);font-size:15px;font-weight:600;cursor:pointer;width:100%;box-shadow:0 4px 20px rgba(212,168,67,.4)}
  .confetti-wrap{position:fixed;inset:0;pointer-events:none;z-index:99;overflow:hidden}
  .confetti-piece{position:absolute;width:8px;height:8px;border-radius:2px;animation:confettiFall linear forwards;opacity:0}
  @keyframes confettiFall{0%{opacity:1;transform:translateY(-20px) rotate(0)}100%{opacity:0;transform:translateY(100vh) rotate(720deg)}}

  /* ── REWARD TAB ── */
  .reward-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
  .reward-chip{padding:7px 13px;background:var(--white);border:1px solid var(--border);border-radius:20px;font-size:13px;color:var(--text);cursor:pointer;transition:all .2s;font-family:var(--sans)}
  .reward-chip:hover,.reward-chip.selected{background:var(--gold-light);border-color:var(--gold);color:#8a5c10}
  .past-reward-row{display:flex;align-items:center;gap:13px;padding:11px 0;border-bottom:1px solid var(--border)}
  .past-reward-icon{width:38px;height:38px;border-radius:11px;background:var(--gold-light);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0}
  .past-reward-badge{font-size:11px;color:#b07a10;background:var(--gold-light);border-radius:20px;padding:3px 9px;font-weight:500}

  /* ── REMINDER BANNER ── */
  .reminder-banner{position:fixed;top:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;z-index:200;background:linear-gradient(135deg,#2d2418,#4a3828);padding:16px 20px 14px;border-radius:0 0 20px 20px;box-shadow:0 8px 32px rgba(45,36,24,.4);animation:bannerDrop .5s cubic-bezier(.34,1.2,.64,1) forwards;display:flex;flex-direction:column;gap:8px}
  @keyframes bannerDrop{from{transform:translateX(-50%) translateY(-110%)}to{transform:translateX(-50%) translateY(0)}}
  .banner-top{display:flex;align-items:center;justify-content:space-between}
  .banner-label{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.45)}
  .banner-close{background:none;border:none;color:rgba(255,255,255,.4);font-size:18px;cursor:pointer;line-height:1;padding:0}
  .banner-msg{font-family:var(--serif);font-size:16px;font-weight:300;color:rgba(255,255,255,.92);font-style:italic;line-height:1.5}
  .banner-action{background:var(--gold);color:#2d2418;border:none;border-radius:10px;padding:9px 18px;font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;align-self:flex-start}

  /* ── SETTINGS ── */
  .reminder-item{display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid var(--border)}
  .reminder-item:last-child{border-bottom:none}
  .reminder-icon{width:38px;height:38px;border-radius:11px;background:var(--teal-light);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
  .reminder-info{flex:1;min-width:0}
  .reminder-time{font-size:18px;font-family:var(--serif);color:var(--text);font-weight:300}
  .reminder-days{font-size:11px;color:var(--muted);margin-top:2px}
  .reminder-toggle{position:relative;width:44px;height:24px;flex-shrink:0}
  .reminder-toggle input{opacity:0;width:0;height:0;position:absolute}
  .toggle-track{position:absolute;inset:0;background:var(--border);border-radius:12px;cursor:pointer;transition:background .2s}
  .reminder-toggle input:checked + .toggle-track{background:var(--teal)}
  .toggle-thumb{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:white;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
  .reminder-toggle input:checked ~ .toggle-thumb{transform:translateX(20px)}
  .add-reminder-form{background:var(--teal-light);border:1px solid #c0e8de;border-radius:16px;padding:18px;margin-top:8px}
  .time-input{background:var(--white);border:1px solid var(--border);border-radius:10px;padding:10px 13px;font-family:var(--sans);font-size:16px;color:var(--text);outline:none;width:100%;margin-bottom:10px}
  .day-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
  .day-chip{padding:6px 12px;border-radius:20px;border:1px solid var(--border);background:var(--white);font-size:12px;font-weight:500;color:var(--muted);cursor:pointer;transition:all .2s;font-family:var(--sans)}
  .day-chip.on{background:var(--teal);color:white;border-color:var(--teal)}
  .notif-bar{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;margin-bottom:12px;font-size:13px}
  .notif-bar.default{background:linear-gradient(135deg,#fff8e8,#fef3d0);border:1px solid #f0d878;color:#8a6820}
  .notif-bar.granted{background:var(--teal-light);border:1px solid #c0e8de;color:#2a5c50}
  .notif-bar.denied{background:var(--danger-light);border:1px solid #f0d4d4;color:#a05050}
  .profile-stat{text-align:center}
  .profile-stat-val{font-family:var(--serif);font-size:22px;color:var(--amber);font-weight:300}
  .profile-stat-label{font-size:11px;color:var(--muted);margin-top:2px}
  .edit-row{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--border)}
  .edit-row-label{font-size:12px;color:var(--muted);width:70px;flex-shrink:0}
  .edit-row-val{flex:1;font-size:13px;color:var(--text);font-family:var(--serif);font-style:italic}
  .edit-row-btn{background:none;border:none;color:var(--amber);font-size:12px;cursor:pointer;flex-shrink:0;font-family:var(--sans);font-weight:500}
  .insight{display:flex;align-items:flex-start;gap:10px;padding:11px 13px;background:var(--teal-light);border-radius:12px;border:1px solid #c0e8de;margin-bottom:9px;font-size:13px;color:#2a5c50;line-height:1.5}

  /* ── OFFLINE BANNER ── */
  .offline-bar{position:fixed;top:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;z-index:300;background:#3d3020;color:rgba(255,255,255,.85);text-align:center;padding:8px;font-size:12px;font-family:var(--sans);animation:bannerDrop .3s ease forwards}

  /* ── AUTH SCREEN ── */
  .auth-screen{position:fixed;inset:0;z-index:400;background:linear-gradient(160deg,#faf7f2 0%,#f0e8d8 50%,#e8d8c4 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;overflow-y:auto;animation:fadeIn .4s ease}
  .auth-blob-1{position:absolute;width:400px;height:400px;background:#e8c4a0;border-radius:50%;filter:blur(90px);opacity:.35;top:-120px;right:-100px;pointer-events:none}
  .auth-blob-2{position:absolute;width:300px;height:300px;background:#d4b8c8;border-radius:50%;filter:blur(80px);opacity:.3;bottom:-80px;left:-80px;pointer-events:none}
  .auth-inner{position:relative;z-index:1;width:100%;max-width:360px;display:flex;flex-direction:column;align-items:center}
  .auth-logo{font-family:var(--serif);font-size:42px;font-weight:300;color:var(--text);margin-bottom:4px}
  .auth-logo span{color:var(--amber);font-style:italic}
  .auth-tagline{font-family:var(--serif);font-size:15px;color:var(--muted);font-style:italic;margin-bottom:36px;text-align:center;line-height:1.6}
  .auth-card{background:rgba(255,255,255,.9);backdrop-filter:blur(16px);border:1px solid rgba(232,221,208,.8);border-radius:24px;padding:28px;width:100%;box-shadow:0 8px 40px rgba(45,36,24,.1)}
  .auth-tabs{display:flex;background:var(--cream);border-radius:12px;padding:4px;gap:4px;margin-bottom:22px}
  .auth-tab{flex:1;padding:9px;border-radius:9px;border:none;background:transparent;cursor:pointer;font-family:var(--sans);font-size:13px;font-weight:500;color:var(--muted);transition:all .2s}
  .auth-tab.active{background:var(--white);color:var(--text);box-shadow:0 1px 4px rgba(0,0,0,.08)}
  .auth-error{background:#fff0f0;border:1px solid #f0c8c8;border-radius:10px;padding:10px 13px;font-size:13px;color:var(--danger);margin-bottom:12px;line-height:1.5}
  .auth-success{background:var(--teal-light);border:1px solid #c0e8de;border-radius:10px;padding:10px 13px;font-size:13px;color:#2a5c50;margin-bottom:12px;line-height:1.5}
  .auth-privacy{font-size:11px;color:var(--muted);text-align:center;line-height:1.6;margin-top:16px;padding:0 8px}
  .auth-privacy a{color:var(--amber);cursor:pointer;text-decoration:underline}
  .field-label{font-size:12px;color:var(--muted);font-weight:500;margin-bottom:5px;display:block}

  /* ── DISCLAIMER MODAL ── */
  .modal-overlay{position:fixed;inset:0;z-index:500;background:rgba(20,14,8,.75);backdrop-filter:blur(10px);display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .3s ease;padding:0}
  .modal-sheet{background:var(--white);border-radius:28px 28px 0 0;padding:28px 24px max(28px,env(safe-area-inset-bottom));width:100%;max-width:480px;animation:slideUp .4s cubic-bezier(.34,1.2,.64,1) forwards;max-height:85vh;overflow-y:auto}
  @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
  .modal-handle{width:36px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 22px}

  /* ── HABIT DETAIL ── */
  .habit-hero{background:linear-gradient(135deg,#2d2418 0%,#3a2c1a 50%,#2d2418 100%);border-radius:24px;padding:24px;margin-bottom:13px;position:relative;overflow:hidden}
  .habit-hero::before{content:'';position:absolute;top:-60px;right:-60px;width:200px;height:200px;background:radial-gradient(circle,rgba(212,168,67,.15),transparent 70%);border-radius:50%}
  .habit-hero-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}
  .habit-hero-title{font-family:var(--serif);font-size:22px;font-weight:300;color:white;font-style:italic;line-height:1.3;max-width:200px}
  .habit-hero-back{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:5px 14px;font-size:12px;color:rgba(255,255,255,.7);cursor:pointer;font-family:var(--sans)}
  .habit-stat{flex:1;text-align:center;padding:0 8px;border-right:1px solid rgba(255,255,255,.1)}
  .habit-stat:last-child{border-right:none}
  .habit-stat-val{font-family:var(--serif);font-size:24px;color:var(--gold);font-weight:300}
  .habit-stat-sub{font-size:10px;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.08em;margin-top:3px}
  .ring-wrap{display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 0}
  .bar-chart{display:flex;gap:6px;align-items:flex-end;height:80px;margin-top:8px}
  .bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%}
  .bar-fill{width:100%;border-radius:5px 5px 0 0;transition:height .6s ease;min-height:3px}
  .bar-lbl{font-size:9px;color:var(--muted)}
  .heatmap-grid{display:grid;grid-template-columns:repeat(13,1fr);gap:3px;margin-top:8px}
  .heatmap-col{display:flex;flex-direction:column;gap:3px}
  .heatmap-cell{width:100%;aspect-ratio:1;border-radius:3px;cursor:default}
  .heatmap-legend{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11px;color:var(--muted)}
  .heatmap-legend-swatch{width:10px;height:10px;border-radius:2px}
  .streak-timeline{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px}
  .streak-day{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;cursor:default}
  .mood-chart{display:flex;flex-direction:column;gap:8px;margin-top:8px}
  .mood-row{display:flex;align-items:center;gap:10px}
  .mood-row-label{font-size:12px;color:var(--text);width:70px;display:flex;align-items:center;gap:5px;flex-shrink:0}
  .mood-bar-track{flex:1;height:10px;background:var(--cream);border-radius:5px;overflow:hidden;border:1px solid var(--border)}
  .mood-bar-fill{height:100%;border-radius:5px;transition:width .8s ease}
  .mood-row-pct{font-size:11px;color:var(--muted);width:32px;text-align:right}
  .journal-entry{padding:13px 0;border-bottom:1px solid var(--border)}
  .journal-entry:last-child{border-bottom:none}
  .journal-date{font-size:11px;color:var(--amber);font-weight:500;margin-bottom:4px}
  .journal-text{font-size:14px;color:var(--text);line-height:1.6}
  .journal-mood-tag{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:10px;font-size:11px;margin-top:5px}
  .buddy-avatar{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--teal-light),#d0eee8);display:flex;align-items:center;justify-content:center;font-size:22px;margin:0 auto 10px}
  .buddy-name{font-family:var(--serif);font-size:16px;color:var(--text);font-style:italic;margin-bottom:3px;text-align:center}
  .buddy-status{font-size:12px;color:var(--muted);text-align:center}
  .buddy-streak-badge{display:inline-flex;align-items:center;gap:4px;background:var(--gold-light);border-radius:20px;padding:4px 10px;font-size:12px;color:#8a5c10;font-weight:500;margin-top:8px}
  .tips-scroll{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;margin-top:8px}
  .tips-scroll::-webkit-scrollbar{display:none}
  .tip-card{min-width:220px;background:var(--cream);border:1px solid var(--border);border-radius:16px;padding:16px;flex-shrink:0}
  .tip-icon{font-size:22px;margin-bottom:8px}
  .tip-text{font-size:13px;color:var(--text);line-height:1.55}
  .ai-insight-card{background:linear-gradient(135deg,#edf9f6,#e0f5f0);border:1px solid #c0e8de;border-radius:16px;padding:18px;margin-bottom:13px}
  .ai-insight-text{font-family:var(--serif);font-size:16px;font-weight:300;color:var(--text);font-style:italic;line-height:1.7;border-left:3px solid var(--teal);padding-left:14px}
  .ptab{padding:7px 16px;border-radius:20px;border:1px solid var(--border);background:transparent;cursor:pointer;font-family:var(--sans);font-size:12px;font-weight:500;color:var(--muted);transition:all .2s}
  .ptab.active{background:var(--amber);color:white;border-color:var(--amber)}
  .ptab-row{display:flex;gap:7px;margin-bottom:14px;flex-wrap:wrap}

  /* ── CHAT ── */
  .chat-wrap{display:flex;flex-direction:column;height:100%}
  .chat-messages{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding-bottom:6px;min-height:0}
  .chat-messages::-webkit-scrollbar{display:none}
  .bubble-row{display:flex;align-items:flex-end;gap:8px;animation:bIn .3s ease forwards}
  @keyframes bIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  .bubble-row.user{flex-direction:row-reverse}
  .avatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;background:var(--warm);border:1px solid var(--border)}
  .avatar.ai-av{background:linear-gradient(135deg,#f0e4d4,#e8d4c0);font-size:15px}
  .bubble{max-width:76%;padding:10px 14px;border-radius:18px;font-size:14px;line-height:1.6}
  .bubble.ai{background:var(--white);border:1px solid var(--border);color:var(--text);border-bottom-left-radius:4px;font-family:var(--serif);font-size:15px;font-weight:300;box-shadow:0 2px 10px rgba(0,0,0,.05)}
  .bubble.user{background:var(--amber);color:white;border-bottom-right-radius:4px;box-shadow:0 2px 10px rgba(196,149,106,.3)}
  .btime{font-size:10px;opacity:.45;margin-top:2px;text-align:right}
  .typing-bub{background:var(--white);border:1px solid var(--border);border-radius:18px;border-bottom-left-radius:4px;padding:12px 15px;display:flex;align-items:center;gap:5px}
  .tdot{width:7px;height:7px;border-radius:50%;background:var(--amber);opacity:.4;animation:tpulse 1.2s ease-in-out infinite}
  .tdot:nth-child(2){animation-delay:.2s}
  .tdot:nth-child(3){animation-delay:.4s}
  @keyframes tpulse{0%,60%,100%{transform:translateY(0);opacity:.3}30%{transform:translateY(-5px);opacity:1}}
  .quick-chips{display:flex;gap:7px;overflow-x:auto;padding-bottom:4px;margin-bottom:10px;flex-shrink:0}
  .quick-chips::-webkit-scrollbar{display:none}
  .chip{white-space:nowrap;padding:6px 13px;background:var(--white);border:1px solid var(--border);border-radius:20px;font-size:12px;color:var(--muted);cursor:pointer;transition:all .2s;font-family:var(--sans);flex-shrink:0}
  .chip:hover{background:var(--warm);border-color:var(--amber);color:var(--amber-deep)}
  .chat-input-bar{flex-shrink:0;padding-top:10px;border-top:1px solid var(--border)}
  .chat-input-row{display:flex;gap:9px;align-items:flex-end}
  .chat-input{flex:1;background:var(--white);border:1px solid var(--border);border-radius:20px;padding:10px 14px;font-family:var(--sans);font-size:14px;color:var(--text);outline:none;transition:border-color .2s;resize:none;max-height:90px;min-height:40px;line-height:1.4}
  .chat-input:focus{border-color:var(--amber)}
  .chat-input::placeholder{color:#c4b8a8}
  .send-btn{width:40px;height:40px;border-radius:50%;border:none;background:var(--amber);color:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;box-shadow:0 3px 12px rgba(196,149,106,.4)}
  .send-btn:not(:disabled):hover{background:var(--amber-deep);transform:scale(1.05)}
  .send-btn:disabled{opacity:.5;cursor:not-allowed}
  .chat-crisis{background:#f5f0ff;border:1px solid #d4c8f0;border-radius:14px;padding:12px 14px;margin-top:4px;font-size:13px;color:#6a50a0;line-height:1.6}
  .chat-crisis strong{display:block;margin-bottom:6px}

  /* ── PRIVACY POLICY ── */
  .policy-content{font-size:13px;color:var(--muted);line-height:1.8}
  .policy-content h3{font-family:var(--serif);font-size:17px;color:var(--text);font-weight:400;margin:18px 0 6px}
  .policy-content p{margin-bottom:10px}

  /* ── OAUTH BUTTONS ── */
  .oauth-divider{display:flex;align-items:center;gap:10px;margin:18px 0;color:var(--muted);font-size:12px;letter-spacing:.04em}
  .oauth-divider::before,.oauth-divider::after{content:'';flex:1;height:1px;background:var(--border)}

  .oauth-btn{
    width:100%;display:flex;align-items:center;justify-content:center;gap:11px;
    padding:13px 20px;border-radius:14px;border:1.5px solid var(--border);
    background:var(--white);cursor:pointer;font-family:var(--sans);font-size:14px;font-weight:500;
    color:var(--text);transition:all .2s;margin-bottom:10px;
    box-shadow:0 2px 8px rgba(0,0,0,.05);position:relative;overflow:hidden;
  }
  .oauth-btn:last-child{margin-bottom:0}
  .oauth-btn:hover{transform:translateY(-1px);box-shadow:0 5px 18px rgba(0,0,0,.1)}
  .oauth-btn:active{transform:translateY(0)}
  .oauth-btn:disabled{opacity:.55;cursor:not-allowed;transform:none}

  .oauth-btn-google:hover{border-color:#4285F4;box-shadow:0 5px 18px rgba(66,133,244,.14)}
  .oauth-btn-apple{background:#000;color:#fff;border-color:#000}
  .oauth-btn-apple:hover{background:#1a1a1a;border-color:#1a1a1a;box-shadow:0 5px 18px rgba(0,0,0,.25)}

  .oauth-spinner{width:18px;height:18px;border:2px solid rgba(0,0,0,.15);border-top-color:var(--amber);border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
  .oauth-spinner-white{border-color:rgba(255,255,255,.3);border-top-color:#fff}
  @keyframes spin{to{transform:rotate(360deg)}}

  /* Provider badge shown on account card */
  .provider-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:500;margin-top:6px}
  .provider-badge-google{background:#e8f0fe;color:#1558d6}
  .provider-badge-apple{background:#f0f0f0;color:#1a1a1a}
  .provider-badge-email{background:var(--warm);color:var(--amber-deep)}

  /* Setup banner shown when OAuth is not configured */
  .oauth-setup-note{background:linear-gradient(135deg,#fff8e8,#fef3d0);border:1px solid #f0d878;border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:12px;color:#8a6820;line-height:1.6}
  .oauth-setup-note code{background:rgba(0,0,0,.06);border-radius:4px;padding:1px 5px;font-size:11px;font-family:monospace}


/* ═══════════════════════════════════════════════════
   SMALL UTILS
═══════════════════════════════════════════════════ */
function Confetti() {
  const pieces = Array.from({length:26},(_,i)=>({id:i,color:["#d4a843","#e8a598","#9bafc4","#a89fc4","#c4a882","#b8d4c8"][i%6],left:`${Math.random()*100}%`,delay:`${Math.random()*.8}s`,duration:`${1.4+Math.random()*1.2}s`,size:`${6+Math.random()*6}px`,shape:Math.random()>.5?"50%":"2px"}));
  return <div className="confetti-wrap">{pieces.map(p=><div key={p.id} className="confetti-piece" style={{left:p.left,top:"-20px",background:p.color,width:p.size,height:p.size,borderRadius:p.shape,animationDelay:p.delay,animationDuration:p.duration}}/>)}</div>;
}

function GiftRevealOverlay({reward, onClose}) {
  return (<><Confetti/><div className="gift-overlay" onClick={onClose}><div className="gift-reveal-box" onClick={e=>e.stopPropagation()}><div className="gift-open-emoji">🎁</div><div className="gift-reveal-title">You <span>earned</span> this.</div><div className="gift-reveal-reward"><div className="gift-reveal-reward-label">Your reward</div><div className="gift-reveal-reward-text">{reward||"A moment just for you ✨"}</div></div><p style={{fontFamily:"var(--serif)",fontSize:15,color:"rgba(255,255,255,.5)",textAlign:"center",fontStyle:"italic",lineHeight:1.6}}>You showed up for yourself today. Enjoy every bit of this.</p><button className="gift-close-btn" onClick={onClose}>Enjoy your reward 🎉</button></div></div></>);
}

function ReminderBanner({reminder, onDismiss, onCheckin}) {
  const msg = REMINDER_MESSAGES[Math.floor(Math.random()*REMINDER_MESSAGES.length)];
  return <div className="reminder-banner"><div className="banner-top"><span className="banner-label">⏰ Reminder · {reminder.time}</span><button className="banner-close" onClick={onDismiss}>×</button></div><div className="banner-msg">{msg.body}</div><button className="banner-action" onClick={onCheckin}>Check in now →</button></div>;
}

function RingChart({pct=0, size=110, stroke=10, color="#c4956a"}) {
  const r=(size-stroke)/2, circ=2*Math.PI*r, dash=(pct/100)*circ;
  return <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0e9dc" strokeWidth={stroke}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={circ-dash} strokeLinecap="round" style={{transition:"stroke-dashoffset .8s ease"}}/></svg>;
}

/* ═══════════════════════════════════════════════════
   DISCLAIMER MODAL
═══════════════════════════════════════════════════ */
function DisclaimerModal({onAccept}) {
  return (
    <div className="modal-overlay">
      <div className="modal-sheet">
        <div className="modal-handle"/>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:40,marginBottom:10}}>💛</div>
          <div style={{fontFamily:"var(--serif)",fontSize:24,fontWeight:300,color:"var(--text)",marginBottom:8}}>A note before we begin</div>
        </div>
        <div style={{fontSize:14,color:"var(--muted)",lineHeight:1.8,marginBottom:20}}>
          <p style={{marginBottom:12}}><strong style={{color:"var(--text)",fontWeight:500}}>within</strong> is an emotional habit companion designed to support your wellbeing journey with warmth and empathy.</p>
          <p style={{marginBottom:12}}>This app <strong style={{color:"var(--text)",fontWeight:500}}>is not a substitute</strong> for professional mental health care, therapy, or medical advice. If you are experiencing a mental health crisis, please reach out to a qualified professional.</p>
          <p style={{marginBottom:12}}>The AI in this app is designed to be supportive and kind — but it is not a therapist, counsellor, or doctor.</p>
          <p>Crisis resources are always available within the app if you need them. 💜</p>
        </div>
        <div style={{background:"var(--cream)",borderRadius:14,padding:"14px 16px",marginBottom:20,border:"1px solid var(--border)"}}>
          <div style={{fontSize:12,fontWeight:600,color:"var(--text)",marginBottom:8}}>If you are in crisis right now:</div>
          {CRISIS_RESOURCES.map(r=><div key={r.name} style={{fontSize:13,color:"var(--muted)",marginBottom:4}}>→ <strong style={{color:"var(--text)",fontWeight:500}}>{r.name}:</strong> {r.info}</div>)}
        </div>
        <button className="btn btn-primary" onClick={onAccept}>I understand — let's begin</button>
        <div style={{fontSize:11,color:"var(--muted)",textAlign:"center",marginTop:12,lineHeight:1.6}}>By continuing, you confirm you have read and understood this notice.</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PRIVACY POLICY
═══════════════════════════════════════════════════ */
function PrivacyPolicyModal({onClose}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{maxHeight:"90vh"}} onClick={e=>e.stopPropagation()}>
        <div className="modal-handle"/>
        <div style={{fontFamily:"var(--serif)",fontSize:24,fontWeight:300,marginBottom:4,color:"var(--text)"}}>Privacy Policy</div>
        <div style={{fontSize:11,color:"var(--muted)",marginBottom:20}}>Last updated: March 2026 · Version {APP_VERSION}</div>
        <div className="policy-content">
          <h3>What we collect</h3>
          <p>within stores the following information locally on your device: your name, goal, and the reason why it matters to you; your daily mood check-ins and AI-generated nudges; journal entries you write; reminder times you set; rewards you earn; and your accountability buddy details.</p>
          <h3>How it's stored</h3>
          <p>All your data is stored locally on your device using this application's built-in storage. It is not transmitted to any external server, sold to third parties, or used for advertising. Your data belongs to you.</p>
          <h3>AI interactions</h3>
          <p>When you check in or chat, your goal, mood, and relevant context are sent to Anthropic's API to generate personalised responses. Anthropic processes this data according to their privacy policy at anthropic.com/privacy. We do not store your chat conversations beyond your current session.</p>
          <h3>Notifications</h3>
          <p>If you enable reminders, within will request permission to send you push notifications. This is processed locally by your device and browser. We do not use any external push notification service.</p>
          <h3>Your rights</h3>
          <p>You can export all your data at any time from Settings. You can delete all your data at any time from Settings. No account is required to use within.</p>
          <h3>Mental health disclaimer</h3>
          <p>within is not a medical device and does not provide medical advice, diagnosis, or treatment. It is not a substitute for professional mental health care. Always seek the advice of a qualified mental health professional with any questions you may have.</p>
          <h3>Contact</h3>
          <p>For privacy concerns, contact: privacy@within.app</p>
        </div>
        <div style={{height:16}}/>
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   JWT DECODER — parses Google / Apple identity tokens
═══════════════════════════════════════════════════ */
function decodeJwt(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/");
    const json = decodeURIComponent(atob(base64).split("").map(c=>"%"+("00"+c.charCodeAt(0).toString(16)).slice(-2)).join(""));
    return JSON.parse(json);
  } catch { return null; }
}

/* ═══════════════════════════════════════════════════
   GOOGLE SIGN-IN ICON SVG
═══════════════════════════════════════════════════ */
function GoogleIcon({size=20}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{flexShrink:0}}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════
   APPLE SIGN-IN ICON SVG
═══════════════════════════════════════════════════ */
function AppleIcon({size=20, color="#fff"}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{flexShrink:0}}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════
   AUTH SCREEN — Email + Google + Apple
═══════════════════════════════════════════════════ */
function AuthScreen({onAuth}) {
  const [authTab, setAuthTab]   = useState("login");
  const [name,    setName]      = useState("");
  const [email,   setEmail]     = useState("");
  const [pass,    setPass]      = useState("");
  const [pass2,   setPass2]     = useState("");
  const [error,   setError]     = useState("");
  const [info,    setInfo]      = useState("");
  const [loading, setLoading]   = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null); // "google"|"apple"|null
  const [showPrivacy, setShowPrivacy]   = useState(false);
  const googleBtnRef = useRef(null);

  const googleConfigured = Boolean(OAUTH.GOOGLE_CLIENT_ID);
  const appleConfigured  = Boolean(OAUTH.APPLE_SERVICE_ID);

  /* ── Load Google Identity Services ── */
  useEffect(() => {
    if (!googleConfigured) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => initGoogle();
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch {} };
  }, []);

  /* ── Load Apple JS SDK ── */
  useEffect(() => {
    if (!appleConfigured) return;
    const script = document.createElement("script");
    script.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
    script.async = true;
    script.onload = () => {
      try {
        window.AppleID.auth.init({
          clientId:    OAUTH.APPLE_SERVICE_ID,
          scope:       "name email",
          redirectURI: OAUTH.APPLE_REDIRECT_URI,
          usePopup:    true,
        });
      } catch {}
    };
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch {} };
  }, []);

  function initGoogle() {
    try {
      window.google.accounts.id.initialize({
        client_id: OAUTH.GOOGLE_CLIENT_ID,
        callback:  handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
    } catch {}
  }

  /* ── Google credential callback ── */
  async function handleGoogleCredential(response) {
    setOauthLoading("google");
    setError("");
    try {
      const payload = decodeJwt(response.credential);
      if (!payload?.email) throw new Error("Could not read account info from Google.");
      const uid     = "google_" + payload.sub;
      const session = {
        uid, provider: "google",
        name:   payload.name  || payload.email.split("@")[0],
        email:  payload.email,
        avatar: payload.picture || null,
        loggedInAt: Date.now(),
      };
      // Upsert in users store so email auth doesn't conflict
      const users = (await load(SK.users)) || {};
      if (!users[session.email]) {
        users[session.email] = { uid, name: session.name, email: session.email, provider: "google" };
        await save(SK.users, users);
      }
      await save(SK.auth, session);
      onAuth(session);
    } catch (e) {
      setError(e.message || "Google sign-in failed. Please try again.");
    } finally { setOauthLoading(null); }
  }

  /* ── Trigger Google One-Tap / popup ── */
  async function signInWithGoogle() {
    if (!googleConfigured) {
      setError("Google Sign-In is not configured yet. See DEPLOY.md for setup instructions.");
      return;
    }
    setOauthLoading("google");
    setError("");
    try {
      if (!window.google?.accounts?.id) throw new Error("Google SDK not loaded yet. Please wait a moment and try again.");
      window.google.accounts.id.prompt(notification => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One-tap not available — show popup button fallback
          if (googleBtnRef.current) {
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              type: "standard", shape: "rectangular",
              theme: "outline", size: "large", width: 320,
            });
            googleBtnRef.current.querySelector("div[role=button]")?.click();
          }
        }
        setOauthLoading(null);
      });
    } catch (e) {
      setError(e.message || "Google sign-in failed.");
      setOauthLoading(null);
    }
  }

  /* ── Apple Sign In ── */
  async function signInWithApple() {
    if (!appleConfigured) {
      setError("Apple Sign-In is not configured yet. See DEPLOY.md for setup instructions.");
      return;
    }
    setOauthLoading("apple");
    setError("");
    try {
      if (!window.AppleID?.auth) throw new Error("Apple SDK not loaded yet. Please try again.");
      const response = await window.AppleID.auth.signIn();
      // Decode identity token
      const payload = decodeJwt(response.authorization.id_token);
      // Apple only sends name on FIRST sign-in
      const firstName = response.user?.name?.firstName || "";
      const lastName  = response.user?.name?.lastName  || "";
      const fullName  = [firstName, lastName].filter(Boolean).join(" ") || payload?.email?.split("@")[0] || "Apple User";
      const emailAddr = payload?.email || response.user?.email || "";
      if (!emailAddr) throw new Error("Could not read email from Apple. Please try again.");
      const uid = "apple_" + payload.sub;
      const session = {
        uid, provider: "apple",
        name:   fullName,
        email:  emailAddr,
        avatar: null,
        loggedInAt: Date.now(),
      };
      // Persist name — Apple won't send it again on future logins
      const users = (await load(SK.users)) || {};
      if (!users[emailAddr]) {
        users[emailAddr] = { uid, name: fullName, email: emailAddr, provider: "apple" };
      } else {
        // Restore saved name on subsequent logins
        session.name = users[emailAddr].name || fullName;
      }
      await save(SK.users, users);
      await save(SK.auth, session);
      onAuth(session);
    } catch (e) {
      if (e?.error === "popup_closed_by_user") { /* silently ignore cancel */ }
      else setError(e.message || "Apple sign-in failed. Please try again.");
    } finally { setOauthLoading(null); }
  }

  /* ── Email register ── */
  async function handleRegister() {
    setError(""); setInfo("");
    if (!name.trim())         return setError("Please enter your name.");
    if (!email.includes("@")) return setError("Please enter a valid email address.");
    if (pass.length < 6)      return setError("Password must be at least 6 characters.");
    if (pass !== pass2)       return setError("Passwords don't match.");
    setLoading(true);
    try {
      const users = (await load(SK.users)) || {};
      if (users[email.toLowerCase()]) { setError("An account with this email already exists. Try signing in."); return; }
      const hash = await hashPassword(pass);
      const uid  = Date.now().toString(36);
      users[email.toLowerCase()] = { uid, name:name.trim(), email:email.toLowerCase(), hash, provider:"email" };
      await save(SK.users, users);
      const session = { uid, name:name.trim(), email:email.toLowerCase(), provider:"email", loggedInAt:Date.now() };
      await save(SK.auth, session);
      onAuth(session);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  /* ── Email login ── */
  async function handleLogin() {
    setError(""); setInfo("");
    if (!email.includes("@")) return setError("Please enter your email address.");
    if (!pass)                 return setError("Please enter your password.");
    setLoading(true);
    try {
      const users = (await load(SK.users)) || {};
      const user  = users[email.toLowerCase()];
      if (!user)        { setError("No account found with this email. Try creating one."); return; }
      if (!user.hash)   { setError("This account uses social sign-in. Use the Google or Apple button."); return; }
      const hash = await hashPassword(pass);
      if (hash !== user.hash) { setError("Incorrect password. Please try again."); return; }
      const session = { uid:user.uid, name:user.name, email:user.email, provider:"email", loggedInAt:Date.now() };
      await save(SK.auth, session);
      onAuth(session);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  const anyLoading = loading || Boolean(oauthLoading);
  const showSetupNote = !googleConfigured || !appleConfigured;

  return (
    <>
      {showPrivacy && <PrivacyPolicyModal onClose={()=>setShowPrivacy(false)}/>}
      <div className="auth-screen">
        <div className="auth-blob-1"/><div className="auth-blob-2"/>
        <div className="auth-inner">

          {/* Logo + tagline */}
          <div className="auth-logo">with<span>in</span></div>
          <div className="auth-tagline">
            A companion that meets you where<br/>you are — not where you think<br/>you should be.
          </div>

          <div className="auth-card">

            {/* Setup note for developers */}
            {showSetupNote && (
              <div className="oauth-setup-note">
                <strong style={{display:"block",marginBottom:4}}>🔧 Developer setup needed</strong>
                Add your credentials to <code>OAUTH.GOOGLE_CLIENT_ID</code> and <code>OAUTH.APPLE_SERVICE_ID</code> at the top of the file. See <strong>DEPLOY.md</strong> for step-by-step instructions.
              </div>
            )}

            {/* ── Social buttons ── */}
            {/* Google */}
            <button
              className="oauth-btn oauth-btn-google"
              onClick={signInWithGoogle}
              disabled={anyLoading}
            >
              {oauthLoading==="google"
                ? <div className="oauth-spinner"/>
                : <GoogleIcon/>
              }
              Continue with Google
            </button>

            {/* Hidden Google button container (fallback renderer) */}
            <div ref={googleBtnRef} style={{display:"none"}}/>

            {/* Apple */}
            <button
              className="oauth-btn oauth-btn-apple"
              onClick={signInWithApple}
              disabled={anyLoading}
              style={{marginBottom:0}}
            >
              {oauthLoading==="apple"
                ? <div className="oauth-spinner oauth-spinner-white"/>
                : <AppleIcon/>
              }
              Continue with Apple
            </button>

            <div className="oauth-divider">or continue with email</div>

            {/* ── Email auth ── */}
            <div className="auth-tabs">
              <button className={`auth-tab ${authTab==="login"?"active":""}`}    onClick={()=>{setAuthTab("login");setError("");setInfo("")}}>Sign in</button>
              <button className={`auth-tab ${authTab==="register"?"active":""}`} onClick={()=>{setAuthTab("register");setError("");setInfo("")}}>Create account</button>
            </div>

            {error && <div className="auth-error">⚠ {error}</div>}
            {info  && <div className="auth-success">✓ {info}</div>}

            {authTab==="register" && (
              <div style={{marginBottom:11}}>
                <label className="field-label">Your name</label>
                <input className="input input-sm" placeholder="e.g. Alex" value={name} onChange={e=>setName(e.target.value)} autoComplete="given-name" disabled={anyLoading}/>
              </div>
            )}
            <div style={{marginBottom:11}}>
              <label className="field-label">Email address</label>
              <input className="input input-sm" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" disabled={anyLoading}/>
            </div>
            <div style={{marginBottom:authTab==="register"?11:18}}>
              <label className="field-label">
                Password {authTab==="register"&&<span style={{fontWeight:300}}>(min. 6 characters)</span>}
              </label>
              <input className="input input-sm" type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)}
                autoComplete={authTab==="login"?"current-password":"new-password"} disabled={anyLoading}
                onKeyDown={e=>{if(e.key==="Enter"&&authTab==="login") handleLogin()}}/>
            </div>
            {authTab==="register" && (
              <div style={{marginBottom:18}}>
                <label className="field-label">Confirm password</label>
                <input className="input input-sm" type="password" placeholder="••••••••" value={pass2} onChange={e=>setPass2(e.target.value)}
                  autoComplete="new-password" disabled={anyLoading}
                  onKeyDown={e=>{if(e.key==="Enter") handleRegister()}}/>
              </div>
            )}
            <button className="btn btn-primary" disabled={anyLoading} onClick={authTab==="login"?handleLogin:handleRegister}>
              {loading
                ? <span className="loading" style={{justifyContent:"center"}}><div className="dot"/><div className="dot"/><div className="dot"/></span>
                : authTab==="login" ? "Sign in" : "Create my account"
              }
            </button>

          </div>

          <div className="auth-privacy">
            By continuing you agree to our <a onClick={()=>setShowPrivacy(true)}>Privacy Policy</a>.<br/>
            Your data is stored on your device and never sold.
          </div>
        </div>
      </div>
    </>
  );
}


/* ═══════════════════════════════════════════════════
   HABIT DETAIL
═══════════════════════════════════════════════════ */
function HabitDetail({profile, checkinHistory, streak, earnedRewards, journal, setJournal, buddy, setBuddy, onBack}) {
  const [view, setView]     = useState("overview");
  const [noteText, setNoteText] = useState("");
  const [buddyInput, setBuddyInput] = useState({name:"",tagline:""});
  const [aiInsight, setAiInsight] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [tipIdx] = useState(()=>Math.floor(Math.random()*HABIT_TIPS.length));

  const history = checkinHistory.length>=5 ? checkinHistory : generateSeedCheckins();
  const total   = history.length;
  const completed = history.filter(c=>c.completed!==false).length;
  const compRate  = total ? Math.round((completed/total)*100) : 0;
  const bestStreak = (()=>{ let b=0,c=0; history.forEach(x=>{if(x.completed!==false){c++;b=Math.max(b,c);}else c=0}); return b; })();

  const weeklyBars = Array.from({length:8},(_,wi)=>{
    const today=new Date(); today.setHours(0,0,0,0);
    const ws=new Date(today); ws.setDate(today.getDate()-((7-wi)*7));
    const we=new Date(ws); we.setDate(ws.getDate()+6);
    const days=history.filter(c=>{const d=c.isoDate?new Date(c.isoDate):null;return d&&d>=ws&&d<=we});
    return {label:ws.toLocaleDateString("en-US",{month:"short",day:"numeric"}),pct:days.length?Math.round((days.filter(d=>d.completed!==false).length/7)*100):0};
  });

  const heatCells=(()=>{
    const today=new Date(); today.setHours(0,0,0,0);
    const isoMap={}; history.forEach(c=>{if(c.isoDate)isoMap[c.isoDate]=c});
    const cells=[]; for(let i=90;i>=0;i--){const d=new Date(today);d.setDate(today.getDate()-i);const iso=d.toISOString().split("T")[0];cells.push({iso,entry:isoMap[iso],today:i===0});}
    const cols=[]; for(let c=0;c<13;c++) cols.push(cells.slice(c*7,c*7+7)); return cols;
  })();

  const heatColor=cell=>{ if(!cell.entry) return "#f0e9dc"; if(cell.entry.completed===false) return "#e8ddd0"; const m=MOODS.find(m=>m.id===cell.entry.mood); return m?m.color+"cc":"#c4956a99"; };

  const moodBreakdown=(()=>{ const counts={}; history.forEach(c=>{counts[c.mood]=(counts[c.mood]||0)+1}); const mx=Math.max(...Object.values(counts),1); return MOODS.map(m=>({...m,count:counts[m.id]||0,pct:Math.round(((counts[m.id]||0)/mx)*100)})); })();

  const last30=(()=>{
    const today=new Date(); today.setHours(0,0,0,0);
    const isoMap={}; history.forEach(c=>{if(c.isoDate)isoMap[c.isoDate]=c});
    return Array.from({length:30},(_,i)=>{const d=new Date(today);d.setDate(today.getDate()-29+i);const iso=d.toISOString().split("T")[0];return{iso,entry:isoMap[iso],label:d.toLocaleDateString("en-US",{day:"numeric"}),today:i===29};});
  })();

  const last14=history.slice(-14), last7c=last14.slice(7).filter(c=>c.completed!==false).length, prev7c=last14.slice(0,7).filter(c=>c.completed!==false).length;
  const trendStr=last7c>prev7c?"↑ trending up":last7c<prev7c?"↓ slight dip":"→ holding steady";

  useEffect(()=>{
    (async()=>{
      setInsightLoading(true);
      try {
        const dm=moodBreakdown.sort((a,b)=>b.count-a.count)[0]?.label;
        const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:200,system:"You are a warm, insightful habit coach. Give a brief, specific observation (2 sentences, no exclamation marks) based on the data. Write in second person.",messages:[{role:"user",content:`Goal: "${profile.goal}". Completion rate: ${compRate}%. Current streak: ${streak.count}. Best streak: ${bestStreak}. Total check-ins: ${total}. Most common mood: ${dm}. Write a personalised 2-sentence insight.`}]})});
        const data=await res.json();
        setAiInsight(data.content?.map(b=>b.text||"").join("").trim());
      } catch { setAiInsight("You've been showing up consistently — and that consistency, even through the hard days, is what real change is made of."); }
      finally { setInsightLoading(false); }
    })();
  },[]);

  const journalEntries=journal.length>0?journal:[{id:1,date:"Mar 15, 2026",text:"Today felt hard but I pushed through. The reminder helped.",mood:"tired"},{id:2,date:"Mar 12, 2026",text:"Something clicked this week. I think I understand why this habit matters now.",mood:"thriving"},{id:3,date:"Mar 8, 2026",text:"Missed two days. Feeling disappointed but trying not to spiral.",mood:"anxious"}];

  function addNote(){if(!noteText.trim())return;setJournal(prev=>[{id:Date.now(),date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),text:noteText.trim(),mood:"okay"},...prev]);setNoteText("");}

  return (
    <div className="screen screen-enter">
      <div className="habit-hero">
        <div className="habit-hero-top">
          <div><div style={{fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(255,255,255,.4)",marginBottom:6}}>Your habit</div><div className="habit-hero-title">{profile.goal||"Your Daily Practice"}</div></div>
          <button className="habit-hero-back" onClick={onBack}>← Back</button>
        </div>
        <div style={{display:"flex"}}>
          {[{v:compRate+"%",s:"Completion"},{v:streak.count,s:"Streak"},{v:bestStreak,s:"Best"},{v:total,s:"Check-ins"}].map(x=>(
            <div className="habit-stat" key={x.s}><div className="habit-stat-val">{x.v}</div><div className="habit-stat-sub">{x.s}</div></div>
          ))}
        </div>
      </div>

      {(aiInsight||insightLoading)&&<div className="ai-insight-card">{insightLoading?<div className="loading"><div className="dot"/><div className="dot"/><div className="dot"/><span>Analysing your progress...</span></div>:<div className="ai-insight-text">{aiInsight}</div>}</div>}

      <div className="ptab-row">
        {[{id:"overview",l:"Overview"},{id:"history",l:"History"},{id:"journal",l:"Journal"},{id:"buddy",l:"Buddy"}].map(t=>(
          <button key={t.id} className={`ptab ${view===t.id?"active":""}`} onClick={()=>setView(t.id)}>{t.l}</button>
        ))}
      </div>

      {view==="overview"&&(<>
        <div className="card" style={{textAlign:"center"}}>
          <div className="label">30-day completion</div>
          <div className="ring-wrap">
            <div style={{position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
              <RingChart pct={compRate} size={120} stroke={11}/>
              <div style={{position:"absolute",textAlign:"center"}}>
                <div style={{fontFamily:"var(--serif)",fontSize:36,color:"var(--amber)",fontWeight:300,lineHeight:1}}>{compRate}%</div>
                <div style={{fontSize:10,color:"var(--muted)"}}>done</div>
              </div>
            </div>
            <div style={{display:"flex",gap:24,justifyContent:"center",marginTop:8}}>
              {[{v:completed,l:"completed",c:"var(--teal)"},{v:total-completed,l:"missed",c:"var(--rose)"},{v:trendStr.split(" ")[0],l:trendStr.split(" ").slice(1).join(" "),c:"var(--amber)"}].map(x=>(
                <div key={x.l} style={{textAlign:"center"}}><div style={{fontFamily:"var(--serif)",fontSize:20,color:x.c,fontWeight:300}}>{x.v}</div><div style={{fontSize:11,color:"var(--muted)"}}>{x.l}</div></div>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="label">Weekly completion (8 weeks)</div>
          <div className="bar-chart">
            {weeklyBars.map((w,i)=>(
              <div className="bar-col" key={i}>
                <div style={{flex:1,display:"flex",alignItems:"flex-end",width:"100%"}}>
                  <div className="bar-fill" style={{height:`${Math.max(w.pct,4)}%`,background:w.pct>=70?"var(--teal)":w.pct>=40?"var(--amber)":"var(--rose)",opacity:.85}}/>
                </div>
                <div className="bar-lbl">{w.label.split(" ")[0]}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="label">Mood on check-in days</div>
          <div className="mood-chart">
            {moodBreakdown.sort((a,b)=>b.count-a.count).map(m=>(
              <div className="mood-row" key={m.id}>
                <div className="mood-row-label"><span>{m.emoji}</span><span style={{fontSize:11}}>{m.label}</span></div>
                <div className="mood-bar-track"><div className="mood-bar-fill" style={{width:`${m.pct}%`,background:m.color}}/></div>
                <div className="mood-row-pct">{m.count}x</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card"><div className="label">Tips for you</div><div className="tips-scroll">{[...HABIT_TIPS.slice(tipIdx),...HABIT_TIPS.slice(0,tipIdx)].map((t,i)=><div className="tip-card" key={i}><div className="tip-icon">{t.icon}</div><div className="tip-text">{t.tip}</div></div>)}</div></div>
      </>)}

      {view==="history"&&(<>
        <div className="card">
          <div className="label">13-week heatmap</div>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:8}}>Each cell = one day. Colour = mood that day.</div>
          <div style={{display:"flex",gap:3}}>
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} style={{height:12,fontSize:9,color:"var(--muted)",paddingRight:3,display:"flex",alignItems:"center"}}>{d}</div>)}
            </div>
            <div className="heatmap-grid" style={{flex:1}}>
              {heatCells.map((col,ci)=>(
                <div className="heatmap-col" key={ci}>
                  {col.map((cell,ri)=><div key={ri} className="heatmap-cell" title={cell.iso+(cell.entry?` · ${cell.entry.mood}`:"")} style={{background:heatColor(cell),border:cell.today?"2px solid var(--amber)":"none"}}/>)}
                </div>
              ))}
            </div>
          </div>
          <div className="heatmap-legend">
            <div className="heatmap-legend-swatch" style={{background:"#f0e9dc"}}/><span>No entry</span>
            {MOODS.map(m=><><div key={m.id} className="heatmap-legend-swatch" style={{background:m.color}}/><span>{m.emoji}</span></>)}
          </div>
        </div>
        <div className="card">
          <div className="label">Last 30 days</div>
          <div className="streak-timeline">
            {last30.map((d,i)=>{const done=d.entry&&d.entry.completed!==false;const m=d.entry?MOODS.find(x=>x.id===d.entry.mood):null;return <div key={i} className="streak-day" title={d.iso} style={{background:done?(m?.color||"var(--amber)")+"33":"var(--cream)",border:d.today?"2px solid var(--amber)":done?`2px solid ${m?.color||"var(--amber)"}66`:"1px solid var(--border)",color:done?"var(--text)":"var(--border)"}}>{done?(m?.emoji||"✓"):<span style={{fontSize:8}}>{d.label}</span>}</div>})}
          </div>
          <div style={{display:"flex",gap:14,marginTop:10,fontSize:11,color:"var(--muted)"}}>
            <span>🔥 Best: <b style={{color:"var(--amber)",fontFamily:"var(--serif)"}}>{bestStreak} days</b></span>
            <span>✓ Current: <b style={{color:"var(--teal)",fontFamily:"var(--serif)"}}>{streak.count} days</b></span>
          </div>
        </div>
        <div className="card"><div className="label">Recent log</div>{[...history].reverse().slice(0,10).map((c,i,arr)=>{const m=MOODS.find(x=>x.id===c.mood);return <div className="story-entry" key={i}>{i<arr.length-1&&<div className="story-line"/>}<div className="story-dot" style={{background:c.completed===false?"var(--border)":m?.color}}/><div><div className="story-date">{c.isoDate||c.date} · {m?.emoji} {m?.label}{c.completed===false?" · missed":""}</div><div className="story-note">{c.note}</div></div></div>})}</div>
      </>)}

      {view==="journal"&&(<>
        <div style={{padding:"0 0 12px"}}><div className="subtext">Write freely. This is your private reflection space.</div></div>
        <div className="card">
          <div className="label">Add a note</div>
          <textarea className="input input-sm" style={{minHeight:70}} rows={3} placeholder="How do you feel about your progress? What's working? What's hard?" value={noteText} onChange={e=>setNoteText(e.target.value)}/>
          <div style={{height:10}}/>
          <button className="btn btn-primary" disabled={!noteText.trim()} onClick={addNote}>Save note</button>
        </div>
        <div className="card"><div className="label">Your notes</div>{journalEntries.length===0&&<p className="subtext" style={{padding:"8px 0"}}>No notes yet. Add your first reflection above 🌿</p>}{journalEntries.map((e,i)=>{const m=MOODS.find(x=>x.id===e.mood);return <div className="journal-entry" key={e.id}><div className="journal-date">{e.date}</div><div className="journal-text">{e.text}</div>{m&&<div className="journal-mood-tag" style={{background:m.color+"22",color:m.color}}>{m.emoji} {m.label}</div>}</div>})}</div>
      </>)}

      {view==="buddy"&&(<>
        <div style={{padding:"0 0 12px"}}><div className="subtext">Accountability partners increase follow-through by up to 65%. Add someone who'll cheer you on.</div></div>
        {buddy?.name?(
          <div className="card">
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"8px 0 16px"}}>
              <div className="buddy-avatar">🤝</div>
              <div className="buddy-name">{buddy.name}</div>
              <div className="buddy-status">{buddy.tagline||"Your accountability partner"}</div>
              <div className="buddy-streak-badge">🔥 Both on a {Math.min(streak.count,buddy.streak||3)}-day streak</div>
            </div>
            <div className="divider"/>
            <div className="label">This week</div>
            <div style={{display:"flex",gap:10,marginBottom:14}}>
              {[{name:"You",pct:compRate,color:"var(--amber)"},{name:buddy.name.split(" ")[0],pct:buddy.compRate||72,color:"var(--teal)"}].map(p=>(
                <div key={p.name} style={{flex:1,background:"var(--cream)",borderRadius:12,padding:"12px",textAlign:"center",border:"1px solid var(--border)"}}>
                  <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
                    <div style={{position:"relative",display:"inline-flex"}}>
                      <RingChart pct={p.pct} size={72} stroke={7} color={p.color}/>
                      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--serif)",fontSize:16,color:p.color}}>{p.pct}%</div>
                    </div>
                  </div>
                  <div style={{fontSize:13,color:"var(--text)",fontWeight:500}}>{p.name}</div>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost" style={{fontSize:13}} onClick={()=>setBuddy(null)}>Remove buddy</button>
          </div>
        ):(
          <div className="card">
            <div className="label">Add an accountability buddy</div>
            <div style={{height:8}}/>
            <input className="input input-sm" placeholder="Their name" value={buddyInput.name} onChange={e=>setBuddyInput(p=>({...p,name:e.target.value}))} style={{marginBottom:10}}/>
            <input className="input input-sm" placeholder="A note — e.g. my friend Sarah" value={buddyInput.tagline} onChange={e=>setBuddyInput(p=>({...p,tagline:e.target.value}))} style={{marginBottom:16}}/>
            <button className="btn btn-teal" disabled={!buddyInput.name.trim()} onClick={()=>{setBuddy({name:buddyInput.name,tagline:buddyInput.tagline,streak:3,compRate:72});setBuddyInput({name:"",tagline:""});}}>Add {buddyInput.name||"buddy"}</button>
          </div>
        )}
        <div className="card card-teal">
          <div className="label">Why it works</div>
          {["Sharing your goal publicly raises commitment","Knowing someone is watching keeps you honest","Celebrating wins together makes them more real","A buddy helps you bounce back faster after a miss"].map((t,i)=><div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",fontSize:13,color:"#2a5c50",lineHeight:1.5,marginBottom:i<3?8:0}}><span style={{color:"var(--teal)",fontWeight:600,flexShrink:0}}>{i+1}.</span><span>{t}</span></div>)}
        </div>
      </>)}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CHAT SCREEN
═══════════════════════════════════════════════════ */
function ChatScreen({profile, checkinHistory}) {
  const [messages, setMessages] = useState([{role:"ai",text:profile.name?`Hey ${profile.name}. Whatever's on your mind — I'm here for it.`:"I'm here. Whatever's on your mind — share it.",time:"now"}]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);
  const bottomRef = useRef(null);
  const taRef = useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages,thinking]);
  const nowTime=()=>new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  const CRISIS_KW=["suicide","end it","kill myself","don't want to be here","can't go on","no point","hurt myself","self harm","want to die"];
  async function send(text) {
    if(!text.trim()||thinking) return;
    const userMsg={role:"user",text:text.trim(),time:nowTime()};
    const history=[...messages,userMsg];
    setMessages(history); setInput("");
    if(taRef.current) taRef.current.style.height="40px";
    if(CRISIS_KW.some(k=>text.toLowerCase().includes(k))) setShowCrisis(true);
    setThinking(true);
    const recentMoods=checkinHistory.slice(-5).map(c=>c.mood).join(", ");
    const sys=[`You are a warm, emotionally intelligent companion — like a caring, wise friend.`,`Listen deeply, validate feelings, never lecture. 2–4 sentences. Never start with "I" or hollow affirmations like "Of course" or "Absolutely".`,profile.name?`Name: ${profile.name}.`:"",profile.goal?`Goal: "${profile.goal}"`:"",profile.why?`Why: "${profile.why}"`:"",recentMoods?`Recent moods: ${recentMoods}`:"",`If the person expresses crisis or suicidal thoughts, respond with deep compassion and gently encourage them to reach out to a crisis line.`].filter(Boolean).join(" ");
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:sys,messages:history.map(m=>({role:m.role==="ai"?"assistant":"user",content:m.text}))})});
      const data=await res.json();
      if(data.error) throw new Error(data.error.message);
      setMessages(prev=>[...prev,{role:"ai",text:data.content?.map(b=>b.text||"").join("").trim()||"I'm here with you.",time:nowTime()}]);
    } catch { setMessages(prev=>[...prev,{role:"ai",text:"I'm still here. Take your time.",time:nowTime()}]); }
    finally { setThinking(false); }
  }
  return (
    <div className="chat-wrap" style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"8px 0 12px",flexShrink:0}}><div className="display" style={{fontSize:24}}>Talk to <em>me.</em></div><p className="subtext" style={{marginTop:6}}>No judgment. No agenda. Just space for you.</p></div>
      {messages.length<=1&&<div className="quick-chips">{CHAT_PROMPTS.map(p=><button key={p} className="chip" onClick={()=>send(p)}>{p}</button>)}</div>}
      <div className="chat-messages" style={{flex:1,minHeight:0,overflowY:"auto"}}>
        {messages.map((m,i)=>(
          <div key={i} className={`bubble-row ${m.role==="user"?"user":""}`}>
            {m.role==="ai"&&<div className="avatar ai-av">🌿</div>}
            <div><div className={`bubble ${m.role==="ai"?"ai":"user"}`}>{m.text}</div><div className="btime" style={{color:m.role==="user"?"rgba(196,149,106,.7)":"var(--muted)"}}>{m.time}</div></div>
            {m.role==="user"&&<div className="avatar">🙂</div>}
          </div>
        ))}
        {thinking&&<div className="bubble-row"><div className="avatar ai-av">🌿</div><div className="typing-bub"><div className="tdot"/><div className="tdot"/><div className="tdot"/></div></div>}
        {showCrisis&&(
          <div className="chat-crisis">
            <strong>💜 You're not alone in this</strong>
            {CRISIS_RESOURCES.map(r=>(
              <div key={r.name} style={{marginBottom:6}}>
                <div style={{fontSize:13,fontWeight:500,color:"#5a4080"}}>{r.name}</div>
                <div style={{fontSize:12,color:"#8a70b0"}}>{r.info}</div>
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      <div className="chat-input-bar"><div className="chat-input-row">
        <textarea ref={taRef} className="chat-input" placeholder="Share what's on your mind..." value={input} rows={1}
          onChange={e=>{setInput(e.target.value);e.target.style.height="40px";e.target.style.height=Math.min(e.target.scrollHeight,90)+"px"}}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input)}}}/>
        <button className="send-btn" onClick={()=>send(input)} disabled={!input.trim()||thinking}>↑</button>
      </div></div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════ */
export default function App() {
  /* ── state ── */
  const [appReady, setAppReady]   = useState(false);
  const [page, setPage]           = useState("loading");
  const [tab, setTab]             = useState("home");
  const [sk, setSk]               = useState(0);
  const [showHabitDetail, setShowHabitDetail] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  /* ── auth ── */
  const [authUser, setAuthUser]   = useState(null);

  /* ── disclaimer ── */
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  /* ── offline ── */
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  /* ── profile & data ── */
  const [profile, setProfile]     = useState({name:"",goal:"",why:"",reward:"",customReward:""});
  const [mood, setMood]           = useState(null);
  const [aiMsg, setAiMsg]         = useState("");
  const [nudge, setNudge]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [giftUnlocked, setGiftUnlocked] = useState(false);
  const [showGift, setShowGift]   = useState(false);
  const [jTab, setJTab]           = useState("story");
  const [checkinHistory, setCheckinHistory] = useState([]);
  const [earnedRewards, setEarnedRewards]   = useState([]);
  const [streak, setStreak]       = useState({count:0,lastDate:""});
  const [reminders, setReminders] = useState([]);
  const [activeReminder, setActiveReminder] = useState(null);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newTime, setNewTime]     = useState("08:00");
  const [newDays, setNewDays]     = useState([1,2,3,4,5]);
  const [notifPerm, setNotifPerm] = useState("default");
  const [journal, setJournal]     = useState([]);
  const [buddy, setBuddy]         = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");

  const activeReward = profile.customReward||profile.reward;
  const isCrisis     = mood?.id==="low";
  const moodColor    = MOODS.find(m=>m.id===mood?.id)?.color||"#c4956a";

  /* ── offline listener ── */
  useEffect(()=>{
    const on=()=>setIsOffline(false), off=()=>setIsOffline(true);
    window.addEventListener("online",on); window.addEventListener("offline",off);
    return ()=>{ window.removeEventListener("online",on); window.removeEventListener("offline",off); };
  },[]);

  /* ── initial load ── */
  useEffect(()=>{
    (async()=>{
      try {
        const [auth,disc,prof,ci,rw,str,rem,jnl,bud]=await Promise.all([
          load(SK.auth),load(SK.disclaimer),load(SK.profile),load(SK.checkins),
          load(SK.rewards),load(SK.streak),load(SK.reminders),load(SK.journal),load(SK.buddy)
        ]);
        if(auth) setAuthUser(auth);
        if(prof) setProfile(prof);
        if(ci)   setCheckinHistory(ci);
        if(rw)   setEarnedRewards(rw);
        if(str)  setStreak(str);
        if(rem)  setReminders(rem);
        if(jnl)  setJournal(jnl);
        if(bud)  setBuddy(bud);
        if("Notification" in window) setNotifPerm(Notification.permission);
        if(!auth)       setPage("auth");
        else if(!disc)  { setPage("main"); setShowDisclaimer(true); }
        else if(!prof?.goal) setPage("onboard");
        else            setPage("main");
      } catch { setPage("auth"); }
      finally { setAppReady(true); }
    })();
    // Service Worker for background notifications
    if("serviceWorker" in navigator) {
      try {
        const swCode=`self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window'}).then(cls=>{for(const c of cls)if(c.url&&'focus'in c)return c.focus();if(clients.openWindow)return clients.openWindow('/');}))});self.addEventListener('message',e=>{if(e.data&&e.data.type==='SHOW_NOTIFICATION')self.registration.showNotification(e.data.title,e.data.options);});`;
        const blob=new Blob([swCode],{type:"text/javascript"});
        navigator.serviceWorker.register(URL.createObjectURL(blob)).catch(()=>{});
      } catch {}
    }
  },[]);

  /* ── persist ── */
  useEffect(()=>{ if(appReady) save(SK.profile,profile); },[profile,appReady]);
  useEffect(()=>{ if(appReady) save(SK.checkins,checkinHistory); },[checkinHistory,appReady]);
  useEffect(()=>{ if(appReady) save(SK.rewards,earnedRewards); },[earnedRewards,appReady]);
  useEffect(()=>{ if(appReady) save(SK.streak,streak); },[streak,appReady]);
  useEffect(()=>{ if(appReady) save(SK.reminders,reminders); },[reminders,appReady]);
  useEffect(()=>{ if(appReady) save(SK.journal,journal); },[journal,appReady]);
  useEffect(()=>{ if(appReady&&buddy!==null) save(SK.buddy,buddy); },[buddy,appReady]);

  /* ── reminder interval ── */
  useEffect(()=>{
    function fireNotif(r) {
      const msg=REMINDER_MESSAGES[Math.floor(Math.random()*REMINDER_MESSAGES.length)];
      const opts={body:msg.body,icon:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%23c4956a'/%3E%3Ctext x='32' y='44' text-anchor='middle' font-size='34' fill='white'%3E🌿%3C/text%3E%3C/svg%3E",tag:`within-${r.id}`,renotify:true,vibrate:[200,100,200],silent:false};
      try {
        if(navigator.serviceWorker?.controller) navigator.serviceWorker.controller.postMessage({type:"SHOW_NOTIFICATION",title:msg.title,options:opts});
        else new Notification(msg.title,opts);
      } catch(e) { try { new Notification(msg.title,{body:opts.body,icon:opts.icon}); } catch {} }
    }
    const iv=setInterval(()=>{
      const now=new Date(), hhmm=`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`, day=now.getDay();
      const t=reminders.find(r=>r.enabled&&r.time===hhmm&&r.days.includes(day)&&r.lastFired!==hhmm);
      if(t){ if(Notification.permission==="granted") fireNotif(t); if(!activeReminder) setActiveReminder(t); setReminders(prev=>prev.map(r=>r.id===t.id?{...r,lastFired:hhmm}:r)); }
    },15000);
    return ()=>clearInterval(iv);
  },[reminders,activeReminder]);

  /* ── helpers ── */
  const goMain=(t)=>{setSk(k=>k+1);setPage("main");setTab(t);setShowHabitDetail(false)};

  function handleAuth(session) {
    setAuthUser(session); save(SK.auth,session);
    setProfile(prev=>({...prev,name:prev.name||session.name}));
    setPage("main"); setShowDisclaimer(true);
  }

  function handleLogout() {
    if(!window.confirm("Sign out of within?")) return;
    save(SK.auth,null); setAuthUser(null); setPage("auth");
  }

  function handleAcceptDisclaimer() {
    save(SK.disclaimer,{accepted:true,at:Date.now()});
    setShowDisclaimer(false);
    if(!profile.goal) setPage("onboard");
  }

  function handleBegin() {
    setStreak({count:1,lastDate:new Date().toDateString()});
    goMain("home");
  }

  async function checkin() {
    if(!mood) return;
    setLoading(true); setAiMsg(""); setNudge(""); setDone(false); setGiftUnlocked(false);
    goMain("response");
    const today=new Date().toDateString(), yesterday=new Date(Date.now()-86400000).toDateString();
    setStreak(prev=>({count:prev.lastDate===yesterday?prev.count+1:prev.lastDate===today?prev.count:1,lastDate:today}));
    const recentMoods=checkinHistory.slice(-7).map(c=>`${c.date}:${c.mood}`).join(", ");
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:"You are a warm, emotionally intelligent companion. Use history to personalise. No hollow affirmations. No exclamation marks.",messages:[{role:"user",content:[profile.name?`Name: ${profile.name}.`:"",`Goal: "${profile.goal}". Why: "${profile.why}". Mood: ${mood.label}.`,recentMoods?`Recent moods: ${recentMoods}.`:"",`Return JSON only: {"message":"2-3 warm personalised sentences","nudge":"one tiny guilt-free action, max 10 words"}`].filter(Boolean).join(" ")}]})});
      const data=await res.json();
      if(data.error) throw new Error(data.error.message);
      const parsed=JSON.parse(data.content?.map(b=>b.text||"").join("").replace(/```json|```/g,"").trim());
      setAiMsg(parsed.message); setNudge(parsed.nudge);
      setCheckinHistory(prev=>[...prev.slice(-29),{isoDate:new Date().toISOString().split("T")[0],date:new Date().toLocaleDateString("en-US",{weekday:"short"}),mood:mood.id,completed:true,note:parsed.message.slice(0,60)+"…",nudge:parsed.nudge}]);
    } catch {
      setAiMsg("Even pausing to check in with yourself today is meaningful. You're here — that matters.");
      setNudge("Take one slow, intentional breath.");
    } finally { setLoading(false); }
  }

  function handleTaskDone(){setDone(true);setGiftUnlocked(true)}
  function handleOpenGift(){setShowGift(true)}
  function handleCloseGift(){
    setShowGift(false);
    if(activeReward) setEarnedRewards(prev=>[{emoji:"🎁",label:activeReward,date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),opened:true},...prev]);
    setGiftUnlocked(false); setDone(false); goMain("rewards");
  }

  async function requestNotifPermission(){
    if(!("Notification" in window)) return "unsupported";
    if(Notification.permission==="granted"){setNotifPerm("granted");return "granted";}
    if(Notification.permission==="denied"){setNotifPerm("denied");return "denied";}
    const r=await Notification.requestPermission(); setNotifPerm(r); return r;
  }

  async function addReminder(){
    if(!newTime) return;
    const perm=await requestNotifPermission();
    setReminders(prev=>[...prev,{id:Date.now(),time:newTime,days:newDays,enabled:true,lastFired:""}]);
    setShowAddReminder(false); setNewDays([1,2,3,4,5]); setNewTime("08:00");
    if(perm==="granted"){ setTimeout(()=>{ try{ new Notification("Reminder saved! 🌿",{body:`within will remind you at ${newTime}.`,icon:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%23c4956a'/%3E%3Ctext x='32' y='44' text-anchor='middle' font-size='34' fill='white'%3E🌿%3C/text%3E%3C/svg%3E"}); }catch{} },500); }
  }
  function toggleReminder(id){setReminders(prev=>prev.map(r=>r.id===id?{...r,enabled:!r.enabled}:r))}
  function deleteReminder(id){setReminders(prev=>prev.filter(r=>r.id!==id))}

  function startEdit(field,val){setEditingField(field);setEditValue(val)}
  function saveEdit(){if(editingField)setProfile(prev=>({...prev,[editingField]:editValue}));setEditingField(null)}

  function exportData(){
    const payload={exportedAt:new Date().toISOString(),appVersion:APP_VERSION,profile,streak,checkinHistory,earnedRewards,journal,buddy,reminders:reminders.map(r=>({time:r.time,days:r.days.map(d=>DAYS[d]),enabled:r.enabled})),summary:{totalCheckins:checkinHistory.length,completionRate:checkinHistory.length?Math.round((checkinHistory.filter(c=>c.completed!==false).length/checkinHistory.length)*100):0,currentStreak:streak.count,journalEntries:journal.length,rewardsEarned:earnedRewards.length}};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`within-data-${new Date().toISOString().split("T")[0]}.json`; a.click(); URL.revokeObjectURL(url);
  }

  function clearAllData(){
    if(!window.confirm("This will permanently delete all your data and cannot be undone. Are you sure?")) return;
    setProfile({name:"",goal:"",why:"",reward:"",customReward:""}); setCheckinHistory([]); setEarnedRewards([]); setStreak({count:0,lastDate:""}); setReminders([]); setJournal([]); setBuddy(null);
    Object.values(SK).forEach(k=>{try{window.storage.delete(k);}catch{}});
    setPage("onboard");
  }

  const dominantMood=(()=>{ if(!checkinHistory.length) return null; const c={}; checkinHistory.slice(-7).forEach(x=>{c[x.mood]=(c[x.mood]||0)+1}); return Object.entries(c).sort((a,b)=>b[1]-a[1])[0]?.[0]; })();

  /* ── RENDER ── */
  if(page==="loading") return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#faf7f2"}}><style>{styles}</style><div className="loading"><div className="dot"/><div className="dot"/><div className="dot"/></div></div>;

  if(page==="auth") return <><style>{styles}</style><AuthScreen onAuth={handleAuth}/></>;

  return (
    <>
      <style>{styles}</style>
      {showGift&&<GiftRevealOverlay reward={activeReward} onClose={handleCloseGift}/>}
      {activeReminder&&<ReminderBanner reminder={activeReminder} onDismiss={()=>setActiveReminder(null)} onCheckin={()=>{setActiveReminder(null);goMain("home")}}/>}
      {showDisclaimer&&<DisclaimerModal onAccept={handleAcceptDisclaimer}/>}
      {showPrivacy&&<PrivacyPolicyModal onClose={()=>setShowPrivacy(false)}/>}
      {isOffline&&<div className="offline-bar">📵 You're offline — within still works, but AI responses are paused.</div>}

      <div className="app">
        <div className="blob blob-1"/><div className="blob blob-2"/><div className="blob blob-3"/>

        <nav className="nav">
          <div className="nav-logo">with<span>in</span></div>
          <div className="nav-right">
            {profile.name&&<span style={{fontFamily:"var(--serif)",fontSize:14,color:"var(--muted)",fontStyle:"italic"}}>hi, {profile.name}</span>}
            {page!=="onboard"&&<div className="nav-badge">🔥 {streak.count} day{streak.count!==1?"s":""}</div>}
          </div>
        </nav>

        <div className="content">

          {/* ══ ONBOARDING ══ */}
          {page==="onboard"&&(
            <div className="screen screen-enter" key={sk}>
              <div style={{padding:"8px 0 16px"}}>
                <div className="display">Your goal,<br/><em>your story.</em></div>
                <p className="subtext" style={{marginTop:8}}>A companion that meets you where you are — not where you think you should be.</p>
              </div>
              <div className="card">
                <div style={{marginBottom:12}}>
                  <label className="field-label">What's your name?</label>
                  <input className="input input-sm" placeholder="e.g. Alex" value={profile.name} onChange={e=>setProfile(p=>({...p,name:e.target.value}))} autoComplete="given-name"/>
                </div>
                <div style={{marginBottom:12}}>
                  <label className="field-label">What are you working toward?</label>
                  <textarea className="input" rows={2} placeholder="e.g. Write my novel, run a 5K, meditate daily..." value={profile.goal} onChange={e=>setProfile(p=>({...p,goal:e.target.value}))}/>
                </div>
                <div>
                  <label className="field-label">Why does this matter to you?</label>
                  <textarea className="input" rows={3} placeholder="This is your anchor. Be honest with yourself..." value={profile.why} onChange={e=>setProfile(p=>({...p,why:e.target.value}))}/>
                </div>
              </div>
              <div className="card card-gold">
                <div className="label">🎁 How will you reward yourself?</div>
                <p className="subtext" style={{marginBottom:10}}>Pick a treat to unlock when you complete a nudge.</p>
                <div className="reward-chips">{REWARD_SUGGESTIONS.map(s=><button key={s} className={`reward-chip ${profile.reward===s?"selected":""}`} onClick={()=>setProfile(p=>({...p,reward:s,customReward:""}))}>{s}</button>)}</div>
                <div style={{height:8}}/>
                <input className="input input-sm" placeholder="Or write your own reward..." value={profile.customReward} onChange={e=>setProfile(p=>({...p,customReward:e.target.value,reward:""}))}/>
              </div>
              <button className="btn btn-primary" disabled={!profile.goal.trim()||!profile.why.trim()} onClick={handleBegin} style={{marginBottom:20}}>Begin my journey</button>
            </div>
          )}

          {/* ══ MAIN ══ */}
          {page==="main"&&(
            <div className="screen screen-enter" key={sk} style={tab==="chat"?{height:"100%",display:"flex",flexDirection:"column"}:{}}>

              {showHabitDetail&&<HabitDetail profile={profile} checkinHistory={checkinHistory} streak={streak} earnedRewards={earnedRewards} journal={journal} setJournal={setJournal} buddy={buddy} setBuddy={setBuddy} onBack={()=>setShowHabitDetail(false)}/>}

              {!showHabitDetail&&<>

              {/* HOME */}
              {tab==="home"&&(<>
                <div style={{padding:"8px 0 14px"}}>
                  <div className="display">{profile.name?`Hey ${profile.name},`:"Good to see"}<br/><em>you today.</em></div>
                  <p className="subtext" style={{marginTop:7}}>How are you feeling right now?</p>
                </div>
                {profile.why&&<div className="why-card"><div className="why-label">Your why</div><div className="why-text">{profile.why}</div></div>}
                {activeReward&&<div className="gift-nudge-hint"><span style={{fontSize:20}}>🎁</span><span>Complete today's nudge to unlock: <strong style={{display:"block",marginTop:2}}>{activeReward}</strong></span></div>}
                {dominantMood&&checkinHistory.length>=3&&(()=>{const m=MOODS.find(x=>x.id===dominantMood);return <div className="insight" style={{marginTop:10}}><span>🔍</span><span>Your recent check-ins show a lot of {m?.emoji} {m?.label} days. {dominantMood==="low"||dominantMood==="anxious"?"That takes real strength to keep showing up.":"You've been holding steady."}</span></div>;})()}
                <div style={{height:12}}/>
                <div className="card">
                  <div className="label">Today's feeling</div>
                  <div className="mood-grid">{MOODS.map(m=><button key={m.id} className={`mood-btn ${mood?.id===m.id?"selected":""}`} onClick={()=>setMood(m)}><span className="mood-emoji">{m.emoji}</span><span className="mood-label">{m.label}</span></button>)}</div>
                  <div style={{height:13}}/>
                  <button className="btn btn-primary" disabled={!mood} onClick={checkin}>Check in with me</button>
                  <div style={{height:7}}/>
                  <button className="btn btn-ghost" onClick={()=>goMain("chat")}>💬 Just want to talk</button>
                  <div style={{height:7}}/>
                  <button className="btn btn-ghost" style={{borderColor:"var(--amber)",color:"var(--amber)"}} onClick={()=>setShowHabitDetail(true)}>📊 View habit progress</button>
                </div>
              </>)}

              {/* RESPONSE */}
              {tab==="response"&&(<>
                <div style={{padding:"8px 0 13px"}}><div className="label" style={{color:moodColor}}>{mood?.emoji} Feeling {mood?.label}</div><div className="display" style={{fontSize:24}}>Here's what<br/><em>I want to say.</em></div></div>
                <div className="card card-accent">{loading?<div className="loading"><div className="dot"/><div className="dot"/><div className="dot"/><span>Thinking of you...</span></div>:<p className="ai-message">{aiMsg}</p>}</div>
                {!loading&&nudge&&(
                  <div className="card">
                    <div className="label">One gentle step</div>
                    <div className="nudge"><span style={{fontSize:20}}>🌱</span><div className="nudge-text"><strong>Today's nudge</strong>{nudge}</div></div>
                    {!done&&!giftUnlocked&&(<>{activeReward&&<div className="gift-nudge-hint" style={{marginTop:9}}><span style={{fontSize:17}}>🎁</span><span style={{fontSize:12}}>Complete this to unlock your reward</span></div>}<button className="btn btn-ghost" style={{marginTop:10}} onClick={handleTaskDone}>✓ I did it</button></>)}
                    {giftUnlocked&&(<><div style={{display:"flex",alignItems:"center",gap:9,padding:"9px 0 3px"}}><span className="check">✓</span><span style={{fontSize:14,color:"#4caf50",fontFamily:"var(--serif)",fontStyle:"italic"}}>You did it. That took something real.</span></div><button className="gift-box-btn" onClick={handleOpenGift}><div className="gift-box-shine"/><div className="gift-ribbons"/><div className="gift-box-emoji">🎁</div><div className="gift-box-label">Your reward is waiting</div><div className="gift-box-sub">Tap to open your gift</div></button></>)}
                  </div>
                )}
                {isCrisis&&!loading&&(
                  <div className="crisis-banner">
                    <div className="crisis-title">💜 You're not alone in this</div>
                    {CRISIS_RESOURCES.map(r=>(
                      <div key={r.name} style={{marginBottom:8}}>
                        <div style={{fontSize:13,fontWeight:500,color:"#5a4080"}}>{r.name}</div>
                        <div style={{fontSize:12,color:"#8a70b0"}}>{r.info}</div>
                      </div>
                    ))}
                  </div>
                )}
                {!loading&&(<><div style={{height:6}}/><button className="btn btn-ghost" onClick={()=>goMain("chat")}>💬 Keep talking about this</button><div style={{height:6}}/><button className="btn btn-ghost" onClick={()=>{setDone(false);setGiftUnlocked(false);goMain("home")}}>← Back to home</button></>)}
              </>)}

              {/* CHAT */}
              {tab==="chat"&&<div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}><ChatScreen profile={profile} checkinHistory={checkinHistory}/></div>}

              {/* REWARDS */}
              {tab==="rewards"&&(<>
                <div style={{padding:"8px 0 13px"}}><div className="display">Your<br/><em>rewards.</em></div><p className="subtext" style={{marginTop:6}}>Things you've genuinely earned.</p></div>
                <div className="card card-gold">
                  <div className="label">🎁 Current reward</div>
                  {activeReward?<div style={{fontFamily:"var(--serif)",fontSize:17,color:"#8a5c10",fontStyle:"italic",marginBottom:11}}>{activeReward}</div>:<p className="subtext" style={{marginBottom:11}}>No reward set yet.</p>}
                  <div className="reward-chips">{REWARD_SUGGESTIONS.map(s=><button key={s} className={`reward-chip ${profile.reward===s?"selected":""}`} onClick={()=>setProfile(p=>({...p,reward:s,customReward:""}))}>{s}</button>)}</div>
                  <div style={{height:7}}/>
                  <input className="input input-sm" placeholder="Or write your own..." value={profile.customReward} onChange={e=>setProfile(p=>({...p,customReward:e.target.value,reward:""}))}/>
                </div>
                <div className="card">
                  <div className="label">Gifts you've opened</div>
                  {earnedRewards.map((r,i)=><div className="past-reward-row" key={i} style={i===earnedRewards.length-1?{borderBottom:"none"}:{}}><div className="past-reward-icon">{r.emoji}</div><div style={{flex:1}}><div style={{fontSize:14,color:"var(--text)"}}>{r.label}</div><div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{r.date}</div></div><div className="past-reward-badge">Earned ✓</div></div>)}
                  {earnedRewards.length===0&&<p className="subtext" style={{padding:"7px 0"}}>Complete a nudge to earn your first reward 🌱</p>}
                </div>
                <button className="btn btn-primary" onClick={()=>goMain("home")}>Start today's check-in →</button>
              </>)}

              {/* JOURNEY */}
              {tab==="journey"&&(<>
                <div style={{padding:"8px 0 13px"}}><div className="display">Your<br/><em>journey.</em></div></div>
                {profile.why&&<div className="why-card"><div className="why-label">Your why</div><div className="why-text">{profile.why}</div></div>}
                <button className="btn btn-ghost" style={{marginBottom:13,borderColor:"var(--amber)",color:"var(--amber)"}} onClick={()=>setShowHabitDetail(true)}>📊 View full habit detail →</button>
                <div className="tabs">{["story","week","stats"].map(t=><button key={t} className={`tab ${jTab===t?"active":""}`} onClick={()=>setJTab(t)} style={{textTransform:"capitalize"}}>{t}</button>)}</div>
                {jTab==="story"&&<div className="card"><div className="label">Recent check-ins</div>{checkinHistory.length===0&&<p className="subtext">Your story starts with your first check-in 🌱</p>}{[...checkinHistory].reverse().slice(0,7).map((c,i,arr)=>{const m=MOODS.find(m=>m.id===c.mood);return <div className="story-entry" key={i}>{i<arr.length-1&&<div className="story-line"/>}<div className="story-dot" style={{background:m?.color}}/><div><div className="story-date">{c.date} · {m?.emoji} {m?.label}</div><div className="story-note">{c.note}</div></div></div>})}</div>}
                {jTab==="week"&&<div className="card"><div className="label">Emotional landscape</div>{checkinHistory.length===0?<p className="subtext">Check in daily to see your landscape 🌿</p>:<div className="week-row">{checkinHistory.slice(-7).map((c,i)=>{const m=MOODS.find(m=>m.id===c.mood);const h={thriving:80,okay:55,tired:35,anxious:45,low:20}[c.mood]||40;return <div className="week-bar" key={i}><span className="week-bar-emoji">{m?.emoji}</span><div className="week-bar-fill" style={{height:h,background:m?.color+"aa",minHeight:10}}/><span className="week-bar-label">{c.date}</span></div>})}</div>}<div className="divider"/><p className="subtext" style={{fontSize:13}}>Every day you show up is a day in your story.</p></div>}
                {jTab==="stats"&&<div className="card"><div className="label">What you've built</div>{[{icon:"🔥",label:"Current streak",value:`${streak.count} day${streak.count!==1?"s":""}`},{icon:"💬",label:"Total check-ins",value:`${checkinHistory.length}`},{icon:"🎁",label:"Rewards earned",value:`${earnedRewards.length} gift${earnedRewards.length!==1?"s":""}`},{icon:"⏰",label:"Active reminders",value:`${reminders.filter(r=>r.enabled).length}`}].map(s=><div key={s.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid var(--border)"}}><div style={{display:"flex",gap:9,alignItems:"center"}}><span style={{fontSize:17}}>{s.icon}</span><span style={{fontSize:14,color:"var(--text)"}}>{s.label}</span></div><span style={{fontFamily:"var(--serif)",fontSize:16,color:"var(--amber)",fontWeight:300}}>{s.value}</span></div>)}</div>}
              </>)}

              {/* SETTINGS */}
              {tab==="settings"&&(()=>{
                const completionRate=checkinHistory.length?Math.round((checkinHistory.filter(c=>c.completed!==false).length/checkinHistory.length)*100):0;
                return (<>
                  <div style={{padding:"8px 0 14px"}}><div className="display">Settings &<br/><em>profile.</em></div></div>

                  {/* Account */}
                  {authUser&&<div className="card">
                    <div className="label">Account</div>
                    <div style={{display:"flex",alignItems:"center",gap:12,padding:"6px 0 14px"}}>
                      {authUser.avatar
                        ? <img src={authUser.avatar} style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--border)",flexShrink:0}} alt=""/>
                        : <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#f0e4d4,#e8d4c0)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--serif)",fontSize:18,color:"var(--amber)",border:"2px solid var(--border)",flexShrink:0}}>{authUser.name?.charAt(0)||"🌿"}</div>
                      }
                      <div>
                        <div style={{fontFamily:"var(--serif)",fontSize:16,color:"var(--text)",fontStyle:"italic"}}>{authUser.name}</div>
                        <div style={{fontSize:12,color:"var(--muted)",marginTop:1}}>{authUser.email}</div>
                        <div className={`provider-badge provider-badge-${authUser.provider||"email"}`}>
                          {authUser.provider==="google" && <><GoogleIcon size={11}/> Google</>}
                          {authUser.provider==="apple"  && <><AppleIcon  size={11} color="#1a1a1a"/> Apple</>}
                          {(!authUser.provider||authUser.provider==="email") && <>✉ Email</>}
                        </div>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:0,background:"var(--cream)",borderRadius:12,padding:"12px 0",marginBottom:14}}>
                      {[{v:streak.count,l:"Streak"},{v:checkinHistory.length,l:"Check-ins"},{v:completionRate+"%",l:"Done rate"}].map(s=><div key={s.l} style={{textAlign:"center",borderRight:"1px solid var(--border)"}} className="profile-stat"><div className="profile-stat-val" style={{fontSize:18}}>{s.v}</div><div className="profile-stat-label">{s.l}</div></div>)}
                      <div style={{gridColumn:"1/-1",borderTop:"none"}}></div>
                    </div>
                    <button className="btn btn-danger" style={{fontSize:13}} onClick={handleLogout}>Sign out</button>
                  </div>}

                  {/* Edit profile */}
                  <div className="card">
                    <div className="label">Your profile</div>
                    {[{field:"name",label:"Name",val:profile.name||"—"},{field:"goal",label:"Goal",val:profile.goal||"—"},{field:"why",label:"Why",val:profile.why||"—"}].map(row=>(
                      <div key={row.field}>
                        {editingField===row.field?(
                          <div style={{padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
                            <input className="input input-sm" value={editValue} onChange={e=>setEditValue(e.target.value)} autoFocus/>
                            <div style={{display:"flex",gap:8,marginTop:8}}><button className="btn btn-teal btn-sm" onClick={saveEdit}>Save</button><button className="btn btn-ghost btn-sm" onClick={()=>setEditingField(null)}>Cancel</button></div>
                          </div>
                        ):(
                          <div className="edit-row"><span className="edit-row-label">{row.label}</span><span className="edit-row-val" style={{fontSize:row.field==="name"?15:13}}>{row.val.length>40?row.val.slice(0,40)+"…":row.val}</span><button className="edit-row-btn" onClick={()=>startEdit(row.field,profile[row.field])}>Edit</button></div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Reminders */}
                  <div className="card card-teal">
                    <div className="label">⏰ Reminders</div>
                    <p className="subtext" style={{marginBottom:12}}>Set a time and within will send you a real notification on your device.</p>
                    <div className={`notif-bar ${notifPerm}`} style={{marginBottom:12}}>
                      {notifPerm==="granted"&&<><span style={{fontSize:18}}>🔔</span><div style={{flex:1}}><strong style={{display:"block",marginBottom:1}}>Notifications enabled</strong><span style={{fontSize:12}}>You'll receive alerts at the times you set.</span></div><span>✓</span></>}
                      {notifPerm==="denied"&&<><span style={{fontSize:18}}>🔕</span><div><strong style={{display:"block",marginBottom:1}}>Notifications blocked</strong><span style={{fontSize:12}}>Go to browser Settings → Notifications → Allow this site.</span></div></>}
                      {notifPerm==="default"&&<><span style={{fontSize:18}}>🔔</span><div style={{flex:1}}><strong style={{display:"block",marginBottom:1}}>Enable notifications</strong><span style={{fontSize:12}}>Allow within to reach you at the right time.</span></div><button style={{padding:"6px 14px",background:"var(--gold)",color:"#2d2418",border:"none",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",flexShrink:0}} onClick={requestNotifPermission}>Allow</button></>}
                    </div>
                    {reminders.length===0&&!showAddReminder&&<p className="subtext" style={{marginBottom:12,fontSize:13}}>No reminders yet. Add your first one below.</p>}
                    {reminders.map(r=>(
                      <div className="reminder-item" key={r.id}>
                        <div className="reminder-icon" style={{background:r.enabled?"var(--teal-light)":"var(--warm)"}}>{r.enabled?"⏰":"🔕"}</div>
                        <div className="reminder-info"><div className="reminder-time" style={{color:r.enabled?"var(--text)":"var(--muted)"}}>{r.time}</div><div className="reminder-days">{r.days.map(d=>DAYS[d]).join(", ")}</div></div>
                        <label className="reminder-toggle"><input type="checkbox" checked={r.enabled} onChange={()=>toggleReminder(r.id)}/><div className="toggle-track"/><div className="toggle-thumb"/></label>
                        <button style={{marginLeft:4,border:"none",background:"none",color:"#c4a8a8",fontSize:18,cursor:"pointer",padding:"0 4px"}} onClick={()=>deleteReminder(r.id)}>×</button>
                      </div>
                    ))}
                    {showAddReminder?(
                      <div className="add-reminder-form">
                        <div className="label">Time</div>
                        <input type="time" className="time-input" value={newTime} onChange={e=>setNewTime(e.target.value)}/>
                        <div className="label">Days</div>
                        <div className="day-chips">{DAYS.map((d,i)=><button key={i} className={`day-chip ${newDays.includes(i)?"on":""}`} onClick={()=>setNewDays(prev=>prev.includes(i)?prev.filter(x=>x!==i):[...prev,i])}>{d}</button>)}</div>
                        <div style={{display:"flex",gap:8}}><button className="btn btn-teal btn-sm" onClick={addReminder}>Save reminder</button><button className="btn btn-ghost btn-sm" onClick={()=>setShowAddReminder(false)}>Cancel</button></div>
                      </div>
                    ):(
                      <button className="btn btn-teal" style={{marginTop:reminders.length?12:0}} onClick={()=>setShowAddReminder(true)}>+ Add reminder</button>
                    )}
                  </div>

                  {notifPerm==="granted"&&<div className="card" style={{background:"var(--warm)"}}>
                    <div className="label">Test notification</div>
                    <p className="subtext" style={{marginBottom:12,fontSize:13}}>Verify notifications are working on your device.</p>
                    <button className="btn btn-ghost" onClick={()=>{try{new Notification("within is working! 🌿",{body:"Your reminders are set up correctly.",icon:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%23c4956a'/%3E%3Ctext x='32' y='44' text-anchor='middle' font-size='34' fill='white'%3E🌿%3C/text%3E%3C/svg%3E"});}catch{alert("Check your notifications panel!")}}}>Send test notification 🔔</button>
                  </div>}

                  {/* Data */}
                  <div className="card" style={{background:"linear-gradient(135deg,#f9f9ff,#f4f0ff)",border:"1px solid #ddd8f0"}}>
                    <div className="label" style={{color:"#7060a0"}}>📦 Your data</div>
                    <p style={{fontSize:13,color:"#6a5890",lineHeight:1.6,marginBottom:14}}>Your data is stored on this device and never shared with third parties.</p>
                    <button className="btn" style={{background:"#7060a0",color:"white",fontSize:13,padding:"11px",marginBottom:8}} onClick={exportData}>⬇ Export my data (.json)</button>
                    <button className="btn btn-ghost" onClick={()=>setShowPrivacy(true)} style={{fontSize:13}}>Privacy Policy</button>
                  </div>

                  {/* Danger */}
                  <div className="card" style={{border:"1px solid #f0d4d4",background:"var(--danger-light)"}}>
                    <div className="label" style={{color:"var(--danger)"}}>⚠ Danger zone</div>
                    <p style={{fontSize:13,color:"#a05050",lineHeight:1.5,marginBottom:12}}>Permanently delete all your data. This cannot be undone.</p>
                    <button className="btn btn-danger" style={{fontSize:14,padding:"11px"}} onClick={clearAllData}>Delete all my data</button>
                  </div>

                  <div style={{textAlign:"center",padding:"16px 0 8px",fontSize:11,color:"var(--muted)"}}>within v{APP_VERSION} · Made with care 💛<br/><button onClick={()=>setShowPrivacy(true)} style={{background:"none",border:"none",color:"var(--amber)",fontSize:11,cursor:"pointer",fontFamily:"var(--sans)"}}>Privacy Policy</button> · <span>Not a substitute for professional care</span></div>
                </>);
              })()}

              </>}
            </div>
          )}
        </div>

        {page!=="onboard"&&(
          <nav className="bottom-nav">
            {[{id:"home",icon:"🏠",label:"Home"},{id:"chat",icon:"💬",label:"Chat"},{id:"rewards",icon:"🎁",label:"Rewards"},{id:"journey",icon:"📖",label:"Journey"},{id:"settings",icon:"⚙️",label:"Settings"}].map(n=>(
              <button key={n.id} className={`bnb ${tab===n.id&&!showHabitDetail?"active":""}`} onClick={()=>{setShowHabitDetail(false);goMain(n.id)}}>
                {n.id==="rewards"&&giftUnlocked&&<div className="bnb-dot"/>}
                <span className="bnb-icon">{n.icon}</span>
                <span className="bnb-label">{n.label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
