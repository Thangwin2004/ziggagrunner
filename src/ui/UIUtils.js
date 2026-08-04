export function gameAlert(message) {
  return new Promise((resolve) => {
    if (!document.getElementById("vibrant-modal-styles")) {
      const style = document.createElement("style");
      style.id = "vibrant-modal-styles";
      style.textContent = `
        /* Duplicate some UIManager styles for standalone use if UIManager hasn't loaded yet */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.65); display: flex; justify-content: center; align-items: center; pointer-events: auto; z-index: 9999; animation: fadeIn 0.25s ease-out forwards; }
        .modal-card-wrapper { background: linear-gradient(180deg, #CE93D8 0%, #AB47BC 100%); padding: 6px; border-radius: 20px; box-shadow: 0 6px 0 #7B1FA2, 0 15px 30px rgba(0,0,0,0.4); position: relative; transform: scale(0.85); animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .modal-card { background: #F3E5F5; border-radius: 14px; border: 2.5px solid #AB47BC; padding: 45px 20px 20px 20px; width: 300px; text-align: center; position: relative; box-sizing: border-box; }
        .modal-ribbon { position: absolute; top: -20px; left: 50%; transform: translateX(-50%); width: 220px; height: 42px; background: linear-gradient(180deg, #E1BEE7 0%, #AB47BC 100%); border: 2px solid #F3E5F5; border-radius: 10px; box-shadow: 0 4px 0 #7B1FA2, 0 4px 10px rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 5; }
        .modal-ribbon.pink { background: linear-gradient(180deg, #E1BEE7 0%, #7B1FA2 100%); box-shadow: 0 4px 0 #4A148C, 0 4px 10px rgba(0,0,0,0.3); border-color: #F3E5F5; }
        .modal-ribbon span { font-family: 'Arial Black', Impact, sans-serif; color: #ffffff; font-weight: bold; font-size: 17px; letter-spacing: 1px; text-shadow: 1.5px 1.5px 2px rgba(0,0,0,0.4); }
        .msg-text { font-family: 'Outfit', sans-serif; font-size: 18px; color: #4A148C; font-weight: bold; margin-bottom: 25px; line-height: 1.4; }
        .icon-btn { width: 50px; height: 50px; cursor: pointer; transition: transform 0.1s; }
        .icon-btn:hover { transform: scale(1.1); filter: brightness(1.1); }
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

    const okBtn = document.createElement("img");
    okBtn.className = "icon-btn";
    okBtn.src = "/assest/iconbtn/yes_btn.png";
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

    const noBtn = document.createElement("img");
    noBtn.className = "icon-btn";
    noBtn.src = "/assest/iconbtn/close_btn.png";
    noBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
    };

    const yesBtn = document.createElement("img");
    yesBtn.className = "icon-btn";
    yesBtn.src = "/assest/iconbtn/yes_btn.png";
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
