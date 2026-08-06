export const AdManager = {
  showRewardedVideo: async () => {
    console.log("[AdManager] Requesting Rewarded Video...");
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 500); // 500ms delay to simulate ad loading
    });
  },
  showInterstitial: async () => {
    console.log("[AdManager] Showing Interstitial Ad...");
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 500); // 500ms delay to simulate ad loading
    });
  },
};
