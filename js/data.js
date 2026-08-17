// ============================================================
// DATA.JS — Firebase Realtime Database + localStorage fallback
// ============================================================

const DEFAULT_DATA = {
  tournament: {
    name: "BAGAN PERTANDINGAN VOLLY",
    subtitle: "Padalarang Open Tournament 2026",
    location: "GOR Padalarang, Bandung Barat",
    date: "18 - 20 Agustus 2026",
    status: "ongoing"
  },
  teams: [
    {
      id: "team1", name: "BANDUNG 1", shortName: "BDG1", color: "#f59e0b",
      captain: "Muhammad Devin Pratama",
      players: ["Agus Ridwan","Rijal Faisal Sani","Muhammad Devin Pratama","Deli Martin","Diky","Ully Nopa","Nopan Suparlan","Usep Pasbar","Rully Ferdian","Asep Ramdhan","Asep SAepudin","Soni Hmansyah"]
    },
    {
      id: "team2", name: "BANDUNG 2", shortName: "BDG2", color: "#3b82f6",
      captain: "Sahid",
      players: ["Erfan","Sendi","Budi m","Deni","Roy","Jaka","Andi","Agung","Sahid","Suparman","Yana","Adam"]
    },
    {
      id: "team3", name: "TRANSPORT PADALARANG", shortName: "TRNS", color: "#10b981",
      captain: "RICKY",
      players: ["ucok johanes s","ahmad rian","RICKY","m fauzan","abdul halim","eka widiansyah","iwan hermawan","indra lesmana","aldi"]
    },
    {
      id: "team4", name: "WAREHOUSE 4", shortName: "WH4", color: "#8b5cf6",
      captain: "Sandy Maulana",
      players: ["Denada","Suherman","CAHAYA MUKTI","firdaus","Priandana mangraja lubis","Asep m firman","FUAR RESTU","rian","haikal","Sandy Maulana","cun cun"]
    },
    {
      id: "team5", name: "WAREHOUSE 5", shortName: "WH5", color: "#ef4444",
      captain: "Bagus maulana yusup",
      players: ["Ceptiana hidayat","Bagus maulana yusup","Samba s","iwan","Gugun Gunawan","Ahmad Sasa Komara","Muhammad Revy Farizqy","Muhammad Zaenal Mutaqin","Adam Julianto","EKO SUTANTO","M jayan"]
    },
    {
      id: "team6", name: "WAREHOUSE 6", shortName: "WH6", color: "#f97316",
      captain: "ANAN KOSWARA",
      players: ["ANAN KOSWARA","ACEP","Kisro","Erwin","Roby","Rediana Irwansyah","RUSMAN","MOMO ASEP SUHENDAR","Januar","Muhamad Abdul Azis","Muhammad Revy Farizqy"]
    }
  ],
  matches: [
    { id:"m1", round:1, roundName:"Quarter Final", position:1, team1:"team2", team2:null,    score1:null, score2:null, winner:"team2", date:"19 Agustus 2026", time:"17:00", nextMatch:"m5", nextSlot:1 },
    { id:"m2", round:1, roundName:"Quarter Final", position:2, team1:"team5", team2:"team4", score1:null, score2:null, winner:null,    date:"18 Agustus 2026", time:"17:00", nextMatch:"m5", nextSlot:2 },
    { id:"m3", round:1, roundName:"Quarter Final", position:3, team1:"team6", team2:"team1", score1:null, score2:null, winner:null,    date:"18 Agustus 2026", time:"17:40", nextMatch:"m6", nextSlot:1 },
    { id:"m4", round:1, roundName:"Quarter Final", position:4, team1:"team3", team2:null,    score1:null, score2:null, winner:"team3", date:"19 Agustus 2026", time:"17:40", nextMatch:"m6", nextSlot:2 },
    { id:"m5", round:2, roundName:"Semi Final",    position:1, team1:null,    team2:null,    score1:null, score2:null, winner:null,    date:"19 Agustus 2026", time:"17:00", nextMatch:"m7", nextSlot:1 },
    { id:"m6", round:2, roundName:"Semi Final",    position:2, team1:null,    team2:null,    score1:null, score2:null, winner:null,    date:"19 Agustus 2026", time:"17:40", nextMatch:"m7", nextSlot:2 },
    { id:"m7", round:3, roundName:"Final",         position:1, team1:null,    team2:null,    score1:null, score2:null, winner:null,    date:"20 Agustus 2026", time:"17:00", nextMatch:null, nextSlot:null }
  ]
};

