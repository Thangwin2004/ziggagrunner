const STORAGE_KEY = "winkgames:zigzag-runner:language";
export const messages = {
  en: {
    "document.title": "Zigzag Runner",
    "loading.progress": "Loading {progress}%",
    "menu.journey": "ADVENTURE",
    "menu.best": "🏆 BEST: {score}",
    "menu.play": "PLAY NOW",
    "settings.title": "SETTINGS",
    "settings.language": "LANGUAGE",
    "settings.music": "MUSIC",
    "settings.sfx": "SOUND FX",
    "actions.close": "Close",
    "actions.home": "Home",
    "actions.replay": "Replay",
    "actions.resume": "Resume",
    "actions.double": "Double score",
    "actions.yes": "Yes",
    "actions.cancel": "Cancel",
    "gameover.title": "GAME OVER",
    "gameover.record": "NEW RECORD!",
    "gameover.top": "RANK #1",
    "gameover.encouragement": "Better luck next time!",
    "revive.title": "REVIVE",
    "revive.question": "Would you like to continue?",
    "revive.yes": "YES",
    "revive.no": "No, thanks",
    "hud.tutorial": "TAP TO TURN!",
    "leaderboard.title": "LEADERBOARD",
    "leaderboard.rank": "RANK",
    "leaderboard.name": "NAME",
    "leaderboard.score": "Score",
    "leaderboard.empty": "No records yet. Play to set your first high score.",
    "account.member": "Member",
    "account.you": "You (Guest)",
    "account.signedIn": "Account: {name} (Signed in)",
    "account.memberSignedIn": "Account: Member (Signed in)",
    "account.guest": "Account: Guest (Saved on device)",
    "dialog.notice": "NOTICE",
    "dialog.confirm": "CONFIRM",
  },
  vi: {
    "document.title": "Hành Trình Zigzag",
    "loading.progress": "Đang tải {progress}%",
    "menu.journey": "HÀNH TRÌNH",
    "menu.best": "🏆 KỶ LỤC: {score}",
    "menu.play": "CHƠI NGAY",
    "settings.title": "CÀI ĐẶT",
    "settings.language": "NGÔN NGỮ",
    "settings.music": "ÂM NHẠC",
    "settings.sfx": "HIỆU ỨNG",
    "actions.close": "Đóng",
    "actions.home": "Trang chủ",
    "actions.replay": "Chơi lại",
    "actions.resume": "Tiếp tục",
    "actions.double": "Nhân đôi điểm",
    "actions.yes": "Đồng ý",
    "actions.cancel": "Hủy",
    "gameover.title": "KẾT THÚC",
    "gameover.record": "KỶ LỤC MỚI!",
    "gameover.top": "HẠNG #1",
    "gameover.encouragement": "Chúc bạn may mắn lần sau!",
    "revive.title": "HỒI SINH",
    "revive.question": "Bạn có muốn tiếp tục?",
    "revive.yes": "CÓ",
    "revive.no": "Không, cảm ơn",
    "hud.tutorial": "CHẠM ĐỂ BẺ LÁI!",
    "leaderboard.title": "BẢNG VÀNG",
    "leaderboard.rank": "HẠNG",
    "leaderboard.name": "TÊN",
    "leaderboard.score": "Điểm số",
    "leaderboard.empty":
      "Chưa có thành tích. Hãy chơi để thiết lập kỷ lục đầu tiên.",
    "account.member": "Thành viên",
    "account.you": "Bạn (Khách)",
    "account.signedIn": "Tài khoản: {name} (Đã đăng nhập)",
    "account.memberSignedIn": "Tài khoản: Thành viên (Đã đăng nhập)",
    "account.guest": "Tài khoản: Khách (Điểm lưu thiết bị)",
    "dialog.notice": "THÔNG BÁO",
    "dialog.confirm": "XÁC NHẬN",
  },
};

export class I18nManager {
  constructor() {
    this.language = "en";
    this.listeners = new Set();
    try {
      const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "vi") this.language = saved;
    } catch {
      /* Storage can be unavailable in embedded games. */
    }
    this.applyDocumentLanguage();
  }
  applyDocumentLanguage() {
    if (!globalThis.document) return;
    document.documentElement.lang = this.language;
    document.title = this.t("document.title");
  }
  setLanguage(language) {
    if (language !== "en" && language !== "vi") return false;
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, language);
    } catch {
      /* Keep the session choice. */
    }
    if (this.language === language) return false;
    this.language = language;
    this.applyDocumentLanguage();
    for (const listener of this.listeners) listener(language);
    return true;
  }
  t(key, variables = {}) {
    const template = messages[this.language][key] ?? messages.en[key] ?? key;
    return template.replace(
      /\{(\w+)\}/g,
      (match, name) => variables[name] ?? match,
    );
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
export const i18n = new I18nManager();
export const t = (key, variables) => i18n.t(key, variables);
