// ============================================================
// ADMIN.JS — Firebase-powered admin panel
// ============================================================

(function () {
  "use strict";

  const { initDB, loadData, saveData, resetData, getTeamById, resolveMatches } = window.VolyData;

  const ADMIN_PASSWORD = "voly2026";
  let data = null;

  // ── DOM ───────────────────────────────────────────────────
  const loginScreen  = document.getElementById("login-screen");
  const adminLayout  = document.getElementById("admin-layout");
  const loginForm    = document.getElementById("login-form");
  const loginError   = document.getElementById("login-error");
  const logoutBtn    = document.getElementById("logout-btn");
  const sidebarLinks = document.querySelectorAll(".sidebar-link[data-section]");
  const topbarTitle  = document.getElementById("topbar-title");
  const fbStatusEl   = document.getElementById("fb-status");

  // ── Boot ─────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", async () => {
    if (sessionStorage.getItem("voly_admin_auth") === "1") {
      await bootAdmin();
    }
    setupLogin();
    setupSidebar();
  });

  async function bootAdmin() {
    showAdminLayout();
    showToast("⏳ Menghubungkan ke database...", "info");
    data = await initDB();
    updateFBStatus(window.VolyData.FB.isConnected);
    renderAll();
    navigateTo("dashboard");
  }

  function showAdminLayout() {
    if (loginScreen) loginScreen.style.display = "none";
    if (adminLayout) adminLayout.style.display = "flex";
  }

  function updateFBStatus(connected) {
    if (!fbStatusEl) return;
    if (connected) {
      fbStatusEl.innerHTML = `<span class="dot dot-green" style="width:7px;height:7px;border-radius:50%;background:#22c55e;display:inline-block;animation:pulse 2s infinite"></span> Firebase Live`;
      fbStatusEl.style.color = "#22c55e";
      showToast("✅ Firebase terhubung — data real-time aktif!", "success");
    } else {
      fbStatusEl.innerHTML = `<span style="width:7px;height:7px;border-radius:50%;background:#4a5d80;display:inline-block"></span> Mode Offline`;
      fbStatusEl.style.color = "#4a5d80";
      showToast("⚠️ Firebase tidak terhubung — pakai localStorage", "info");
    }
  }

  function renderAll() {
    if (!data) return;
    renderDashboard();
    renderMatchesAdmin();
    renderTeamsAdmin();
    renderSettingsAdmin();
  }

  // ── Auth ─────────────────────────────────────────────────
  function setupLogin() {
    if (!loginForm) return;
    loginForm.addEventListener("submit", async e => {
      e.preventDefault();
      const pass = document.getElementById("admin-password")?.value;
      if (pass === ADMIN_PASSWORD) {
        sessionStorage.setItem("voly_admin_auth", "1");
        await bootAdmin();
      } else {
        if (loginError) { loginError.textContent = "Password salah. Coba lagi."; loginError.classList.add("show"); }
        setTimeout(() => loginError?.classList.remove("show"), 3000);
      }
    });
  }

  logoutBtn?.addEventListener("click", () => {
    sessionStorage.removeItem("voly_admin_auth");
    location.reload();
  });

  // ── Sidebar ───────────────────────────────────────────────
  function setupSidebar() {
    sidebarLinks.forEach(link => {
      link.addEventListener("click", () => navigateTo(link.dataset.section));
    });
  }

  function navigateTo(section) {
    sidebarLinks.forEach(l => l.classList.toggle("active", l.dataset.section === section));
    document.querySelectorAll(".admin-section").forEach(s => s.classList.toggle("active", s.id === `section-${section}`));
    const titles = { dashboard:"Dashboard", bracket:"Edit Bracket & Pertandingan", teams:"Kelola Tim & Pemain", settings:"Pengaturan Tournament" };
    if (topbarTitle) topbarTitle.textContent = titles[section] || section;
  }

  // ── Dashboard ─────────────────────────────────────────────
  function renderDashboard() {
    const resolved = resolveMatches(data);
    const done = resolved.filter(m => m.winner).length;
    const setEl = (id, v) => { const e = document.getElementById(id); if(e) e.textContent = v; };
    setEl("stat-teams",   data.teams.length);
    setEl("stat-players", data.teams.reduce((s,t)=>s+t.players.length, 0));
    setEl("stat-matches", data.matches.length);
    setEl("stat-done",    done);

    const tbody = document.getElementById("recent-matches");
    if (tbody) {
      tbody.innerHTML = "";
      resolved.forEach(m => {
        const t1n = m.team1 ? getTeamById(data,m.team1)?.name : "TBD";
        const t2n = m.team2 ? getTeamById(data,m.team2)?.name : (m.team1?"BYE":"TBD");
        const wn  = m.winner ? getTeamById(data,m.winner)?.name : null;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><span class="tag tag-${m.winner?'green':'muted'}">${m.roundName}</span></td>
          <td><strong style="color:var(--text-primary);font-family:'Rajdhani',sans-serif">${t1n||"TBD"}</strong></td>
          <td style="color:var(--text-muted);font-family:'Rajdhani',sans-serif;font-weight:700">VS</td>
          <td><strong style="color:var(--text-primary);font-family:'Rajdhani',sans-serif">${t2n||"TBD"}</strong></td>
          <td>${m.score1!==null?`<span style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem">${m.score1}–${m.score2}</span>`:'<span style="color:var(--text-muted)">-</span>'}</td>
          <td>${wn?`<span class="tag tag-gold">👑 ${wn}</span>`:'<span class="tag tag-muted">Pending</span>'}</td>`;
        tbody.appendChild(tr);
      });
    }
  }

  // ── Matches ───────────────────────────────────────────────
  function renderMatchesAdmin() {
    const container = document.getElementById("matches-editor");
    if (!container) return;
    container.innerHTML = "";
    const resolved = resolveMatches(data);

    resolved.forEach(match => {
      const t1 = match.team1 ? getTeamById(data, match.team1) : null;
      const t2 = match.team2 ? getTeamById(data, match.team2) : null;
      const t1Name = t1?.name || (match.team2===null?"BYE":"TBD");
      const t2Name = t2?.name || (match.team1!==null&&!match.team2?"BYE":"TBD");
      const t1c = t1?.color||"#4a5d80", t2c = t2?.color||"#4a5d80";

      const winOpts = [
        `<option value="">— Pilih Pemenang —</option>`,
        t1 ? `<option value="${match.team1}" ${match.winner===match.team1?'selected':''}>${t1Name}</option>` : "",
        t2 ? `<option value="${match.team2}" ${match.winner===match.team2?'selected':''}>${t2Name}</option>` : "",
      ].join("");

      const item = document.createElement("div");
      item.className = "match-editor-item";
      item.innerHTML = `
        <div class="match-editor-header">
          <span class="match-editor-round">${match.roundName.toUpperCase()} · Match ${match.id.replace("m","")}</span>
          <span class="tag ${match.winner?'tag-green':'tag-muted'}">${match.winner?'✓ Selesai':'Pending'}</span>
        </div>

        <div class="match-editor-teams">
          <div>
            <div class="field-label" style="margin-bottom:4px">Tim 1</div>
            <div class="match-team-display" style="color:${t1c};">${t1Name}</div>
          </div>
          <div style="text-align:center">
            <div class="field-label" style="margin-bottom:4px">Skor</div>
            <div class="score-inputs-wrap">
              <input type="number" class="score-input" min="0" max="99" placeholder="0" value="${match.score1??''}" data-field="score1" data-match="${match.id}">
              <span style="color:var(--text-muted);font-family:'Bebas Neue',sans-serif;font-size:1.1rem">-</span>
              <input type="number" class="score-input" min="0" max="99" placeholder="0" value="${match.score2??''}" data-field="score2" data-match="${match.id}">
            </div>
          </div>
          <div>
            <div class="field-label" style="margin-bottom:4px">Tim 2</div>
            <div class="match-team-display" style="color:${t2c};">${t2Name}</div>
          </div>
        </div>

        <div class="match-editor-meta">
          <div class="field-group" style="margin:0">
            <label class="field-label">Tanggal</label>
            <input type="text" class="field-input" placeholder="19 Agustus 2026" value="${match.date||''}" data-field="date" data-match="${match.id}">
          </div>
          <div class="field-group" style="margin:0">
            <label class="field-label">Jam</label>
            <input type="text" class="field-input" placeholder="17:00" value="${match.time||''}" data-field="time" data-match="${match.id}">
          </div>
          <div class="field-group" style="margin:0">
            <label class="field-label">Pemenang</label>
            <select class="field-select" data-field="winner" data-match="${match.id}" style="background:var(--navy-mid);color:var(--text-primary)">${winOpts}</select>
          </div>
        </div>`;

      container.appendChild(item);
    });

    container.querySelectorAll("[data-field][data-match]").forEach(el => {
      el.addEventListener("change", onMatchChange);
      if (el.tagName === "INPUT") el.addEventListener("blur", onMatchChange);
    });
  }

  async function onMatchChange(e) {
    const field = e.target.dataset.field;
    const matchId = e.target.dataset.match;
    const val = e.target.value;
    const match = data.matches.find(m => m.id === matchId);
    if (!match) return;

    if (field==="score1") match.score1 = val===""?null:parseInt(val,10);
    else if(field==="score2") match.score2 = val===""?null:parseInt(val,10);
    else if(field==="date")   match.date = val;
    else if(field==="time")   match.time = val;
    else if(field==="winner") match.winner = val||null;

    await saveData(data);
    renderDashboard();
    showToast(window.VolyData.FB.isConnected ? "✅ Disimpan ke Firebase!" : "💾 Disimpan (offline)", "success");
  }

  document.getElementById("save-matches-btn")?.addEventListener("click", async () => {
    await saveData(data);
    showToast("💾 Semua pertandingan tersimpan!", "success");
    renderMatchesAdmin();
  });

  // ── Teams ─────────────────────────────────────────────────
  let editingTeamId = null;

  function renderTeamsAdmin() {
    const grid = document.getElementById("teams-admin-grid");
    if (!grid) return;
    grid.innerHTML = "";

    data.teams.forEach(team => {
      const initials = team.shortName||team.name.split(" ").map(w=>w[0]).join("").slice(0,3);
      const card = document.createElement("div");
      card.className = "admin-card fade-in";
      card.innerHTML = `
        <div class="admin-card-head">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:8px;background:${team.color};display:grid;place-items:center;font-family:'Bebas Neue',sans-serif;font-size:.9rem;color:#fff;flex-shrink:0">${initials}</div>
            <div>
              <div class="admin-card-title">${team.name}</div>
              <div style="font-size:.72rem;color:var(--text-muted)">${team.players.length} Pemain</div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="openEditTeam('${team.id}')">✏️ Edit</button>
        </div>
        <div class="admin-card-body" style="padding:14px 18px">
          <ul class="player-admin-list">
            ${team.players.map((p,i)=>`
              <li class="player-admin-item" id="player-li-${team.id}-${i}">
                <span style="font-size:.7rem;color:var(--text-muted);min-width:20px;text-align:right;font-family:'Rajdhani',sans-serif;font-weight:700;flex-shrink:0">${i+1}</span>
                <span class="player-admin-name player-editable" title="Klik untuk edit nama" onclick="startEditPlayer('${team.id}',${i})">${p}<span class="edit-hint">✏️</span></span>
                <button class="player-admin-del" onclick="deletePlayer('${team.id}',${i})">✕</button>
              </li>`).join("")}
          </ul>
          <div class="add-player-row" style="margin-top:10px">
            <input type="text" class="field-input" placeholder="Nama pemain baru..." id="new-player-${team.id}">
            <button class="btn btn-primary btn-sm" onclick="addPlayer('${team.id}')">+ Tambah</button>
          </div>
        </div>`;
      grid.appendChild(card);
    });

    window.openEditTeam = id => { editingTeamId = id; openTeamModal(id); };

    // ── Inline edit player name ────────────────────────────
    window.startEditPlayer = (teamId, idx) => {
      const li = document.getElementById(`player-li-${teamId}-${idx}`);
      if (!li) return;
      const nameSpan = li.querySelector(".player-admin-name");
      if (!nameSpan || li.querySelector(".player-inline-input")) return; // already editing

      const team = data.teams.find(t => t.id === teamId);
      if (!team) return;
      const currentName = team.players[idx];

      // Replace span with input
      const input = document.createElement("input");
      input.type = "text";
      input.value = currentName;
      input.className = "player-inline-input field-input";
      input.style.cssText = "flex:1;padding:4px 8px;font-size:.84rem;height:28px;";
      nameSpan.replaceWith(input);
      input.focus();
      input.select();

      const saveEdit = async () => {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
          team.players[idx] = newName;
          await saveData(data);
          showToast("✓ Nama diperbarui", "success");
        }
        renderTeamsAdmin(); // re-render to restore view
      };

      input.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); saveEdit(); }
        if (e.key === "Escape") renderTeamsAdmin(); // cancel
      });
      input.addEventListener("blur", saveEdit);
    };

    window.deletePlayer = async (teamId, idx) => {
      const team = data.teams.find(t=>t.id===teamId);
      if (!team) return;
      team.players.splice(idx,1);
      await saveData(data);
      renderTeamsAdmin();
      renderDashboard();
      showToast("Pemain dihapus","info");
    };
    window.addPlayer = async (teamId) => {
      const input = document.getElementById(`new-player-${teamId}`);
      if (!input||!input.value.trim()) return;
      const team = data.teams.find(t=>t.id===teamId);
      if (!team) return;
      team.players.push(input.value.trim());
      await saveData(data);
      renderTeamsAdmin();
      renderDashboard();
      showToast("✓ Pemain ditambahkan","success");
    };
  }

  // ── Team Edit Modal ────────────────────────────────────────
  const teamModal = document.getElementById("team-modal");
  const COLORS = ["#f59e0b","#3b82f6","#10b981","#8b5cf6","#ef4444","#f97316","#06b6d4","#ec4899","#84cc16","#a855f7"];

  function openTeamModal(id) {
    if (!teamModal) return;
    const team = data.teams.find(t=>t.id===id);
    if (!team) return;
    document.getElementById("edit-team-name").value  = team.name;
    document.getElementById("edit-team-short").value = team.shortName||"";
    const picker = document.getElementById("team-color-picker");
    if (picker) {
      picker.innerHTML = COLORS.map(c=>`<div class="color-swatch${team.color===c?' selected':''}" style="background:${c}" data-color="${c}"></div>`).join("");
      picker.querySelectorAll(".color-swatch").forEach(sw=>{
        sw.addEventListener("click",()=>{picker.querySelectorAll(".color-swatch").forEach(s=>s.classList.remove("selected"));sw.classList.add("selected");});
      });
    }
    teamModal.querySelector(".modal-title").textContent = `Edit: ${team.name}`;
    teamModal.classList.add("open");
  }

  function closeTeamModal() { teamModal?.classList.remove("open"); editingTeamId=null; }

  document.getElementById("team-modal-save")?.addEventListener("click", async () => {
    if (!editingTeamId) return;
    const team = data.teams.find(t=>t.id===editingTeamId);
    if (!team) return;
    const n = document.getElementById("edit-team-name")?.value.trim();
    const s = document.getElementById("edit-team-short")?.value.trim();
    const c = document.querySelector("#team-color-picker .color-swatch.selected")?.dataset.color;
    if (n) team.name = n;
    if (s) team.shortName = s;
    if (c) team.color = c;
    await saveData(data);
    closeTeamModal();
    renderTeamsAdmin();
    showToast("✓ Tim diperbarui","success");
  });

  document.getElementById("team-modal-cancel")?.addEventListener("click", closeTeamModal);
  teamModal?.querySelector(".modal-close-btn")?.addEventListener("click", closeTeamModal);
  teamModal?.addEventListener("click", e=>{ if(e.target===teamModal) closeTeamModal(); });

  // ── Add Team ──────────────────────────────────────────────
  const addTeamModal = document.getElementById("add-team-modal");
  document.getElementById("add-team-btn")?.addEventListener("click", ()=>addTeamModal?.classList.add("open"));
  const closeAdd = ()=>addTeamModal?.classList.remove("open");
  document.getElementById("add-team-cancel")?.addEventListener("click", closeAdd);
  addTeamModal?.querySelector(".modal-close-btn")?.addEventListener("click", closeAdd);
  addTeamModal?.addEventListener("click", e=>{ if(e.target===addTeamModal) closeAdd(); });

  document.getElementById("add-team-save")?.addEventListener("click", async () => {
    const name  = document.getElementById("new-team-name")?.value.trim();
    const short = document.getElementById("new-team-short")?.value.trim();
    if (!name) { showToast("Nama tim tidak boleh kosong!","error"); return; }
    const id = "team" + Date.now();
    data.teams.push({ id, name, shortName:short||name.slice(0,3).toUpperCase(), color:COLORS[data.teams.length%COLORS.length], players:[] });
    await saveData(data);
    closeAdd();
    renderTeamsAdmin();
    renderDashboard();
    showToast("✓ Tim baru ditambahkan!","success");
  });

  // ── Settings ──────────────────────────────────────────────
  function renderSettingsAdmin() {
    const t = data.tournament||{};
    ["name","subtitle","location","date"].forEach(k=>{
      const el = document.getElementById(`set-${k}`);
      if (el) el.value = t[k]||"";
    });
    const st = document.getElementById("set-status");
    if (st) st.value = t.status||"upcoming";
  }

  document.getElementById("save-settings-btn")?.addEventListener("click", async () => {
    ["name","subtitle","location","date"].forEach(k=>{
      data.tournament[k] = document.getElementById(`set-${k}`)?.value.trim()||data.tournament[k];
    });
    data.tournament.status = document.getElementById("set-status")?.value||"upcoming";
    await saveData(data);
    showToast("✓ Pengaturan tersimpan!","success");
  });

  document.getElementById("reset-data-btn")?.addEventListener("click", async () => {
    if (!confirm("Reset semua data ke default? Semua perubahan akan hilang!")) return;
    data = resetData();
    await saveData(data);
    renderAll();
    showToast("Data direset ke default","info");
  });

  // ── Toast ─────────────────────────────────────────────────
  function showToast(msg, type="info") {
    const c = document.getElementById("toast-container");
    if (!c) return;
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(()=>{
      t.style.cssText += "opacity:0;transform:translateX(100%);transition:all .3s ease";
      setTimeout(()=>t.remove(),300);
    },3200);
  }

  window.showToast = showToast;
})();