// ============================================================
// Firebase Manager
// ============================================================
const FB = {
  db: null,
  ref: null,
  isConnected: false,
  listeners: [],

  // Initialize Firebase connection
  init() {
    if (typeof firebase === "undefined" || !window.FIREBASE_CONFIG) {
      console.warn("[Voly] Firebase SDK not loaded, running in offline mode.");
      this.isConnected = false;
      return false;
    }
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      this.db = firebase.database();
      this.ref = this.db.ref("voly_tournament");
      this.isConnected = true;
      return true;
    } catch (err) {
      console.error("[Voly] Firebase init error:", err);
      this.isConnected = false;
      return false;
    }
  },

  // Read once
  async readOnce() {
    if (!this.isConnected) return null;
    try {
      const snap = await this.ref.once("value");
      return snap.val();
    } catch (err) {
      console.error("[Voly] Read error:", err);
      return null;
    }
  },

  // Write full data
  async write(data) {
    if (!this.isConnected) return false;
    try {
      await this.ref.set(data);
      return true;
    } catch (err) {
      console.error("[Voly] Write error:", err);
      return false;
    }
  },

  // Subscribe to real-time changes
  subscribe(callback) {
    if (!this.isConnected) return;
    this.ref.on("value", snap => {
      const val = snap.val();
      if (val) callback(val);
    });
  },

  // Unsubscribe all
  unsubscribe() {
    if (this.ref) this.ref.off();
  },

  // Update specific path (partial update)
  async update(path, value) {
    if (!this.isConnected) return false;
    try {
      await this.db.ref(`voly_tournament/${path}`).set(value);
      return true;
    } catch (err) {
      console.error("[Voly] Update error:", err);
      return false;
    }
  }
};

// ============================================================
// Storage helpers — Firebase primary, localStorage fallback
// ============================================================

// In-memory cache (always in sync)
let _memCache = null;

function getDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function loadLocalData() {
  try {
    const s = localStorage.getItem("voly_tournament_data");
    return s ? JSON.parse(s) : getDefault();
  } catch { return getDefault(); }
}

function saveLocalData(data) {
  try { localStorage.setItem("voly_tournament_data", JSON.stringify(data)); } catch {}
}

// Public API

