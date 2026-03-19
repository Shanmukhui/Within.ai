    const reply  = await callAI([{ role:"user", content }],
      "You are a warm, emotionally intelligent companion. No hollow affirmations. No exclamation marks. Use history to personalise.");
    const parsed = JSON.parse(reply.replace(/```json|```/g, "").trim());

    get("ai-loading").style.display  = "none";
    get("ai-text").textContent        = parsed.message;
    get("ai-text").style.display      = "block";
    get("nudge-text").textContent     = parsed.nudge;
    get("nudge-section").style.display = "block";
    get("resp-actions").style.display  = "block";

    state.checkins.push({
      isoDate:   new Date().toISOString().split("T")[0],
      date:      new Date().toLocaleDateString("en-US", { weekday:"short" }),
      mood:      state.mood.id,
      completed: true,
      note:      parsed.message.slice(0, 60) + "…",
    });
    if (state.checkins.length > 30) state.checkins = state.checkins.slice(-30);
  } catch {
    get("ai-loading").style.display  = "none";
    get("ai-text").textContent        = "Even pausing to check in with yourself is meaningful. You are here — that matters.";
    get("ai-text").style.display      = "block";
    get("nudge-text").textContent     = "Take one slow, intentional breath.";
    get("nudge-section").style.display = "block";
    get("resp-actions").style.display  = "block";
  }
  saveAll();
}

function taskDone() {
  state.giftUnlocked = true;
  get("done-btn").style.display     = "none";
  get("done-row").style.display     = "flex";
  const reward = state.profile.custom || state.profile.reward;
  if (reward) get("open-gift-btn").style.display = "block";
  saveAll();
}

/* ══════════════════════════════════════
   GIFT
══════════════════════════════════════ */
function openGift() {
  const reward = state.profile.custom || state.profile.reward;
  get("gift-reward-text").textContent = reward || "A moment just for you ✨";
  get("gift-overlay").classList.add("show");
  makeConfetti();
}
function closeGift() {
  get("gift-overlay").classList.remove("show");
  const reward = state.profile.custom || state.profile.reward;
  if (reward) {
    state.rewards.unshift({ label:reward, date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}) });
    saveAll();
    renderEarnedRewards();
  }
  goTab("rewards");
}
function makeConfetti() {
  const w = get("confetti-wrap");
  if (!w) return;
  w.innerHTML = "";
  const colors = ["#d4a843","#e8a598","#9bafc4","#a89fc4","#c4a882","#b8d4c8"];
  for (let i = 0; i < 24; i++) {
    const d = document.createElement("div");
    d.className = "confetti-piece";
    const size = 6 + Math.random() * 6;
    d.style.cssText = `left:${Math.random()*100}%;top:-20px;background:${colors[i%6]};width:${size}px;height:${size}px;animation-delay:${Math.random()*.8}s;animation-duration:${1.4+Math.random()*1.2}s`;
    w.appendChild(d);
  }
}

/* ══════════════════════════════════════
   REWARDS
══════════════════════════════════════ */
function buildRewardChips() {
  const c = get("reward-chips");
  if (!c) return;
  c.innerHTML = REWARDS_LIST.map(r =>
    `<button class="reward-chip ${state.profile.reward === r ? "sel" : ""}" onclick="setReward('${r.replace(/'/g,"\\'")}',this)">${r}</button>`
  ).join("");
}
function setReward(r, el) {
  state.profile.reward = r;
  state.profile.custom = "";
  document.querySelectorAll("#reward-chips .reward-chip").forEach(b => b.classList.remove("sel"));
  el.classList.add("sel");
  const ci = get("custom-reward");
  if (ci) ci.value = "";
  get("current-reward-text").textContent = r;
  get("reward-hint-text").textContent    = r;
  get("reward-hint").style.display       = "flex";
  saveAll();
}
function setCustomReward(v) {
  state.profile.custom = v;
  state.profile.reward = "";
  document.querySelectorAll("#reward-chips .reward-chip").forEach(b => b.classList.remove("sel"));
  if (v) {
    get("current-reward-text").textContent = v;
    get("reward-hint-text").textContent    = v;
    get("reward-hint").style.display       = "flex";
  }
  saveAll();
}
function renderEarnedRewards() {
  const el = get("earned-list");
  if (!el) return;
  if (!state.rewards.length) {
    el.innerHTML = `<p class="sub" style="padding:7px 0">Complete a nudge to earn your first reward 🌱</p>`;
    return;
  }
  el.innerHTML = state.rewards.map((r, i) =>
    `<div class="earned-row" style="${i === state.rewards.length-1 ? "border-bottom:none" : ""}">
      <div style="width:38px;height:38px;border-radius:11px;background:var(--g2);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0">🎁</div>
      <div style="flex:1"><div style="font-size:14px;color:var(--t)">${r.label}</div><div style="font-size:11px;color:var(--m);margin-top:2px">${r.date}</div></div>
      <div class="earned-badge">Earned ✓</div>
    </div>`
  ).join("");
}

