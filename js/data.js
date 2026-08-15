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
      id: "team4", name: "WHAREHOUSE 4", shortName: "WH4", color: "#8b5cf6",
      captain: "Sandy Maulana",
      players: ["Denada","Suherman","CAHAYA MUKTI","firdaus","Priandana mangraja lubis","Asep m firman","FUAR RESTU","rian","haikal","Sandy Maulana","cun cun"]
    },
    {
      id: "team5", name: "WHAREHOUSE 5", shortName: "WH5", color: "#ef4444",
      captain: "Bagus maulana yusup",
      players: ["Ceptiana hidayat","Bagus maulana yusup","Samba s","iwan","Gugun Gunawan","Ahmad Sasa Komara","Muhammad Revy Farizqy","Muhammad Zaenal Mutaqin","Adam Julianto","EKO SUTANTO","M jayan"]
    },
    {
      id: "team6", name: "WHAREHOUSE 6", shortName: "WH6", color: "#f97316",
      captain: "ANAN KOSWARA",
      players: ["ANAN KOSWARA","ACEP","Kisro","Erwin","Roby","Rediana Irwansyah","RUSMAN","MOMO ASEP SUHENDAR","Januar","Muhamad Abdul Azis","Muhammad Revy Farizqy"]
    }
  ],
  matches: [
    { id:"m1", round:1, roundName:"Quarter Final", position:1, team1:"team1", team2:null,    score1:null, score2:null, winner:"team1", date:"19 Agustus 2026", time:"17:00", nextMatch:"m5", nextSlot:1 },
    { id:"m2", round:1, roundName:"Quarter Final", position:2, team1:"team2", team2:"team3", score1:null, score2:null, winner:null,    date:"18 Agustus 2026", time:"17:00", nextMatch:"m5", nextSlot:2 },
    { id:"m3", round:1, roundName:"Quarter Final", position:3, team1:"team4", team2:"team5", score1:null, score2:null, winner:null,    date:"18 Agustus 2026", time:"17:40", nextMatch:"m6", nextSlot:1 },
    { id:"m4", round:1, roundName:"Quarter Final", position:4, team1:"team6", team2:null,    score1:null, score2:null, winner:"team6", date:"19 Agustus 2026", time:"17:40", nextMatch:"m6", nextSlot:2 },
    { id:"m5", round:2, roundName:"Semi Final",    position:1, team1:null,    team2:null,    score1:null, score2:null, winner:null,    date:"19 Agustus 2026", time:"17:40", nextMatch:"m7", nextSlot:1 },
    { id:"m6", round:2, roundName:"Semi Final",    position:2, team1:null,    team2:null,    score1:null, score2:null, winner:null,    date:"19 Agustus 2026", time:"17:00", nextMatch:"m7", nextSlot:2 },
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
    try {
      const config = window.FIREBASE_CONFIG;
      if (!config || config.apiKey.includes("GANTI")) {
        console.warn("[Voly] Firebase config belum diisi — pakai localStorage saja.");
        this.isConnected = false;
        return false;
      }

      // Initialize Firebase app (check if already initialized)
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(config);
      }

      this.db  = firebase.database();
      this.ref = this.db.ref("voly_tournament");
      this.isConnected = true;
      console.log("[Voly] ✅ Firebase terhubung!");
      return true;
    } catch (err) {
      console.error("[Voly] Firebase error:", err);
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
    const remote = await FB.readOnce();
    if (remote) {
      _memCache = remote;
      saveLocalData(remote); // keep local copy as offline cache
    } else {
      // First time: push default data to Firebase
      _memCache = loadLocalData();
      await FB.write(_memCache);
    }
  } else {
    _memCache = loadLocalData();
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
