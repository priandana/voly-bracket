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

  // ── Layout constants ────────────────────────────────────
  const CARD_W   = 240;   // match card width (px)
  const CARD_H   = 96;    // match card height (px)
  const SLOT_H   = 160;   // vertical space per base-round slot
  const COL_GAP  = 80;    // horizontal gap between columns (connector space)
  const BASE_N   = 4;     // number of QF matches
  const ROUNDS   = 3;     // QF, SF, Final
  const LABELS   = ["Quarter Final", "Semi Final", "Final"];
  const LABEL_H  = 40;    // space above bracket for round labels
  const CHAMP_W  = 120;   // champion column width

  const TOTAL_H  = BASE_N * SLOT_H;
  const TOTAL_W  = ROUNDS * CARD_W + (ROUNDS - 1) * COL_GAP + COL_GAP + CHAMP_W;

  // Position helpers
  function colX(round)           { return round * (CARD_W + COL_GAP); }
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

  // ── BRACKET — absolute layout + SVG overlay ───────────────
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
      el.style.cssText = `
        position:absolute;
        top:0;left:${colX(r)}px;
        width:${CARD_W}px;height:${LABEL_H}px;
        display:flex;align-items:center;justify-content:center;
        font-family:'Bebas Neue',sans-serif;font-size:.85rem;
        letter-spacing:.15em;
        color:${r === 2 ? "var(--gold)" : "var(--text-muted)"};
      `;
      el.textContent = lbl;
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

      toMatches.forEach((_, ti) => {
        const topIdx = ti * 2;
        const botIdx = ti * 2 + 1;

        const x1   = colX(r) + CARD_W;          // right edge of "from" column
        const x2   = colX(r + 1);               // left edge of "to" column
        const xMid = x1 + (x2 - x1) / 2;       // midpoint for the bracket bend

        const topCY = LABEL_H + centerY(r, topIdx);
        const botCY = LABEL_H + centerY(r, botIdx);
        const toCY  = LABEL_H + centerY(r + 1, ti);

        const S = "#1e2d50", W = "1.5";

        // Arm from top card
        line(svg, x1, topCY, xMid, topCY, S, W);
        // Arm from bottom card
        line(svg, x1, botCY, xMid, botCY, S, W);
        // Vertical bracket
        line(svg, xMid, topCY, xMid, botCY, S, W);
        // Horizontal to next card
        line(svg, xMid, toCY, x2, toCY, S, W);
      });
    }

    // ── Connector Final → Champion ─────────────────────────
    const finalPos = { x: colX(2) + CARD_W, y: LABEL_H + centerY(2, 0) };
    const champX   = colX(ROUNDS) + 10;
    line(svg, finalPos.x, finalPos.y, champX, finalPos.y, "#1e2d50", "1.5");

    // ── Champion display ───────────────────────────────────
    const finalMatch = roundMatches[2][0];
    const champion   = finalMatch?.winner ? getTeamById(data, finalMatch.winner) : null;
    const champDiv   = document.createElement("div");
    champDiv.style.cssText = `
      position:absolute;
      left:${champX}px;
      top:${LABEL_H + centerY(2,0) - 64}px;
      text-align:center;
      width:${CHAMP_W}px;
    `;
    champDiv.innerHTML = `
      <div class="champion-trophy">🏆</div>
      <div class="champion-label">CHAMPION</div>
      ${champion
        ? `<div class="champion-name" style="color:var(--gold);font-size:1rem">${champion.name}</div>`
        : `<div class="champion-tbd">Belum ditentukan</div>`}
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
    el.setAttribute("stroke-linecap", "round");
    svg.appendChild(el);
  }

  // ── Build match card ───────────────────────────────────────
  function buildMatchCard(match, roundIdx) {
    const { getTeamById } = window.VolyData;
    const card = document.createElement("div");
    card.className = `match-card${roundIdx === 2 ? " final-card" : ""}`;
    card.dataset.matchId = match.id;

    const t1 = match.team1 ? getTeamById(data, match.team1) : null;
    const t2 = match.team2 ? getTeamById(data, match.team2) : null;

    card.innerHTML = `
      <div class="match-meta">
        <span class="match-id">${match.roundName.toUpperCase()}</span>
        <span class="match-datetime">
          ${(match.date || "").replace("Agustus","Ags")} · <span class="time">${match.time || "—"}</span>
        </span>
      </div>
      ${teamRow(t1, match.team2 === null ? "BYE" : null, match.score1, match.winner, match, 1)}
      ${teamRow(t2, null,                                 match.score2, match.winner, match, 2)}
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

  // ── Teams ─────────────────────────────────────────────────
  function renderTeams() {
    if (!teamsGrid || !data) return;
    teamsGrid.innerHTML = "";
    (data.teams || []).forEach(team => {
      const initials = team.shortName || team.name.split(" ").map(w => w[0]).join("").slice(0, 3);
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
            ${team.players.map((p, i) => `
              <li class="player-item">
                <span class="player-num">${i + 1}</span>
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
      const t1n = t1?.name || (match.team2 === null ? "BYE" : "TBD");
      const t2n = t2?.name || (match.team1 !== null && !match.team2 ? "BYE" : "TBD");
      const t1c = t1?.color || "#4a5d80", t2c = t2?.color || "#4a5d80";
      let status = "tbd", label = "Belum Dijadwalkan";
      if (match.winner) { status = "done"; label = "Selesai"; }
      else if (match.team1 && (match.team2 || match.team2 === null)) { status = "upcoming"; label = "Akan Datang"; }
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

  // ── Match Modal ────────────────────────────────────────────
  function setupModal() {
    if (!matchModal) return;
    matchModal.addEventListener("click", e => { if (e.target === matchModal) closeModal(); });
    matchModal.querySelector(".modal-close-btn")?.addEventListener("click", closeModal);
  }

  function openMatchModal(matchId, resolved) {
    if (!matchModal) return;
    const { getTeamById } = window.VolyData;
    const match  = (resolved || window.VolyData.resolveMatches(data)).find(m => m.id === matchId);
    if (!match) return;
    const t1     = match.team1 ? getTeamById(data, match.team1) : null;
    const t2     = match.team2 ? getTeamById(data, match.team2) : null;
    const winner = match.winner ? getTeamById(data, match.winner) : null;
    const t1n  = t1?.name || (match.team2 === null ? "BYE" : "TBD");
    const t2n  = t2?.name || (match.team1 !== null && !match.team2 ? "BYE" : "TBD");
    const t1c  = t1?.color || "#4a5d80", t2c = t2?.color || "#4a5d80";
    const t1i  = t1?.shortName || t1n.slice(0, 3).toUpperCase();
    const t2i  = t2?.shortName || t2n.slice(0, 3).toUpperCase();

    matchModal.querySelector(".modal-body").innerHTML = `
      <div class="modal-matchup">
        <div class="modal-team">
          <div class="modal-team-avatar" style="background:linear-gradient(135deg,${t1c}cc,${t1c}88)">${t1i}</div>
          <div class="modal-team-name">${t1n}</div>
        </div>
        <div class="modal-vs">VS</div>
        <div class="modal-team">
          <div class="modal-team-avatar" style="background:linear-gradient(135deg,${t2c}cc,${t2c}88)">${t2i}</div>
          <div class="modal-team-name">${t2n}</div>
        </div>
      </div>
      ${match.score1 !== null || match.score2 !== null ? `
      <div class="modal-score">
        <span class="score-display" style="color:${match.winner===match.team1?'var(--gold)':'var(--text-primary)'}">${match.score1 ?? "—"}</span>
        <span class="score-separator">:</span>
        <span class="score-display" style="color:${match.winner===match.team2?'var(--gold)':'var(--text-primary)'}">${match.score2 ?? "—"}</span>
      </div>` : ""}
      <div class="modal-info-grid">
        <div class="modal-info-item"><div class="modal-info-label">🗓 Babak</div><div class="modal-info-value">${match.roundName}</div></div>
        <div class="modal-info-item"><div class="modal-info-label">⏰ Waktu</div><div class="modal-info-value">${match.time || "TBD"}</div></div>
        <div class="modal-info-item" style="grid-column:1/-1"><div class="modal-info-label">📅 Tanggal</div><div class="modal-info-value">${match.date || "TBD"}</div></div>
      </div>
      ${winner ? `
      <div class="modal-winner-badge">
        <span>👑</span>
        <div><div class="label">PEMENANG</div><div class="value">${winner.name}</div></div>
      </div>` : ""}
    `;
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
    let down = false, startX, sl;
    wrap.addEventListener("mousedown", e => { down=true; startX=e.pageX-wrap.offsetLeft; sl=wrap.scrollLeft; wrap.style.cursor="grabbing"; });
    document.addEventListener("mouseup", () => { down=false; if(wrap) wrap.style.cursor="grab"; });
    wrap.addEventListener("mousemove", e => { if(!down) return; e.preventDefault(); wrap.scrollLeft=sl-(e.pageX-wrap.offsetLeft-startX); });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