async function initDB() {
  const connected = FB.init();
  if (connected) {
    // Fetch from Firebase
    let remote = await FB.readOnce();
    if (remote) {
      let updated = false;

      // Auto-sync official captains & rosters & clean typos
      DEFAULT_DATA.teams.forEach(defTeam => {
        const target = (remote.teams || []).find(t => t.id === defTeam.id);
        if (target) {
          if (!target.captain && defTeam.captain) {
            target.captain = defTeam.captain;
            updated = true;
          }
          if (target.name && target.name.includes("WHAREHOUSE")) {
            target.name = target.name.replace(/WHAREHOUSE/g, "WAREHOUSE");
            updated = true;
          }
          if (JSON.stringify(target.players).includes("Ully Nope") || target.players.length !== defTeam.players.length) {
            target.players = defTeam.players;
            target.captain = defTeam.captain;
            updated = true;
          }
        }
      });

      // Auto-sync official match bracket pairings if still using old default structure
      if (remote.matches && remote.matches.length > 0) {
        const m1 = remote.matches.find(m => m.id === "m1");
        const m2 = remote.matches.find(m => m.id === "m2");
        if (m1 && m1.team1 !== "team2" || m2 && m2.team1 !== "team5") {
          remote.matches = DEFAULT_DATA.matches;
          updated = true;
        }

        // Auto-heal winner if scores were entered but winner was unselected
        remote.matches.forEach(m => {
          if (!m.winner && m.score1 !== null && m.score2 !== null && m.score1 !== undefined && m.score2 !== undefined && m.score1 !== m.score2) {
            if (m.score1 > m.score2 && m.team1) {
              m.winner = m.team1;
              updated = true;
            } else if (m.score2 > m.score1 && m.team2) {
              m.winner = m.team2;
              updated = true;
            }
          }
        });
      }

      if (updated) {
        await FB.write(remote);
      }

      _memCache = remote;
      saveLocalData(remote);
    } else {
      _memCache = getDefault();
      await FB.write(_memCache);
      saveLocalData(_memCache);
    }
  } else {
    _memCache = loadLocalData();
    let updated = false;
    DEFAULT_DATA.teams.forEach(defTeam => {
      const target = (_memCache.teams || []).find(t => t.id === defTeam.id);
      if (target) {
        if (!target.captain && defTeam.captain) {
          target.captain = defTeam.captain;
          target.players = defTeam.players;
          updated = true;
        }
        if (target.name && target.name.includes("WHAREHOUSE")) {
          target.name = target.name.replace(/WHAREHOUSE/g, "WAREHOUSE");
          updated = true;
        }
      }
    });
    if (_memCache.matches && _memCache.matches.length > 0) {
      const m1 = _memCache.matches.find(m => m.id === "m1");
      if (m1 && m1.team1 !== "team2") {
        _memCache.matches = DEFAULT_DATA.matches;
        updated = true;
      }
      _memCache.matches.forEach(m => {
        if (!m.winner && m.score1 !== null && m.score2 !== null && m.score1 !== undefined && m.score2 !== undefined && m.score1 !== m.score2) {
          if (m.score1 > m.score2 && m.team1) {
            m.winner = m.team1;
            updated = true;
          } else if (m.score2 > m.score1 && m.team2) {
            m.winner = m.team2;
            updated = true;
          }
        }
      });
    }
    if (updated) saveLocalData(_memCache);
  }
  return _memCache;
}

function loadData() {
  // Returns in-memory cache synchronously (use after initDB resolves)
  return _memCache || loadLocalData();
}

async function saveData(data) {
  _memCache = data;
  saveLocalData(data); // instant local save
  if (FB.isConnected) {
    await FB.write(data);
  } else {
    // Fallback: trigger storage event for same-page updates
    window.dispatchEvent(new StorageEvent("storage", { key: "voly_tournament_data" }));
  }
}

function resetData() {
  return getDefault();
}

function subscribeToUpdates(callback) {
  if (FB.isConnected) {
    FB.subscribe(data => {
      _memCache = data;
      saveLocalData(data);
      callback(data);
    });
  } else {
    // Fallback to storage events (same browser)
    window.addEventListener("storage", e => {
      if (e.key === "voly_tournament_data") {
        _memCache = loadLocalData();
        callback(_memCache);
      }
    });
  }
}

// ============================================================
// Helpers
// ============================================================
function getTeamById(data, id) {
  return (data.teams || []).find(t => t.id === id) || null;
}

function getMatchById(data, id) {
  return (data.matches || []).find(m => m.id === id) || null;
}

function resolveMatches(data) {
  const matches = JSON.parse(JSON.stringify(data.matches || []));
  matches.forEach(m => {
    if (m.winner && m.nextMatch) {
      const next = matches.find(x => x.id === m.nextMatch);
      if (next) {
        if (m.nextSlot === 1) next.team1 = m.winner;
        else next.team2 = m.winner;
      }
    }
  });
  return matches;
}

window.VolyData = {
  initDB, loadData, saveData, resetData,
  subscribeToUpdates,
  getTeamById, getMatchById, resolveMatches,
  DEFAULT_DATA, FB
};
