// ============================================================
// FIREBASE CONFIG — Voly Tournament
// ============================================================
// CATATAN: Jangan gunakan "import" — kita pakai Firebase compat SDK
// yang di-load via <script> tag di HTML, bukan ES modules.
// ============================================================

const firebaseConfig = {
  apiKey:            "AIzaSyDsYy9Sxg9yICeA_YYe4XKvyv4NOvR9BL4",
  authDomain:        "voly-b2e66.firebaseapp.com",
  databaseURL:       "https://voly-b2e66-default-rtdb.firebaseio.com",
  projectId:         "voly-b2e66",
  storageBucket:     "voly-b2e66.firebasestorage.app",
  messagingSenderId: "927582314020",
  appId:             "1:927582314020:web:3f5dd641d96055ec4642b1",
  measurementId:     "G-BL8DWL0PGL"
};

window.FIREBASE_CONFIG = firebaseConfig;
