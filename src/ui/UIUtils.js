export function gameAlert(message) {
  return new Promise((resolve) => {
    if (!document.getElementById("vibrant-modal-styles")) {
      const style = document.createElement("style");
      style.id = "vibrant-modal-styles";
      style.textContent = `
        /* Duplicate some UIManager styles for standalone use if UIManager hasn't loaded yet */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(43,50,47,0.64); backdrop-filter: blur(6px); display: flex; justify-content: center; align-items: center; pointer-events: auto; z-index: 9999; animation: fadeIn 0.25s ease-out forwards; }
        .modal-card-wrapper { background: #F1B76A; padding: 4px; border-radius: 20px; box-shadow: 0 6px 0 #CE482B, 0 15px 30px rgba(64,52,66,0.24); position: relative; transform: scale(0.95); animation: popIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }
        .modal-card { background: #FFF9F1; border-radius: 16px; border: 2px solid #FFF0D5; padding: 45px 20px 20px 20px; width: 300px; text-align: center; position: relative; box-sizing: border-box; }
        .modal-ribbon { position: absolute; top: -20px; left: 50%; transform: translateX(-50%); width: 220px; height: 42px; background: linear-gradient(180deg, #FF9F5A 0%, #FF713D 100%); border: 2px solid #FFD3AD; border-radius: 12px; box-shadow: 0 4px 0 #CE482B, 0 4px 10px rgba(64,52,66,0.18); display: flex; justify-content: center; align-items: center; z-index: 5; }
        .modal-ribbon.pink { background: linear-gradient(180deg, #FF9F5A 0%, #FF713D 100%); box-shadow: 0 4px 0 #CE482B, 0 4px 10px rgba(64,52,66,0.18); border-color: #FFD3AD; }
        .modal-ribbon span { font-family:'Be Vietnam Pro', sans-serif; color: #FFFDF8; font-weight: 900; font-size: 17px; letter-spacing: 0.5px; text-shadow: 0 2px 0 rgba(139,55,35,0.3); }
        .msg-text { font-family:'Be Vietnam Pro', sans-serif; font-size: 18px; color: #403442; font-weight: 700; margin-bottom: 25px; line-height: 1.4; }
        .icon-btn { min-width: 56px; height: 50px; padding: 0 16px; border: none; border-radius: 12px; background: linear-gradient(180deg, #FF9F5A 0%, #FF713D 100%); box-shadow: 0 6px 0 #CE482B, 0 9px 16px rgba(64,52,66,0.18); color: #FFFDF8; font-family:'Be Vietnam Pro',sans-serif; font-size: 28px; font-weight: 800; line-height: 1; cursor: pointer; transition: transform 0.1s ease-out, box-shadow 0.1s ease-out, filter 0.1s ease-out; }
        .icon-btn:hover { transform: translateY(-1px); filter: brightness(1.025); }
        .icon-btn:active { transform: translateY(5px); box-shadow: 0 1px 0 #CE482B; }
        .icon-btn:focus-visible { outline: 3px solid #8F3F2C; outline-offset: 3px; }
      `;
      document.head.appendChild(style);
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const wrapper = document.createElement("div");
    wrapper.className = "modal-card-wrapper";

    const ribbon = document.createElement("div");
    ribbon.className = "modal-ribbon pink";
    ribbon.innerHTML = "<span>THÔNG BÁO</span>";

    const card = document.createElement("div");
    card.className = "modal-card";

    const msg = document.createElement("div");
    msg.className = "msg-text";
    msg.innerText = message;

    const okBtn = document.createElement("button");
    okBtn.className = "icon-btn";
    okBtn.innerText = "✓";
    okBtn.setAttribute("aria-label", "Đồng ý");
    okBtn.style.marginTop = "10px";

    okBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve();
    };

    card.appendChild(msg);
    card.appendChild(okBtn);
    wrapper.appendChild(ribbon);
    wrapper.appendChild(card);
    overlay.appendChild(wrapper);

    document.body.appendChild(overlay);
  });
}

export function gameConfirm(message) {
  return new Promise((resolve) => {
    // Re-use gameAlert style if not exist
    if (!document.getElementById("vibrant-modal-styles")) {
      gameAlert(""); // Dirty trick to force style injection
      document.body.removeChild(document.body.lastChild);
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const wrapper = document.createElement("div");
    wrapper.className = "modal-card-wrapper";

    const ribbon = document.createElement("div");
    ribbon.className = "modal-ribbon";
    ribbon.innerHTML = "<span>XÁC NHẬN</span>";

    const card = document.createElement("div");
    card.className = "modal-card";

    const msg = document.createElement("div");
    msg.className = "msg-text";
    msg.innerText = message;

    const btnGroup = document.createElement("div");
    btnGroup.style.display = "flex";
    btnGroup.style.justifyContent = "center";
    btnGroup.style.gap = "40px";
    btnGroup.style.marginTop = "10px";

    const noBtn = document.createElement("button");
    noBtn.className = "icon-btn";
    noBtn.innerText = "×";
    noBtn.setAttribute("aria-label", "Hủy");
    noBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
    };

    const yesBtn = document.createElement("button");
    yesBtn.className = "icon-btn";
    yesBtn.innerText = "✓";
    yesBtn.setAttribute("aria-label", "Đồng ý");
    yesBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(true);
    };

    btnGroup.appendChild(noBtn);
    btnGroup.appendChild(yesBtn);

    card.appendChild(msg);
    card.appendChild(btnGroup);
    wrapper.appendChild(ribbon);
    wrapper.appendChild(card);
    overlay.appendChild(wrapper);

    document.body.appendChild(overlay);
  });
}
