// ============================================================
// BRACKET.JS — Public page with precise SVG connector lines
// ============================================================

(function () {
  "use strict";

  let data = null;

  const bracketCanvas   = document.getElementById("bracket-canvas");
  const teamsGrid       = document.getElementById("teams-grid");
  const scheduleBody    = document.getElementById("schedule-body");
  const matchModal      = document.getElementById("match-modal");
  const connectionBadge = document.getElementById("connection-badge");

  // ── Layout constants (Challonge-style proportions) ────────
  const CARD_W   = 220;   // match card width (px)
  const CARD_H   = 58;    // match card height (px)
  const SLOT_H   = 116;   // vertical space per base-round slot
  const COL_GAP  = 64;    // horizontal gap between columns
  const BASE_N   = 4;     // number of QF matches
  const ROUNDS   = 3;     // QF, SF, Final
  const LABELS   = ["QUARTERFINALS", "SEMIFINALS", "FINALS"];
  const LABEL_H  = 38;    // space above bracket for round labels
  const CHAMP_W  = 160;   // champion column width

  const TOTAL_H  = BASE_N * SLOT_H;
  const TOTAL_W  = ROUNDS * CARD_W + (ROUNDS - 1) * COL_GAP + COL_GAP + CHAMP_W + 30;

  // Position helpers
  function colX(round)           { return round * (CARD_W + COL_GAP) + 24; }
  function slotSize(round)       { return SLOT_H * Math.pow(2, round); }
  function centerY(round, idx)   { return slotSize(round) / 2 + idx * slotSize(round); }
  function cardTop(round, idx)   { return centerY(round, idx) - CARD_H / 2; }

  // ── Init ─────────────────────────────────────────────────
  async function init() {
    if (bracketCanvas) {
      bracketCanvas.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:16px;
          padding:60px 40px;color:var(--text-muted);width:100%">
          <div class="spinner"></div>
          <span style="font-family:'Rajdhani',sans-serif;font-size:.9rem;letter-spacing:.05em">
            Menghubungkan ke database...</span>
        </div>`;
    }

    data = await window.VolyData.initDB();
    updateConnectionBadge(window.VolyData.FB.isConnected);
    setupAdminMode();
    renderAll();
    setupTabs();
    setupModal();
    setupDrag();

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
  function updateConnectionBadge(live) {
    if (!connectionBadge) return;
    connectionBadge.innerHTML = live
      ? `<span class="dot dot-green"></span> Live`
      : `<span class="dot dot-muted"></span> Offline`;
    connectionBadge.className = `connection-badge ${live ? "live" : "offline"}`;
  }

  // ── Live toast ────────────────────────────────────────────
  let _toastT;
  function showLiveToast() {
    let t = document.getElementById("live-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "live-toast";
      t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
        background:rgba(20,29,53,.95);border:1px solid rgba(34,197,94,.4);color:#22c55e;
        padding:10px 20px;border-radius:99px;font-size:.82rem;font-family:'Rajdhani',sans-serif;
        font-weight:700;letter-spacing:.06em;z-index:999;display:flex;align-items:center;gap:8px;
        backdrop-filter:blur(8px);box-shadow:0 8px 32px rgba(0,0,0,.4);
        animation:slideUp .3s ease;`;
      document.body.appendChild(t);
    }
    t.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:#22c55e;
      display:inline-block;animation:pulse 1s infinite"></span> Bracket diperbarui!`;
    t.style.display = "flex";
    clearTimeout(_toastT);
    _toastT = setTimeout(() => { t.style.display = "none"; }, 3000);
  }

  // ── Hero ─────────────────────────────────────────────────
  function renderHero() {
    if (!data) return;
    const t = data.tournament || {};
    const $  = id => document.getElementById(id);
    if ($("tournament-name"))     $("tournament-name").textContent     = t.name     || "";
    if ($("tournament-subtitle")) $("tournament-subtitle").textContent = t.subtitle || "";
    if ($("hero-date"))           $("hero-date").textContent           = t.date     || "";
    if ($("hero-location"))       $("hero-location").innerHTML         = `<strong>${t.location||""}</strong>`;
    document.title = t.name || "Voly Bracket";
  }

  // ── BRACKET — absolute layout + SVG overlay (Challonge-style) ──
  function renderBracket() {
    if (!bracketCanvas || !data) return;
    const { resolveMatches, getTeamById } = window.VolyData;
    const resolved = resolveMatches(data);

    const roundMatches = [
      resolved.filter(m => m.round === 1),  // 4 QF
      resolved.filter(m => m.round === 2),  // 2 SF
      resolved.filter(m => m.round === 3),  // 1 Final
    ];

    // ── Container ──────────────────────────────────────────
    bracketCanvas.innerHTML = "";
    bracketCanvas.style.cssText = `
      position: relative;
      width: ${TOTAL_W}px;
      min-width: ${TOTAL_W}px;
      height: ${TOTAL_H + LABEL_H}px;
    `;

    // ── Round labels ───────────────────────────────────────
    LABELS.forEach((lbl, r) => {
      const el = document.createElement("div");
      el.className = "round-header-wrap";
      el.style.cssText = `
        position:absolute;
        top:0;left:${colX(r)}px;
        width:${CARD_W}px;height:${LABEL_H}px;
        display:flex;align-items:center;justify-content:center;
      `;
      el.innerHTML = `<span class="round-badge ${r === 2 ? 'final-badge' : ''}">${lbl}</span>`;
      bracketCanvas.appendChild(el);
    });

    // ── SVG connector overlay ──────────────────────────────
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;overflow:visible;";
    svg.setAttribute("width",  TOTAL_W);
    svg.setAttribute("height", TOTAL_H + LABEL_H);
    bracketCanvas.appendChild(svg);

    // ── Match cards (absolute) ─────────────────────────────
    roundMatches.forEach((matches, r) => {
      matches.forEach((match, mi) => {
        const x = colX(r);
        const y = LABEL_H + cardTop(r, mi);
        const card = buildMatchCard(match, r);
        card.style.position = "absolute";
        card.style.left     = `${x}px`;
        card.style.top      = `${y}px`;
        card.style.width    = `${CARD_W}px`;
        card.addEventListener("click", () => openMatchModal(match.id, resolved));
        bracketCanvas.appendChild(card);
      });
    });

    // ── Draw connectors QF→SF and SF→Final ────────────────
    for (let r = 0; r < ROUNDS - 1; r++) {
      const fromMatches = roundMatches[r];
      const toMatches   = roundMatches[r + 1];

      toMatches.forEach((match, ti) => {
        const topIdx = ti * 2;
        const botIdx = ti * 2 + 1;

        const x1   = colX(r) + CARD_W;          // right edge of "from" column
        const x2   = colX(r + 1);               // left edge of "to" column
        const xMid = x1 + (x2 - x1) / 2;       // midpoint for the bracket bend

        const topCY = LABEL_H + centerY(r, topIdx);
        const botCY = LABEL_H + centerY(r, botIdx);
        const toCY  = LABEL_H + centerY(r + 1, ti);

        const S = "#525763", W = "2";

        // Arm from top card
        line(svg, x1, topCY, xMid, topCY, S, W);
        // Arm from bottom card
        line(svg, x1, botCY, xMid, botCY, S, W);
        // Vertical bracket
        line(svg, xMid, topCY, xMid, botCY, S, W);
        // Horizontal to next card
        line(svg, xMid, toCY, x2, toCY, S, W);

        // Challonge-style match index label on connector line
        const nextNum = match.id.replace("m", "");
        drawMatchLabel(svg, xMid + 6, toCY - 6, nextNum);
      });
    }

    // ── Connector Final → Champion ─────────────────────────
    const finalPos = { x: colX(2) + CARD_W, y: LABEL_H + centerY(2, 0) };
    const champX   = colX(ROUNDS) + 16;
    line(svg, finalPos.x, finalPos.y, champX, finalPos.y, "#525763", "2");

    // ── Champion display (Challonge-style podium) ───────────
    const finalMatch = roundMatches[2][0];
    const champion   = finalMatch?.winner ? getTeamById(data, finalMatch.winner) : null;
    const champDiv   = document.createElement("div");
    champDiv.className = "champion-node animate-in";
    champDiv.style.cssText = `
      position:absolute;
      left:${champX}px;
      top:${LABEL_H + centerY(2,0) - 29}px;
      width:${CHAMP_W}px;
    `;
    champDiv.innerHTML = `
      <div class="champ-card ${champion ? 'has-champ' : ''}">
        <div class="champ-trophy-badge">🏆</div>
        <div class="champ-details">
          <div class="champ-title">CHAMPION</div>
          <div class="champ-winner-name">${champion ? champion.name : 'Belum ditentukan'}</div>
        </div>
      </div>
    `;
    bracketCanvas.appendChild(champDiv);
  }

  // ── SVG line helper ────────────────────────────────────────
  function line(svg, x1, y1, x2, y2, stroke, sw) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
    el.setAttribute("x1", x1); el.setAttribute("y1", y1);
    el.setAttribute("x2", x2); el.setAttribute("y2", y2);
    el.setAttribute("stroke", stroke);
    el.setAttribute("stroke-width", sw);
    el.setAttribute("stroke-linecap", "square");
    svg.appendChild(el);
  }

  // ── SVG text label helper ──────────────────────────────────
  function drawMatchLabel(svg, x, y, text) {
    const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    txt.setAttribute("x", x);
    txt.setAttribute("y", y);
    txt.setAttribute("fill", "#6b7280");
    txt.setAttribute("font-family", "'Rajdhani', sans-serif");
    txt.setAttribute("font-size", "11");
    txt.setAttribute("font-weight", "700");
    txt.textContent = text;
    svg.appendChild(txt);
  }

  // ── Build match card (Challonge-style) ──────────────────────
  function buildMatchCard(match, roundIdx) {
    const { getTeamById } = window.VolyData;
    const card = document.createElement("div");
    card.className = `match-card${roundIdx === 2 ? " final-card" : ""}${match.winner ? " has-winner" : ""}`;
    card.dataset.matchId = match.id;

    const t1 = match.team1 ? getTeamById(data, match.team1) : null;
    const t2 = match.team2 ? getTeamById(data, match.team2) : null;
    const matchNum = match.id.replace("m", "");

    card.innerHTML = `
      <div class="match-num-tag" title="Match ${matchNum}">${matchNum}</div>
      <div class="match-rows">
        ${teamRow(t1, match.team2 === null ? "BYE" : null, match.score1, match.winner, match, 1)}
        ${teamRow(t2, null,                                 match.score2, match.winner, match, 2)}
      </div>
    `;
    return card;
  }

  function teamRow(team, byeLabel, score, winner, match, slot) {
    const teamId   = slot === 1 ? match.team1 : match.team2;
    const isWinner = winner && winner === teamId;
    const isLoser  = winner && winner !== teamId && teamId !== null;
    let cls = "team-row";
    if (isWinner) cls += " winner";
    if (isLoser)  cls += " loser";

    // Seed number calculation
    let seedNum = "";
    if (team) {
      const idx = (data?.teams || []).findIndex(t => t.id === team.id);
      seedNum = idx !== -1 ? (idx + 1) : "";
    }

    let colorIndicator = "", nameHtml = "";
    if (!teamId && !byeLabel) {
      nameHtml = `<span class="team-name tbd">TBD</span>`;
    } else if (byeLabel === "BYE") {
      nameHtml = `<span class="team-name bye">BYE</span>`;
    } else if (team) {
      colorIndicator = `<span class="team-color-indicator" style="background:${team.color}"></span>`;
      nameHtml = `<span class="team-name" title="${team.name}">${team.name}</span>`;
    } else {
      nameHtml = `<span class="team-name tbd">TBD</span>`;
    }

    const scoreText = (score !== null && score !== undefined) ? score : "";

    return `
      <div class="${cls}">
        <div class="team-seed">${seedNum}</div>
        <div class="team-info">
          ${colorIndicator}
          ${nameHtml}
        </div>
        <div class="team-score-box">${scoreText}</div>
      </div>`;
  }

  // ── Teams ─────────────────────────────────────────────────
  function renderTeams() {
    if (!teamsGrid || !data) return;
    teamsGrid.innerHTML = "";
    (data.teams || []).forEach(team => {
      const initials = team.shortName || team.name.split(" ").map(w => w[0]).join("").slice(0, 3);
      const card = document.createElement("div");
      card.className = "team-card animate-in";
      const captainName = team.captain || "";

      card.innerHTML = `
        <div class="team-card-header">
          <div class="team-card-avatar" style="background:linear-gradient(135deg,${team.color}cc,${team.color}88);border:2px solid ${team.color}">
            ${initials}
          </div>
          <div class="team-card-info">
            <div class="team-card-name">${team.name}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:2px;">
              <span class="team-card-count">${team.players.length} Pemain</span>
              ${captainName ? `<span style="font-size:0.72rem;color:var(--gold);font-family:'Rajdhani',sans-serif;font-weight:700;">⭐ C: ${captainName}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="team-card-body">
          <ul class="player-list">
            ${team.players.map((p, i) => {
              const isCap = captainName && p.toLowerCase().trim() === captainName.toLowerCase().trim();
              return `
                <li class="player-item ${isCap ? 'is-captain' : ''}">
                  <span class="player-num" style="${isCap ? 'color:var(--gold);font-weight:800;' : ''}">${i + 1}</span>
                  <span style="flex:1;${isCap ? 'color:#fff;font-weight:700;' : ''}">${p}</span>
                  ${isCap ? '<span class="player-captain-tag">⭐ KAPTEN</span>' : ''}
                </li>`;
            }).join("")}
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
      const isT2Bye = match.round === 1 && (match.id === "m1" || match.id === "m4");
      const t1 = match.team1 ? getTeamById(data, match.team1) : null;
      const t2 = match.team2 ? getTeamById(data, match.team2) : null;
      const t1n = t1?.name || "TBD";
      const t2n = t2?.name || (isT2Bye ? "BYE" : "TBD");
      const t1c = t1?.color || "#4a5d80", t2c = t2?.color || (isT2Bye ? "#4a5d80" : "#64748b");
      let status = "tbd", label = "Belum Dijadwalkan";
      if (match.winner) { status = "done"; label = "Selesai"; }
      else if (match.team1 && (match.team2 || isT2Bye)) { status = "upcoming"; label = "Akan Datang"; }
      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";
      tr.innerHTML = `
        <td><span style="color:var(--text-muted);font-family:'Rajdhani',sans-serif;font-weight:700;font-size:.7rem;letter-spacing:.1em">${match.roundName.toUpperCase()}</span></td>
        <td>
          <div class="match-teams-cell">
            <span style="display:flex;align-items:center;gap:6px">
              <span style="width:8px;height:8px;border-radius:50%;background:${t1c};display:inline-block"></span>
              <strong style="color:var(--text-primary);font-family:'Rajdhani',sans-serif;font-weight:700">${t1n}</strong>
            </span>
            <span class="vs-badge">VS</span>
            <span style="display:flex;align-items:center;gap:6px">
              <span style="width:8px;height:8px;border-radius:50%;background:${t2c};display:inline-block"></span>
              <strong style="color:var(--text-primary);font-family:'Rajdhani',sans-serif;font-weight:700">${t2n}</strong>
            </span>
          </div>
        </td>
        <td>${match.date || "—"}</td>
        <td style="color:var(--gold);font-family:'Rajdhani',sans-serif;font-weight:700">${match.time || "—"}</td>
        <td>${match.score1 !== null && match.score2 !== null
          ? `<span style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--text-primary)">${match.score1} – ${match.score2}</span>`
          : `<span style="color:var(--text-muted)">-</span>`}</td>
        <td><span class="status-badge ${status}">${label}</span></td>`;
      tr.addEventListener("click", () => openMatchModal(match.id, resolved));
      scheduleBody.appendChild(tr);
    });
  }

  // ── Tabs ─────────────────────────────────────────────────
  function setupTabs() {
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById("panel-" + btn.dataset.tab)?.classList.add("active");
      });
    });
  }

  // ── Admin Mode Banner & Logout ────────────────────────────
  function setupAdminMode() {
    const isAdmin = sessionStorage.getItem("voly_admin_auth") === "1";
    const banner = document.getElementById("admin-mode-banner");
    if (isAdmin) {
      document.body.classList.add("admin-authenticated");
      if (banner) banner.style.display = "block";
      const logoutBtn = document.getElementById("btn-admin-logout");
      if (logoutBtn) {
        logoutBtn.onclick = () => {
          sessionStorage.removeItem("voly_admin_auth");
          location.reload();
        };
      }
    } else {
      document.body.classList.remove("admin-authenticated");
      if (banner) banner.style.display = "none";
    }
  }

  // ── Match Modal (Interactive Admin & Read-only Public) ───
  function setupModal() {
    if (!matchModal) return;
    matchModal.addEventListener("click", e => { if (e.target === matchModal) closeModal(); });
    matchModal.querySelector(".modal-close-btn")?.addEventListener("click", closeModal);
  }

  function openMatchModal(matchId, resolved) {
    if (!matchModal) return;
    const { getTeamById } = window.VolyData;
    const matchList = resolved || window.VolyData.resolveMatches(data);
    const match = matchList.find(m => m.id === matchId);
    if (!match) return;

    const isAdmin = sessionStorage.getItem("voly_admin_auth") === "1";
    const isT2Bye = match.round === 1 && (match.id === "m1" || match.id === "m4");
    const t1     = match.team1 ? getTeamById(data, match.team1) : null;
    const t2     = match.team2 ? getTeamById(data, match.team2) : null;
    const winner = match.winner ? getTeamById(data, match.winner) : null;
    const t1n  = t1?.name || "TBD";
    const t2n  = t2?.name || (isT2Bye ? "BYE" : "TBD");
    const t1c  = t1?.color || "#3b82f6", t2c = t2?.color || (isT2Bye ? "#4a5d80" : "#64748b");
    const t1i  = t1?.shortName || "TBD";
    const t2i  = t2?.shortName || (isT2Bye ? "BYE" : "TBD");

    const isT1Winner = match.winner && match.winner === match.team1;
    const isT2Winner = match.winner && match.winner === match.team2;

    const stageIcon = match.round === 3 ? "🏆" : (match.round === 2 ? "🔥" : "⚡");

    const titleEl = matchModal.querySelector(".modal-title");
    if (titleEl) {
      titleEl.innerHTML = `<span class="modal-stage-badge">${stageIcon} ${match.roundName.toUpperCase()} · MATCH ${match.id.replace("m","")}</span>`;
    }

    const body = matchModal.querySelector(".modal-body");

    if (isAdmin) {
      // ═════════════════════════════════════════════════
      // INTERACTIVE ADMIN CONTROLS IN BRACKET MODAL
      // ═════════════════════════════════════════════════
      body.innerHTML = `
        <div style="background:linear-gradient(90deg,rgba(212,168,67,0.15),rgba(20,29,53,0.4));border:1px solid rgba(212,168,67,0.35);border-radius:10px;padding:8px 14px;margin-bottom:18px;font-size:0.8rem;color:var(--gold);font-family:'Rajdhani',sans-serif;font-weight:700;display:flex;align-items:center;justify-content:space-between;">
          <span style="display:flex;align-items:center;gap:6px;">👑 <strong>MODE ADMIN</strong> · Quick Match Manager</span>
          <span style="font-size:0.7rem;color:var(--text-muted);font-weight:600;">Auto-sync Cloud</span>
        </div>

        <!-- MATCHUP ARENA -->
        <div class="modal-matchup-arena">
          <div class="modal-team-card ${isT1Winner ? 'is-winner' : (isT2Winner ? 'is-loser' : '')}">
            <div class="modal-team-avatar" style="background:linear-gradient(135deg,${t1c}dd,${t1c}88);border:2px solid ${t1c};">
              ${isT1Winner ? '<span class="team-crown-icon">👑</span>' : ''}
              ${t1i}
            </div>
            <div class="modal-team-name" style="color:${t1 ? t1c : 'var(--text-muted)'}">${t1n}</div>
          </div>

          <div class="modal-vs-badge">
            <div class="vs-circle">VS</div>
          </div>

          <div class="modal-team-card ${isT2Winner ? 'is-winner' : (isT1Winner ? 'is-loser' : '')}">
            <div class="modal-team-avatar" style="background:linear-gradient(135deg,${t2c}dd,${t2c}88);border:2px solid ${t2c};">
              ${isT2Winner ? '<span class="team-crown-icon">👑</span>' : ''}
              ${t2i}
            </div>
            <div class="modal-team-name" style="color:${t2 ? t2c : 'var(--text-muted)'}">${t2n}</div>
          </div>
        </div>

        <!-- WINNER SELECTION (1-CLICK) -->
        <div style="margin-bottom:16px;">
          <div style="font-size:0.75rem;font-weight:700;color:var(--gold);letter-spacing:0.08em;text-transform:uppercase;font-family:'Rajdhani',sans-serif;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
            <span>👑</span> PILIH PEMENANG PERTANDINGAN:
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <button type="button" id="btn-pick-win-1" class="btn ${match.winner === match.team1 && match.team1 ? 'btn-primary' : 'btn-secondary'}"
              style="justify-content:center;padding:12px 10px;font-size:0.88rem;${!match.team1 ? 'opacity:0.4;pointer-events:none;' : ''}">
              👑 ${t1n}
            </button>
            <button type="button" id="btn-pick-win-2" class="btn ${match.winner === match.team2 && match.team2 ? 'btn-primary' : 'btn-secondary'}"
              style="justify-content:center;padding:12px 10px;font-size:0.88rem;${!match.team2 ? 'opacity:0.4;pointer-events:none;' : ''}">
              👑 ${t2n}
            </button>
          </div>
        </div>

        <!-- SCORES & TIME -->
        <div style="background:rgba(10,14,26,0.6);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:14px;margin-bottom:18px;">
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:14px;">
            <div style="text-align:center;">
              <div style="font-size:0.7rem;color:var(--text-muted);font-family:'Rajdhani',sans-serif;font-weight:700;margin-bottom:4px;">SKOR ${t1i}</div>
              <input type="number" id="quick-score-1" class="score-input" min="0" max="99" value="${match.score1 ?? ''}" placeholder="0">
            </div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;color:var(--text-muted);padding-top:14px;">:</div>
            <div style="text-align:center;">
              <div style="font-size:0.7rem;color:var(--text-muted);font-family:'Rajdhani',sans-serif;font-weight:700;margin-bottom:4px;">SKOR ${t2i}</div>
              <input type="number" id="quick-score-2" class="score-input" min="0" max="99" value="${match.score2 ?? ''}" placeholder="0">
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div>
              <div style="font-size:0.68rem;color:var(--text-muted);font-family:'Rajdhani',sans-serif;font-weight:700;margin-bottom:4px;">📅 TANGGAL</div>
              <input type="text" id="quick-date" class="field-input" value="${match.date || ''}" placeholder="19 Agustus 2026">
            </div>
            <div>
              <div style="font-size:0.68rem;color:var(--text-muted);font-family:'Rajdhani',sans-serif;font-weight:700;margin-bottom:4px;">⏰ JAM</div>
              <input type="text" id="quick-time" class="field-input" value="${match.time || ''}" placeholder="17:00">
            </div>
          </div>
        </div>

        <!-- ACTIONS -->
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <button type="button" id="btn-quick-reset" class="btn btn-danger btn-sm">↺ Reset Pemenang</button>
          <button type="button" id="btn-quick-save" class="btn btn-primary" style="padding:10px 20px;font-size:0.9rem;">💾 Simpan & Update Live</button>
        </div>
      `;

      let selectedWinner = match.winner;

      const btnWin1 = document.getElementById("btn-pick-win-1");
      const btnWin2 = document.getElementById("btn-pick-win-2");

      if (btnWin1 && match.team1) {
        btnWin1.onclick = () => {
          selectedWinner = match.team1;
          btnWin1.className = "btn btn-primary";
          if (btnWin2) btnWin2.className = "btn btn-secondary";
        };
      }
      if (btnWin2 && match.team2) {
        btnWin2.onclick = () => {
          selectedWinner = match.team2;
          btnWin2.className = "btn btn-primary";
          if (btnWin1) btnWin1.className = "btn btn-secondary";
        };
      }

      document.getElementById("btn-quick-reset")?.addEventListener("click", async () => {
        const targetMatch = data.matches.find(m => m.id === matchId);
        if (targetMatch) {
          targetMatch.winner = null;
          targetMatch.score1 = null;
          targetMatch.score2 = null;

          await window.VolyData.saveData(data);
          renderAll();
          closeModal();
          showLiveToast("↺ Pemenang & skor pertandingan berhasil direset!");
        }
      });

      document.getElementById("btn-quick-save")?.addEventListener("click", async () => {
        const s1 = document.getElementById("quick-score-1")?.value.trim();
        const s2 = document.getElementById("quick-score-2")?.value.trim();
        const d  = document.getElementById("quick-date")?.value.trim();
        const tm = document.getElementById("quick-time")?.value.trim();

        const targetMatch = data.matches.find(m => m.id === matchId);
        if (targetMatch) {
          targetMatch.score1 = s1 === "" ? null : parseInt(s1, 10);
          targetMatch.score2 = s2 === "" ? null : parseInt(s2, 10);
          targetMatch.date   = d || targetMatch.date;
          targetMatch.time   = tm || targetMatch.time;
          targetMatch.winner = selectedWinner || null;

          await window.VolyData.saveData(data);
          renderAll();
          closeModal();
          showLiveToast("Match berhasil diperbarui & disimpan!");
        }
      });

    } else {
      // ═════════════════════════════════════════════════
      // SPECTATOR / PUBLIC CHAMPIONSHIP ARENA VIEW
      // ═════════════════════════════════════════════════
      body.innerHTML = `
        <!-- MATCHUP ARENA -->
        <div class="modal-matchup-arena">
          <div class="modal-team-card ${isT1Winner ? 'is-winner' : (isT2Winner ? 'is-loser' : '')}">
            <div class="modal-team-avatar" style="background:linear-gradient(135deg,${t1c}dd,${t1c}88);border:2px solid ${t1c};">
              ${isT1Winner ? '<span class="team-crown-icon">👑</span>' : ''}
              ${t1i}
            </div>
            <div class="modal-team-name" style="color:${t1 ? t1c : 'var(--text-muted)'}">${t1n}</div>
          </div>

          <div class="modal-vs-badge">
            <div class="vs-circle">VS</div>
          </div>

          <div class="modal-team-card ${isT2Winner ? 'is-winner' : (isT1Winner ? 'is-loser' : '')}">
            <div class="modal-team-avatar" style="background:linear-gradient(135deg,${t2c}dd,${t2c}88);border:2px solid ${t2c};">
              ${isT2Winner ? '<span class="team-crown-icon">👑</span>' : ''}
              ${t2i}
            </div>
            <div class="modal-team-name" style="color:${t2 ? t2c : 'var(--text-muted)'}">${t2n}</div>
          </div>
        </div>

        <!-- SCOREBOARD -->
        <div class="modal-scoreboard">
          <span class="score-digit ${isT1Winner ? 'winner-score' : ''}">
            ${match.score1 !== null && match.score1 !== undefined ? match.score1 : '—'}
          </span>
          <span class="score-colon">:</span>
          <span class="score-digit ${isT2Winner ? 'winner-score' : ''}">
            ${match.score2 !== null && match.score2 !== undefined ? match.score2 : '—'}
          </span>
        </div>

        <!-- INFO TILES -->
        <div class="modal-info-grid">
          <div class="modal-info-tile">
            <div class="modal-info-label">🏟️ Babak Pertandingan</div>
            <div class="modal-info-val">${match.roundName}</div>
          </div>
          <div class="modal-info-tile">
            <div class="modal-info-label">⏰ Waktu Kickoff</div>
            <div class="modal-info-val" style="color:var(--gold)">${match.time || "TBD"}</div>
          </div>
          <div class="modal-info-tile full-width">
            <div class="modal-info-label">📅 Tanggal Pertandingan</div>
            <div class="modal-info-val">${match.date || "TBD"}</div>
          </div>
        </div>

        <!-- WINNER REVEAL -->
        ${winner ? `
        <div class="modal-winner-banner">
          <div class="crown-box">👑</div>
          <div>
            <div class="winner-title">PEMENANG MATCH</div>
            <div class="winner-team">${winner.name}</div>
          </div>
        </div>` : ''}

        <!-- QUICK ADMIN LOGIN LINK -->
        <div style="margin-top:20px;text-align:center;">
          <a href="#" id="link-quick-admin" style="display:inline-flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--gold);text-decoration:none;font-family:'Rajdhani',sans-serif;font-weight:700;background:rgba(212,168,67,0.08);padding:6px 14px;border-radius:99px;border:1px solid rgba(212,168,67,0.25);transition:all var(--transition);">
            🔐 Login Admin untuk Edit Pertandingan Ini Langsung
          </a>
        </div>
      `;

      document.getElementById("link-quick-admin")?.addEventListener("click", e => {
        e.preventDefault();
        const p = prompt("Masukkan Password Admin:");
        if (p === "voly2026") {
          sessionStorage.setItem("voly_admin_auth", "1");
          setupAdminMode();
          openMatchModal(matchId, resolved);
        } else if (p !== null) {
          alert("Password salah.");
        }
      });
    }

    matchModal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    matchModal?.classList.remove("open");
    document.body.style.overflow = "";
  }

  // ── Drag scroll & Mobile Round Nav ─────────────────────────
  function setupDrag() {
    const wrap = document.querySelector(".bracket-wrap");
    if (!wrap) return;
    let down = false, startX, sl;
    wrap.addEventListener("mousedown", e => { down=true; startX=e.pageX-wrap.offsetLeft; sl=wrap.scrollLeft; wrap.style.cursor="grabbing"; });
    document.addEventListener("mouseup", () => { down=false; if(wrap) wrap.style.cursor="grab"; });
    wrap.addEventListener("mousemove", e => { if(!down) return; e.preventDefault(); wrap.scrollLeft=sl-(e.pageX-wrap.offsetLeft-startX); });

    // Sync mobile round pills on scroll
    wrap.addEventListener("scroll", () => {
      const scrollPos = wrap.scrollLeft;
      const roundIdx = Math.min(2, Math.max(0, Math.round(scrollPos / (CARD_W + COL_GAP))));
      document.querySelectorAll("[data-round-pill]").forEach((pill, idx) => {
        if (idx === roundIdx) pill.classList.add("active");
        else pill.classList.remove("active");
      });
    }, { passive: true });
  }

  window.scrollToRound = function(roundIdx) {
    const wrap = document.querySelector(".bracket-wrap");
    if (!wrap) return;
    const targetX = colX(roundIdx);
    wrap.scrollTo({ left: targetX, behavior: "smooth" });
    document.querySelectorAll("[data-round-pill]").forEach((pill, idx) => {
      if (idx === roundIdx) pill.classList.add("active");
      else pill.classList.remove("active");
    });
  };

  document.addEventListener("DOMContentLoaded", init);
})();