/* ══════════════════════════════════════
   JOURNEY
══════════════════════════════════════ */
function buildJTabs() {
  const c = get("jtabs");
  if (!c) return;
  ["story","week","stats","journal"].forEach(t => {
    const btn = document.createElement("button");
    btn.id        = "jtab-" + t;
    btn.textContent = t[0].toUpperCase() + t.slice(1);
    btn.className = "btn btn-sm " + (t === "story" ? "btn-p" : "btn-g");
    btn.style.flex = "1";
    btn.onclick   = () => setJTab(t);
    c.appendChild(btn);
  });
}
function setJTab(t) {
  state.jTab = t;
  ["story","week","stats","journal"].forEach(tab => {
    const btn = get("jtab-" + tab);
    if (btn) {
      btn.className = "btn btn-sm " + (tab === t ? "btn-p" : "btn-g");
    }
  });
  renderJourney();
}
function renderJourney() {
  const c = get("journey-content");
  if (!c) return;

  if (state.jTab === "story") {
    if (!state.checkins.length) { c.innerHTML = '<div class="card"><div class="lbl">Recent check-ins</div><p class="sub">Your story starts with your first check-in 🌱</p></div>'; return; }
    const rows = [...state.checkins].reverse().slice(0,7).map((ci, i, arr) => {
      const m = MOODS.find(x => x.id === ci.mood);
      return `<div class="story-row">${i < arr.length-1 ? '<div class="story-line"></div>' : ""}<div class="story-dot" style="background:${m?.color||"var(--a)"}"></div><div><div class="story-date">${ci.date} · ${m?.emoji||""} ${m?.label||""}</div><div class="story-note">${ci.note}</div></div></div>`;
    }).join("");
    c.innerHTML = `<div class="card"><div class="lbl">Recent check-ins</div>${rows}</div>`;
  }
  else if (state.jTab === "week") {
    if (!state.checkins.length) { c.innerHTML = '<div class="card"><div class="lbl">Emotional landscape</div><p class="sub">Check in daily to see your landscape 🌿</p></div>'; return; }
    const bars = state.checkins.slice(-7).map(ci => {
      const m = MOODS.find(x => x.id === ci.mood);
      const h = { thriving:80, okay:55, tired:35, anxious:45, low:20 }[ci.mood] || 40;
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><span style="font-size:13px">${m?.emoji||""}</span><div style="width:100%;height:${h}px;border-radius:6px 6px 0 0;background:${m?.color||"#c4a882"}aa;min-height:10px"></div><span style="font-size:10px;color:var(--m)">${ci.date}</span></div>`;
    }).join("");
    c.innerHTML = `<div class="card"><div class="lbl">Emotional landscape</div><div style="display:flex;gap:6px;align-items:flex-end;margin-top:8px">${bars}</div><div class="divider"></div><p class="sub" style="font-size:13px">Every day you show up is a day in your story.</p></div>`;
  }
  else if (state.jTab === "stats") {
    const stats = [
      { icon:"🔥", label:"Streak",    value:`${state.streak.count} day${state.streak.count!==1?"s":""}` },
      { icon:"💬", label:"Check-ins", value:`${state.checkins.length}` },
      { icon:"🎁", label:"Rewards",   value:`${state.rewards.length}` },
    ];
    c.innerHTML = `<div class="card"><div class="lbl">What you have built</div>${stats.map(s=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--b)"><div style="display:flex;gap:9px;align-items:center"><span style="font-size:17px">${s.icon}</span><span style="font-size:14px;color:var(--t)">${s.label}</span></div><span style="font-family:var(--S);font-size:16px;color:var(--a);font-weight:300">${s.value}</span></div>`).join("")}</div>`;
  }
  else if (state.jTab === "journal") {
    const notes = state.journal.length
      ? state.journal.map((e,i) => {
          const m = MOODS.find(x => x.id === e.mood);
          return `<div style="padding:13px 0;border-bottom:${i<state.journal.length-1?"1px solid var(--b)":"none"}"><div style="font-size:11px;color:var(--a);font-weight:500;margin-bottom:4px">${e.date}</div><div style="font-size:14px;color:var(--t);line-height:1.6">${e.text}</div>${m?`<div style="display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:10px;font-size:11px;margin-top:5px;background:${m.color}22;color:${m.color}">${m.emoji} ${m.label}</div>`:""}</div>`;
        }).join("")
      : `<p class="sub" style="padding:7px 0">No notes yet. Add your first reflection above 🌿</p>`;
    c.innerHTML = `<div class="card"><div class="lbl">Add a note</div><textarea id="journal-inp" class="inp" rows="3" placeholder="How are you feeling about your progress?"></textarea><div style="height:10px"></div><button class="btn btn-p" onclick="addNote()">Save note</button></div><div class="card"><div class="lbl">Your notes</div>${notes}</div>`;
  }
}
function addNote() {
  const inp = get("journal-inp");
  if (!inp || !inp.value.trim()) return;
  state.journal.unshift({ id:Date.now(), date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}), text:inp.value.trim(), mood:state.mood?.id||"okay" });
  saveAll();
  renderJourney();
}

/* ══════════════════════════════════════
   PROFILE EDIT
══════════════════════════════════════ */
function buildProfileFields() {
  const c = get("profile-fields");
  if (!c) return;
  const fields = [
    { f:"name", l:"Name", v:state.profile.name||"—" },
    { f:"goal", l:"Goal", v:state.profile.goal||"—" },
    { f:"why",  l:"Why",  v:state.profile.why||"—"  },
  ];
  c.innerHTML = fields.map(row =>
    `<div id="row-${row.f}">
      <div style="display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--b)">
        <span style="font-size:12px;color:var(--m);width:70px;flex-shrink:0">${row.l}</span>
        <span style="flex:1;font-size:13px;color:var(--t);font-family:var(--S);font-style:italic">${row.v.length>40?row.v.slice(0,40)+"…":row.v}</span>
        <button style="background:none;border:none;color:var(--a);font-size:12px;cursor:pointer;font-family:var(--F);font-weight:500" onclick="startEdit('${row.f}')">Edit</button>
      </div>
    </div>`
  ).join("");
}
function startEdit(field) {
  const val = state.profile[field] || "";
  const row = get("row-" + field);
  if (!row) return;
  row.innerHTML = `<div style="padding:10px 0;border-bottom:1px solid var(--b)"><input id="edit-${field}" class="inp inp-sm" value="${val.replace(/"/g,'&quot;')}"/><div style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-t btn-sm" onclick="saveEdit('${field}')">Save</button><button class="btn btn-g btn-sm" onclick="buildProfileFields()">Cancel</button></div></div>`;
  const inp = get("edit-" + field);
  if (inp) inp.focus();
}
function saveEdit(field) {
  const inp = get("edit-" + field);
  if (!inp) return;
  state.profile[field] = inp.value.trim();
  saveAll();
  buildProfileFields();
  updateUI();
}

/* ══════════════════════════════════════
   REMINDERS
══════════════════════════════════════ */
function buildDayChips() {
  const c = get("day-chips");
  if (!c) return;
  c.innerHTML = DAYS.map((d, i) =>
    `<button id="dc-${i}" class="btn btn-sm ${state.newDays.includes(i)?"btn-t":"btn-g"}" style="flex:0" onclick="toggleDay(${i})">${d}</button>`
  ).join("");
}
function toggleDay(i) {
  if (state.newDays.includes(i)) state.newDays = state.newDays.filter(x => x !== i);
  else state.newDays.push(i);
  const btn = get("dc-" + i);
  if (btn) btn.className = `btn btn-sm ${state.newDays.includes(i)?"btn-t":"btn-g"}`;
}
function showAddForm() {
  get("add-rem-form").style.display = "block";
  get("add-rem-btn").style.display  = "none";
}
function hideAddForm() {
  get("add-rem-form").style.display = "none";
  get("add-rem-btn").style.display  = "block";
}
async function requestNotif() {
  if (!("Notification" in window)) return;
  const r = await Notification.requestPermission();
  state.notifPerm = r;
  updateNotifBar();
  return r;
}
async function saveReminder() {
  const time = get("new-rem-time").value;
  if (!time) return;
  const perm = await requestNotif();
  state.reminders.push({ id:Date.now(), time, days:[...state.newDays], enabled:true, lastFired:"" });
  saveAll();
  hideAddForm();
  renderReminders();
  if (perm === "granted") {
    setTimeout(() => { try { new Notification("Reminder saved! 🌿", { body:`within will remind you at ${time}.` }); } catch {} }, 500);
  }
}
function renderReminders() {
  const c = get("reminders-list");
  if (!c) return;
  if (!state.reminders.length) { c.innerHTML = `<p class="sub" style="margin-bottom:12px;font-size:13px">No reminders yet.</p>`; return; }
  c.innerHTML = state.reminders.map(r =>
    `<div style="display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid var(--b)">
      <div style="width:38px;height:38px;border-radius:11px;background:var(--tl2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${r.enabled?"⏰":"🔕"}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:18px;font-family:var(--S);color:var(--t);font-weight:300">${r.time}</div>
        <div style="font-size:11px;color:var(--m);margin-top:2px">${r.days.map(d=>DAYS[d]).join(", ")}</div>
      </div>
      <label class="toggle-wrap">
        <input type="checkbox" ${r.enabled?"checked":""} onchange="toggleRem(${r.id})"/>
        <div class="toggle-track"></div><div class="toggle-thumb"></div>
      </label>
      <button style="margin-left:4px;border:none;background:none;color:#c4a8a8;font-size:18px;cursor:pointer;padding:0 4px" onclick="deleteRem(${r.id})">×</button>
    </div>`
  ).join("");
}
function toggleRem(id) { state.reminders = state.reminders.map(r => r.id===id?{...r,enabled:!r.enabled}:r); saveAll(); renderReminders(); }
function deleteRem(id) { state.reminders = state.reminders.filter(r => r.id!==id); saveAll(); renderReminders(); }
function updateNotifBar() {
  const bar = get("notif-bar");
  if (!bar) return;
  bar.className = "notif-bar " + state.notifPerm;
  if (state.notifPerm === "granted")
    bar.innerHTML = `<span style="font-size:18px">🔔</span><div style="flex:1"><strong style="display:block;margin-bottom:1px">Notifications enabled</strong><span style="font-size:12px">You will receive alerts at the times you set.</span></div><span>✓</span>`;
  else if (state.notifPerm === "denied")
    bar.innerHTML = `<span style="font-size:18px">🔕</span><div><strong style="display:block;margin-bottom:1px">Notifications blocked</strong><span style="font-size:12px">Go to browser Settings and allow notifications for this site.</span></div>`;
  else
    bar.innerHTML = `<span style="font-size:18px">🔔</span><div style="flex:1"><strong style="display:block;margin-bottom:1px">Enable notifications</strong><span style="font-size:12px">Allow within to send you reminders.</span></div><button style="padding:6px 14px;background:var(--g);color:#2d2418;border:none;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0" onclick="requestNotif()">Allow</button>`;
}
function tickReminders() {
  const now  = new Date();
  const hhmm = String(now.getHours()).padStart(2,"0") + ":" + String(now.getMinutes()).padStart(2,"0");
  const day  = now.getDay();
  const t    = state.reminders.find(r => r.enabled && r.time===hhmm && r.days.includes(day) && r.lastFired!==hhmm);
  if (!t) return;
  if (Notification.permission === "granted") {
    try { new Notification("within 🌿", { body:"Hey — you set this moment aside for yourself.", tag:"within-rem", vibrate:[200,100,200] }); } catch {}
  }
  const banner = get("rem-banner");
  if (banner) banner.classList.add("show");
  state.reminders = state.reminders.map(r => r.id===t.id ? {...r, lastFired:hhmm} : r);
}
function dismissBanner() { const b = get("rem-banner"); if (b) b.classList.remove("show"); }
function gotoCheckin()   { dismissBanner(); goTab("home"); }

/* ══════════════════════════════════════
   CHAT
══════════════════════════════════════ */
function buildChatStarters() {
  const c = get("chat-starters");
  if (!c) return;
  c.innerHTML = CHAT_STARTERS.map(q =>
    `<button class="starter" onclick="sendChatMsg('${q.replace(/'/g,"\\'")}')">  ${q}</button>`
  ).join("");
}
function renderChatMsgs() {
  const c = get("chat-msgs");
  if (!c) return;
  c.innerHTML = state.chatMsgs.map(m =>
    `<div class="bubble-row ${m.role==="user"?"user":""}">
      ${m.role==="ai" ? '<div class="av ai-av">🌿</div>' : ""}
      <div>
        <div class="bubble ${m.role==="ai"?"ai-b":"user-b"}">${m.text}</div>
        <div class="btime" style="color:${m.role==="user"?"rgba(196,149,106,.7)":"var(--m)"}">${m.time||""}</div>
      </div>
      ${m.role==="user" ? '<div class="av">🙂</div>' : ""}
    </div>`
  ).join("");
  if (state.chatBusy) {
    c.innerHTML += `<div class="bubble-row"><div class="av ai-av">🌿</div><div class="typing"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div></div>`;
  }
  c.scrollTop = c.scrollHeight;
}
function sendChat() {
  const inp = get("chat-inp");
  if (!inp || !inp.value.trim()) return;
  sendChatMsg(inp.value.trim());
  inp.value = "";
  inp.style.height = "40px";
}
async function sendChatMsg(text) {
  if (!text.trim() || state.chatBusy) return;
  const CKW = ["suicide","end it","kill myself","don't want to be here","can't go on","hurt myself","self harm","want to die"];
  state.chatMsgs.push({ role:"user", text:text.trim(), time:nowTime() });
  const starters = get("chat-starters");
  if (starters) starters.style.display = "none";
  state.chatBusy = true;
  renderChatMsgs();

  const crisis = CKW.some(k => text.toLowerCase().includes(k));
  const sys    = [
    "You are a warm, emotionally intelligent companion — like a caring friend.",
    "Listen deeply, validate feelings, never lecture. 2-4 sentences.",
    `Never start with "I" or hollow affirmations.`,
    state.profile.name ? `Name: ${state.profile.name}.` : "",
    state.profile.goal ? `Goal: "${state.profile.goal}".` : "",
  ].filter(Boolean).join(" ");

  try {
    const reply = await callAI(state.chatMsgs.map(m => ({ role:m.role==="ai"?"assistant":"user", content:m.text })), sys);
    state.chatMsgs.push({ role:"ai", text:reply, time:nowTime() });
    if (crisis) state.chatMsgs.push({ role:"ai", text:"💜 You are not alone. Crisis Text Line: Text HOME to 741741. 988 Lifeline: Call or text 988.", time:"" });
  } catch {
    state.chatMsgs.push({ role:"ai", text:"I am still here. Take your time.", time:nowTime() });
  }
  state.chatBusy = false;
  renderChatMsgs();
}

/* ══════════════════════════════════════
   DATA
══════════════════════════════════════ */
function exportData() {
  const d = { exportedAt:new Date().toISOString(), profile:state.profile, streak:state.streak, checkins:state.checkins, rewards:state.rewards, journal:state.journal };
  const b = new Blob([JSON.stringify(d,null,2)], { type:"application/json" });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u; a.download = `within-data-${new Date().toISOString().split("T")[0]}.json`; a.click();
  URL.revokeObjectURL(u);
}
function clearAll() {
  if (!confirm("Delete all your data? This cannot be undone.")) return;
  ["within:auth","within:disc","within:profile","within:checkins","within:rewards","within:streak","within:reminders","within:journal","within:users"].forEach(k => {
    try { localStorage.removeItem(k); } catch {}
  });
  location.reload();
}
