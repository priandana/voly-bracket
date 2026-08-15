// ============================================================
// BRACKET.JS — Public page with Firebase real-time updates
// ============================================================

(function () {
  "use strict";

  let data = null;

  // ── DOM refs ──────────────────────────────────────────────
  const bracketCanvas  = document.getElementById("bracket-canvas");
  const teamsGrid      = document.getElementById("teams-grid");
  const scheduleBody   = document.getElementById("schedule-body");
  const matchModal     = document.getElementById("match-modal");
  const connectionBadge = document.getElementById("connection-badge");

  // ── Init ─────────────────────────────────────────────────
  async function init() {
    // Show loading state
    if (bracketCanvas) bracketCanvas.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:60px;color:var(--text-muted);">
        <div class="spinner"></div>
        <span style="font-family:'Rajdhani',sans-serif;font-size:.9rem;letter-spacing:.05em;">Menghubungkan ke database...</span>
      </div>`;

    // Initialize DB connection
    data = await window.VolyData.initDB();

    // Update connection badge
    updateConnectionBadge(window.VolyData.FB.isConnected);

    // Render everything
    renderAll();
    setupTabs();
    setupModal();
    setupDrag();

    // Subscribe to real-time updates
    window.VolyData.subscribeToUpdates(newData => {
      data = newData;
      renderAll();
      showLiveToast();
    });
  }

  function renderAll() {
    renderHero();
    renderBracket();
    renderTeams();
    renderSchedule();
  }

  // ── Connection Badge ──────────────────────────────────────
  function updateConnectionBadge(isLive) {
    if (!connectionBadge) return;
    if (isLive) {
      connectionBadge.innerHTML = `<span class="dot dot-green"></span> Live`;
      connectionBadge.className = "connection-badge live";
    } else {
      connectionBadge.innerHTML = `<span class="dot dot-muted"></span> Offline`;
      connectionBadge.className = "connection-badge offline";
    }
  }

  // ── Live update toast ─────────────────────────────────────
  let toastTimeout;
  function showLiveToast() {
    let toast = document.getElementById("live-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "live-toast";
      toast.style.cssText = `
        position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
        background:rgba(20,29,53,0.95);border:1px solid rgba(34,197,94,0.4);
        color:#22c55e;padding:10px 20px;border-radius:99px;font-size:.82rem;
        font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:.06em;
        z-index:999;display:flex;align-items:center;gap:8px;
        backdrop-filter:blur(8px);box-shadow:0 8px 32px rgba(0,0,0,.4);
        animation:slideUp .3s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block;animation:pulse 1s infinite"></span> Bracket diperbarui!`;
    toast.style.display = "flex";
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.style.display = "none"; }, 3000);
  }

  // ── Hero ─────────────────────────────────────────────────
  function renderHero() {
    if (!data) return;
    const t = data.tournament || {};
    const el = id => document.getElementById(id);
    if (el("tournament-name"))     el("tournament-name").textContent     = t.name     || "";
    if (el("tournament-subtitle")) el("tournament-subtitle").textContent = t.subtitle || "";
    if (el("hero-date"))           el("hero-date").textContent           = t.date     || "";
    if (el("hero-location"))       el("hero-location").innerHTML         = `<strong>${t.location || ""}</strong>`;
    document.title = t.name || "Voly Bracket";
  }

  // ── Bracket ───────────────────────────────────────────────
  function renderBracket() {
    if (!bracketCanvas || !data) return;
    const { resolveMatches, getTeamById } = window.VolyData;
    const resolved = resolveMatches(data);

    const rounds = [
      { label: "Quarter Final", matches: resolved.filter(m => m.round === 1) },
      { label: "Semi Final",    matches: resolved.filter(m => m.round === 2) },
      { label: "Final",         matches: resolved.filter(m => m.round === 3) },
    ];

    bracketCanvas.innerHTML = "";

    rounds.forEach((round, ri) => {
      const col = document.createElement("div");
      col.className = "round-col";

      // Header
      col.innerHTML = `<div class="round-header"><div class="round-label${ri===2?' final-label':''}">${round.label}</div></div>`;

      // Matches
      const matchesWrap = document.createElement("div");
      matchesWrap.className = "round-matches";

      round.matches.forEach((match, mi) => {
        const wrapper = document.createElement("div");
        wrapper.className = "match-wrapper";
        wrapper.style.padding = "18px 0";

        const card = buildMatchCard(match, ri);
        card.addEventListener("click", () => openMatchModal(match.id, resolved));
        wrapper.appendChild(card);

        matchesWrap.appendChild(wrapper);
      });

      col.appendChild(matchesWrap);
      bracketCanvas.appendChild(col);

      // SVG connectors between rounds
      if (ri < rounds.length - 1) {
        bracketCanvas.appendChild(buildSVGConnector(round.matches.length, ri));
      }
    });

    // Champion
    const finalMatch = rounds[2]?.matches[0];
    const champion = finalMatch?.winner ? getTeamById(data, finalMatch.winner) : null;
    const champCol = document.createElement("div");
    champCol.className = "round-col";
    champCol.style.cssText = "justify-content:center;display:flex;flex-direction:column;align-items:center;padding-top:56px;";
    champCol.innerHTML = `
      <div class="champion-section">
        <div class="champion-trophy">${champion ? '🏆' : '🏆'}</div>
        <div class="champion-label">CHAMPION</div>
        ${champion
          ? `<div class="champion-name" style="color:var(--gold)">${champion.name}</div>`
          : `<div class="champion-tbd">Belum ditentukan</div>`}
      </div>`;
    bracketCanvas.appendChild(champCol);
  }

  function buildMatchCard(match, roundIndex) {
    const { getTeamById } = window.VolyData;
    const card = document.createElement("div");
    card.className = `match-card${roundIndex === 2 ? " final-card" : ""}`;
    card.dataset.matchId = match.id;

    const t1 = match.team1 ? getTeamById(data, match.team1) : null;
    const t2 = match.team2 ? getTeamById(data, match.team2) : null;

    card.innerHTML = `
      <div class="match-meta">
        <span class="match-id">${match.roundName.toUpperCase()}</span>
        <span class="match-datetime">
          ${(match.date||"").replace("Agustus","Ags")} · <span class="time">${match.time || "—"}</span>
        </span>
      </div>
      ${buildTeamRow(t1, match.team2===null?"BYE":null, match.score1, match.winner, match, 1)}
      ${buildTeamRow(t2, null, match.score2, match.winner, match, 2)}
    `;
    return card;
  }

  function buildTeamRow(team, byeLabel, score, winner, match, slot) {
    const teamId = slot===1 ? match.team1 : match.team2;
    const isWinner = winner && winner === teamId;
    const isLoser  = winner && winner !== teamId && teamId !== null;
    let cls = "team-row";
    if (isWinner) cls += " winner";
    if (isLoser)  cls += " loser";

    let colorBar = "", nameHtml = "";
    if (!teamId && !byeLabel) {
      nameHtml = `<span class="team-name tbd">TBD</span>`;
    } else if (byeLabel === "BYE") {
      nameHtml = `<span class="team-name bye">BYE</span>`;
    } else if (team) {
      colorBar = `<div class="team-color-bar" style="background:${team.color}"></div>`;
      nameHtml = `<span class="team-name">${team.name}</span>`;
    } else {
      nameHtml = `<span class="team-name tbd">TBD</span>`;
    }

    const scoreText = score !== null && score !== undefined ? score : "";
    return `
      <div class="${cls}">
        <div class="team-seed">${slot}</div>
        ${colorBar}${nameHtml}
        <span class="team-score">${scoreText}</span>
        <span class="winner-crown">${isWinner ? "👑" : ""}</span>
      </div>`;
  }

  function buildSVGConnector(matchCount, roundIndex) {
    const wrap = document.createElement("div");
    wrap.className = "connector-col";
    wrap.style.cssText = "width:60px;display:flex;flex-direction:column;justify-content:space-around;flex-shrink:0;";

    const matchH = 132; // match card + padding

    for (let i = 0; i < matchCount; i += 2) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "60");
      svg.setAttribute("height", String(matchH * 2));
      svg.style.cssText = "display:block;overflow:visible;";

      // Top match horizontal line
      const topY = matchH / 2;
      const botY = matchH + matchH / 2;
      const midY = (topY + botY) / 2;

      // top team → right
      const top = document.createElementNS("http://www.w3.org/2000/svg", "path");
      top.setAttribute("d", `M 0 ${topY} H 30 V ${midY}`);
      top.setAttribute("stroke", "#1e2d50");
      top.setAttribute("stroke-width", "1.5");
      top.setAttribute("fill", "none");
      svg.appendChild(top);

      // bottom team → right
      const bot = document.createElementNS("http://www.w3.org/2000/svg", "path");
      bot.setAttribute("d", `M 0 ${botY} H 30 V ${midY}`);
      bot.setAttribute("stroke", "#1e2d50");
      bot.setAttribute("stroke-width", "1.5");
      bot.setAttribute("fill", "none");
      svg.appendChild(bot);

      // horizontal to next card
      const mid = document.createElementNS("http://www.w3.org/2000/svg", "line");
      mid.setAttribute("x1", "30");
      mid.setAttribute("y1", String(midY));
      mid.setAttribute("x2", "60");
      mid.setAttribute("y2", String(midY));
      mid.setAttribute("stroke", "#1e2d50");
      mid.setAttribute("stroke-width", "1.5");
      svg.appendChild(mid);

      wrap.appendChild(svg);
    }
    return wrap;
  }

  // ── Teams ─────────────────────────────────────────────────
  function renderTeams() {
    if (!teamsGrid || !data) return;
    teamsGrid.innerHTML = "";
    (data.teams || []).forEach(team => {
      const initials = team.shortName || team.name.split(" ").map(w=>w[0]).join("").slice(0,3);
      const card = document.createElement("div");
      card.className = "team-card animate-in";
      card.innerHTML = `
        <div class="team-card-header">
          <div class="team-card-avatar" style="background:linear-gradient(135deg,${team.color}cc,${team.color}88)">${initials}</div>
          <div class="team-card-info">
            <div class="team-card-name">${team.name}</div>
            <div class="team-card-count">${team.players.length} Pemain</div>
          </div>
        </div>
        <div class="team-card-body">
          <ul class="player-list">
            ${team.players.map((p,i)=>`
              <li class="player-item">
                <span class="player-num">${i+1}</span>
                <span>${p}</span>
              </li>`).join("")}
          </ul>
        </div>`;
      teamsGrid.appendChild(card);
    });
  }

  // ── Schedule ──────────────────────────────────────────────
  function renderSchedule() {
    if (!scheduleBody || !data) return;
    const { resolveMatches, getTeamById } = window.VolyData;
    const resolved = resolveMatches(data);
    scheduleBody.innerHTML = "";
    resolved.forEach(match => {
      const t1 = match.team1 ? getTeamById(data, match.team1) : null;
      const t2 = match.team2 ? getTeamById(data, match.team2) : null;
      const t1Name = t1?.name || (match.team2===null?"BYE":"TBD");
      const t2Name = t2?.name || (match.team1!==null&&!match.team2?"BYE":"TBD");
      const t1c = t1?.color||"#4a5d80", t2c = t2?.color||"#4a5d80";
      let status="tbd",label="Belum Dijadwalkan";
      if (match.winner){status="done";label="Selesai";}
      else if(match.team1&&(match.team2||match.team2===null)){status="upcoming";label="Akan Datang";}
      const tr = document.createElement("tr");
      tr.style.cursor="pointer";
      tr.innerHTML=`
        <td><span style="color:var(--text-muted);font-family:'Rajdhani',sans-serif;font-weight:700;font-size:.7rem;letter-spacing:.1em">${match.roundName.toUpperCase()}</span></td>
        <td>
          <div class="match-teams-cell">
            <span style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:50%;background:${t1c};display:inline-block"></span><strong style="color:var(--text-primary);font-family:'Rajdhani',sans-serif;font-weight:700">${t1Name}</strong></span>
            <span class="vs-badge">VS</span>
            <span style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:50%;background:${t2c};display:inline-block"></span><strong style="color:var(--text-primary);font-family:'Rajdhani',sans-serif;font-weight:700">${t2Name}</strong></span>
          </div>
        </td>
        <td>${match.date||"—"}</td>
        <td style="color:var(--gold);font-family:'Rajdhani',sans-serif;font-weight:700">${match.time||"—"}</td>
        <td>${match.score1!==null&&match.score2!==null?`<span style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--text-primary)">${match.score1} – ${match.score2}</span>`:`<span style="color:var(--text-muted)">-</span>`}</td>
        <td><span class="status-badge ${status}">${label}</span></td>`;
      tr.addEventListener("click",()=>openMatchModal(match.id,resolved));
      scheduleBody.appendChild(tr);
    });
  }

  // ── Tabs ─────────────────────────────────────────────────
  function setupTabs() {
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById("panel-"+btn.dataset.tab)?.classList.add("active");
      });
    });
  }

  // ── Match Modal ────────────────────────────────────────────
  function setupModal() {
    if (!matchModal) return;
    matchModal.addEventListener("click", e => { if(e.target===matchModal) closeModal(); });
    matchModal.querySelector(".modal-close-btn")?.addEventListener("click", closeModal);
  }

  function openMatchModal(matchId, resolved) {
    if (!matchModal) return;
    const { getTeamById } = window.VolyData;
    const match = (resolved || window.VolyData.resolveMatches(data)).find(m=>m.id===matchId);
    if (!match) return;

    const t1 = match.team1 ? getTeamById(data,match.team1) : null;
    const t2 = match.team2 ? getTeamById(data,match.team2) : null;
    const winner = match.winner ? getTeamById(data,match.winner) : null;
    const t1Name = t1?.name||(match.team2===null?"BYE":"TBD");
    const t2Name = t2?.name||(match.team1!==null&&!match.team2?"BYE":"TBD");
    const t1c = t1?.color||"#4a5d80", t2c = t2?.color||"#4a5d80";
    const t1i = t1?.shortName||t1Name.slice(0,3).toUpperCase();
    const t2i = t2?.shortName||t2Name.slice(0,3).toUpperCase();

    matchModal.querySelector(".modal-body").innerHTML = `
      <div class="modal-matchup">
        <div class="modal-team">
          <div class="modal-team-avatar" style="background:linear-gradient(135deg,${t1c}cc,${t1c}88)">${t1i}</div>
          <div class="modal-team-name">${t1Name}</div>
        </div>
        <div class="modal-vs">VS</div>
        <div class="modal-team">
          <div class="modal-team-avatar" style="background:linear-gradient(135deg,${t2c}cc,${t2c}88)">${t2i}</div>
          <div class="modal-team-name">${t2Name}</div>
        </div>
      </div>
      ${match.score1!==null||match.score2!==null?`
      <div class="modal-score">
        <span class="score-display" style="color:${match.winner===match.team1?'var(--gold)':'var(--text-primary)'}">${match.score1??"—"}</span>
        <span class="score-separator">:</span>
        <span class="score-display" style="color:${match.winner===match.team2?'var(--gold)':'var(--text-primary)'}">${match.score2??"—"}</span>
      </div>`:""}
      <div class="modal-info-grid">
        <div class="modal-info-item"><div class="modal-info-label">🗓 Babak</div><div class="modal-info-value">${match.roundName}</div></div>
        <div class="modal-info-item"><div class="modal-info-label">⏰ Waktu</div><div class="modal-info-value">${match.time||"TBD"}</div></div>
        <div class="modal-info-item" style="grid-column:1/-1"><div class="modal-info-label">📅 Tanggal</div><div class="modal-info-value">${match.date||"TBD"}</div></div>
      </div>
      ${winner?`<div class="modal-winner-badge"><span>👑</span><div><div class="label">PEMENANG</div><div class="value">${winner.name}</div></div></div>`:""}`;

    matchModal.querySelector(".modal-title").textContent = match.roundName.toUpperCase();
    matchModal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    matchModal?.classList.remove("open");
    document.body.style.overflow = "";
  }

  // ── Drag scroll ────────────────────────────────────────────
  function setupDrag() {
    const wrap = document.querySelector(".bracket-wrap");
    if (!wrap) return;
    let down=false, startX, sl;
    wrap.addEventListener("mousedown", e=>{down=true;startX=e.pageX-wrap.offsetLeft;sl=wrap.scrollLeft;wrap.style.cursor="grabbing";});
    document.addEventListener("mouseup",()=>{down=false;if(wrap)wrap.style.cursor="grab";});
    wrap.addEventListener("mousemove",e=>{if(!down)return;e.preventDefault();wrap.scrollLeft=sl-(e.pageX-wrap.offsetLeft-startX);});
  }

  // ── Boot ─────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", init);
})();
