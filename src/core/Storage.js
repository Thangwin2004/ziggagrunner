const LOCAL_STORAGE_KEY = "yeahbunny_records";

export function getStats() {
  try {
    const key = LOCAL_STORAGE_KEY;
    const data = window.localStorage.getItem(key);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error("Local storage read error", e);
  }
  return {
    highScore: 0,
    totalCoins: 0,
    unlockedLevel: 1,
    levelHighScores: { 1: 0, 2: 0, 3: 0 },
  };
}

export function saveStats(stats) {
  try {
    const key = LOCAL_STORAGE_KEY;
    window.localStorage.setItem(key, JSON.stringify(stats));
  } catch (e) {
    console.error("Local storage write error", e);
  }
}
