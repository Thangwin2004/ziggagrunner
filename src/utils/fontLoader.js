const VIETNAMESE_FONT_SAMPLE =
  "Ă Â Đ Ê Ô Ơ Ư Ắ Ắ Ằ Ẳ Ẵ Ặ Ế Ề Ể Ễ Ệ Ố Ồ Ổ Ỗ Ộ Ớ Ờ Ở Ỡ Ợ Ứ Ừ Ử Ữ Ự Bộ Lạc Đậu Phộng";

function withTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(
      () => reject(new Error("Font loading timed out")),
      timeoutMs,
    );
  });
  return Promise.race([promise, timeout]).finally(() =>
    window.clearTimeout(timeoutId),
  );
}

function waitForStylesheet(link, timeoutMs) {
  if (link.sheet) return Promise.resolve();
  return new Promise((resolve) => {
    let timeoutId;
    const finish = () => {
      window.clearTimeout(timeoutId);
      link.removeEventListener("load", finish);
      link.removeEventListener("error", finish);
      resolve();
    };
    link.addEventListener("load", finish, { once: true });
    link.addEventListener("error", finish, { once: true });
    timeoutId = window.setTimeout(finish, timeoutMs);
  });
}

export async function waitForGameFonts(fontRequests, timeoutMs = 4500) {
  if (!document.fonts?.load) return false;

  try {
    const stylesheets = Array.from(
      document.querySelectorAll(
        'link[rel="stylesheet"][href*="fonts.googleapis.com"]',
      ),
    );
    await withTimeout(
      Promise.all(
        stylesheets.map((link) => waitForStylesheet(link, timeoutMs)),
      ),
      timeoutMs,
    );

    const loadedFaces = await withTimeout(
      Promise.all(
        fontRequests.map((font) =>
          document.fonts.load(font, VIETNAMESE_FONT_SAMPLE),
        ),
      ),
      timeoutMs,
    );
    await withTimeout(document.fonts.ready, timeoutMs);

    const ready = loadedFaces.every((faces) => faces.length > 0);
    document.documentElement.dataset.gameFonts = ready ? "ready" : "fallback";
    if (!ready) console.warn("Game fonts unavailable; using system fallback.");
    return ready;
  } catch (error) {
    document.documentElement.dataset.gameFonts = "fallback";
    console.warn("Game fonts unavailable; using system fallback.", error);
    return false;
  }
}
