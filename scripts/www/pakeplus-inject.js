/* ================================================================
   拼豆图纸 · PakePlus 注入增强脚本（v11）
   用法：在 PakePlus 应用的「脚本文件 / 自定义 JS」选项里，
   把本文件内容完整粘贴进去即可。随页面加载自动执行。
   功能：
   1. 高清导出（60px/格，JPEG 97%）+ 三通道保存进相册
      （系统分享「存储图像」→ 相册；长按预览图 → 相册；下载 → Download 目录被图库收录）
   2. 按住画布 0.5 秒临时查看原图对比
   3. 追加苹果液态玻璃质感与果冻动画曲线
   4. 与页面内置 __pdou API 协作；API 缺失时自动降级为 DOM 方案
================================================================ */
(function () {
  "use strict";

  /* ---------- 工具 ---------- */
  const $ = (s) => document.querySelector(s);
  const wait = (fn, t = 40) => {
    if (fn()) return;
    const iv = setInterval(() => { if (fn()) clearInterval(iv); }, t);
    setTimeout(() => clearInterval(iv), 8000);
  };
  const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

  /* ---------- 1. 追加玻璃质感与果冻曲线 ---------- */
  const css = document.createElement("style");
  css.textContent = `
    :root{ --pk-spring: cubic-bezier(.3,1.8,.4,1); }
    .sheet, header, .modal-card, .card, .hint-chip, .toast, .empty-hint span{
      backdrop-filter: blur(34px) saturate(1.8) brightness(1.05);
      -webkit-backdrop-filter: blur(34px) saturate(1.8) brightness(1.05);
    }
    .cta, .export-orb, .mb-primary, .btn, .chip, .tool, .brush, .icon-btn, .pill-sw{
      transition: transform .35s var(--pk-spring), box-shadow .3s ease, background .3s ease, border-color .3s ease !important;
    }
    .cta:active, .mb-primary:active{ transform: scale(.93) !important; }
    .export-orb:active{ transform: scale(.8) rotate(-8deg) !important; }
    .seg-thumb{ transition: transform .5s var(--pk-spring) !important; }
    .switch::after{ transition: transform .4s var(--pk-spring), left .4s var(--pk-spring) !important; }
    .pal-cell:active, .recent-cell:active{ transform: scale(.8) !important; }
    .hist-item{ transition: transform .3s var(--pk-spring), opacity .3s; }
    @keyframes pk-glow{0%,100%{box-shadow:0 6px 20px var(--accent-soft)}50%{box-shadow:0 6px 30px var(--accent-soft),0 0 0 2px var(--accent-soft)}}
    .export-orb{ animation: pk-glow 2.8s ease-in-out infinite; }
    .pk-savebar{
      position:fixed; left:0; right:0; bottom:0; z-index:1200; display:flex; gap:10px;
      padding:12px 14px calc(12px + env(safe-area-inset-bottom));
      background:var(--glass,rgba(20,12,34,.7)); backdrop-filter:blur(30px) saturate(1.8);
      border-top:1px solid var(--stroke2,rgba(255,255,255,.2));
      transform:translateY(110%); transition:transform .5s var(--pk-spring);
    }
    .pk-savebar.show{ transform:none; }
    .pk-savebar button{
      flex:1; padding:14px 0; border:none; border-radius:16px; font-size:15px; font-weight:800;
      cursor:pointer; transition:transform .3s var(--pk-spring);
    }
    .pk-savebar button:active{ transform:scale(.93); }
    .pk-save-primary{ background:linear-gradient(150deg,var(--accent-2,#b8dcff),var(--accent-deep,#5aa7f7)); color:#fff;
      box-shadow:0 8px 22px var(--accent-soft,rgba(140,190,255,.25)), inset 0 1px 0 rgba(255,255,255,.4); }
    .pk-save-plain{ background:var(--glass2,rgba(255,255,255,.8)); color:var(--text,#123); border:1px solid var(--stroke,rgba(0,0,0,.1)) !important; }
  `;
  document.head.appendChild(css);

  /* ---------- 2. 高清导出 + 保存进相册 ---------- */
  const CS = 60; /* 60px/格 高清 */
  function lum(rgb) { return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]; }
  function hex2rgb(hex) {
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  function buildHd() {
    const api = window.__pdou;
    if (!api) return null;
    const { cols, rows, data } = api.getGrid();
    const pal = api.getPalette();
    const headH = 150;
    const c = document.createElement("canvas");
    c.width = cols * CS; c.height = rows * CS + headH;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, c.width, 0);
    g.addColorStop(0, "#8b5cf6"); g.addColorStop(1, "#5aa7f7");
    x.fillStyle = g; x.fillRect(0, 0, c.width, headH);
    x.fillStyle = "#fff"; x.textAlign = "left"; x.textBaseline = "middle";
    x.font = "800 52px -apple-system,'PingFang SC',sans-serif";
    x.fillText("拼豆图纸", 40, 52);
    const total = data.filter(v => v >= 0).length;
    const kinds = new Set(data.filter(v => v >= 0)).size;
    const d = new Date(), p2 = n => String(n).padStart(2, "0");
    x.font = "600 32px -apple-system,sans-serif";
    x.fillStyle = "rgba(255,255,255,.92)";
    x.fillText(`${cols}×${rows} 格 · ${total} 颗豆 · ${kinds} 色 · ${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`, 40, 108);
    x.save(); x.translate(0, headH);
    x.fillStyle = "#fff"; x.fillRect(0, 0, cols * CS, rows * CS);
    for (let y = 0; y < rows; y++) for (let xx = 0; xx < cols; xx++) {
      const ci = data[y * cols + xx];
      if (ci < 0) continue;
      const p = pal[ci];
      x.fillStyle = p.hex; x.fillRect(xx * CS, y * CS, CS, CS);
      x.font = `800 ${CS * .38}px -apple-system,sans-serif`;
      x.textAlign = "center"; x.textBaseline = "middle";
      x.fillStyle = lum(hex2rgb(p.hex)) > 140 ? "rgba(0,0,0,.8)" : "rgba(255,255,255,.95)";
      x.fillText(p.code, xx * CS + CS / 2, y * CS + CS / 2);
    }
    x.lineWidth = 1; x.strokeStyle = "rgba(120,120,120,.35)";
    for (let i = 0; i <= cols; i++) { x.beginPath(); x.moveTo(i * CS + .5, 0); x.lineTo(i * CS + .5, rows * CS); x.stroke(); }
    for (let i = 0; i <= rows; i++) { x.beginPath(); x.moveTo(0, i * CS + .5); x.lineTo(cols * CS, i * CS + .5); x.stroke(); }
    x.restore();
    return { canvas: c, cols, rows };
  }

  function toBlob(c) {
    return new Promise(res => c.toBlob(res, "image/jpeg", 0.97));
  }

  function fallbackDownload(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    buzz(20);
    window.__pdou && window.__pdou.toast("已下载到 Download 目录，相册图库会自动收录");
  }

  async function saveHd() {
    const hd = buildHd();
    if (!hd) { window.__pdou && window.__pdou.shareOrSave(); return; }
    const blob = await toBlob(hd.canvas);
    const name = `拼豆图纸_${hd.cols}x${hd.rows}_高清.jpg`;
    const file = new File([blob], name, { type: "image/jpeg" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "拼豆图纸" });
        buzz(25);
        window.__pdou && window.__pdou.toast("在面板中选「存储图像」即保存到相册");
        return;
      } catch (e) { if (e && e.name === "AbortError") return; }
    }
    fallbackDownload(blob, name);
  }

  /* 拦截页面保存按钮，改用 60px/格 超清版本 */
  wait(() => {
    const orb = $("#btnExportOrb2") || $("#btnExportOrb");
    if (!orb) return false;
    orb.addEventListener("click", (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();
      saveHd();
    }, true);
    return true;
  });

  /* ---------- 3. 底部常驻保存条（生成后出现） ---------- */
  const bar = document.createElement("div");
  bar.className = "pk-savebar";
  bar.innerHTML = `
    <button class="pk-save-primary" id="pkSave">💾 保存高清图到相册</button>
    <button class="pk-save-plain" id="pkClose">收起</button>`;
  document.body.appendChild(bar);
  bar.querySelector("#pkSave").onclick = saveHd;
  bar.querySelector("#pkClose").onclick = () => bar.classList.remove("show");
  wait(() => {
    const conv = $("#btnConvert");
    if (!conv) return false;
    conv.addEventListener("click", () => setTimeout(() => bar.classList.add("show"), 600));
    return true;
  });

  /* ---------- 4. 按住画布查看原图对比 ---------- */
  wait(() => {
    const stage = $("#stage");
    const ref = $("#refCanvas");
    if (!stage || !ref) return false;
    let holdT = null, holding = false;
    stage.addEventListener("touchstart", () => {
      holdT = setTimeout(() => {
        holding = true;
        ref.style.opacity = 1;
        ref.style.zIndex = 5;
        buzz(10);
      }, 450);
    }, { passive: true });
    const end = () => {
      clearTimeout(holdT);
      if (holding) { holding = false; ref.style.opacity = ""; ref.style.zIndex = ""; }
    };
    stage.addEventListener("touchend", end);
    stage.addEventListener("touchcancel", end);
    stage.addEventListener("touchmove", () => clearTimeout(holdT), { passive: true });
    return true;
  });

  /* ---------- 5. Tauri 环境尝试写入 Download（可选增强） ---------- */
  async function tauriSave() {
    try {
      const { invoke } = window.__TAURI__.core || window.__TAURI__;
      const hd = buildHd(); if (!hd) return false;
      const blob = await toBlob(hd.canvas);
      const buf = await blob.arrayBuffer();
      const u8 = Array.from(new Uint8Array(buf));
      await invoke("plugin:fs|write_file", {
        path: `Download/拼豆图纸_${hd.cols}x${hd.rows}.jpg`,
        contents: u8
      });
      window.__pdou && window.__pdou.toast("已写入 Download 目录");
      return true;
    } catch (e) { return false; }
  }
  if (window.__TAURI__) {
    wait(() => {
      const b = bar.querySelector("#pkSave");
      const old = b.onclick;
      b.onclick = async () => { if (!(await tauriSave())) old(); };
      return true;
    });
  }
})();
