// Evidence objects are fetched only after an explicit download click.
(() => {
  "use strict";
  const zh = document.documentElement.lang.startsWith("zh");
  const status = document.querySelector("[data-evidence-status]");
  const buttons = document.querySelectorAll("[data-evidence-download]");
  const maxBytes = 128 * 1024 * 1024;
  const text = (en, cn) => zh ? cn : en;
  const fail = message => { throw new Error(message); };

  async function digest(bytes) {
    return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      value => value.toString(16).padStart(2, "0")).join("");
  }

  async function getBytes(relative) {
    if (typeof relative !== "string" || !/^\/?data\/evidence\/[a-zA-Z0-9_./-]+$/.test(relative) || relative.split("/").includes("..")) {
      fail("Invalid evidence path");
    }
    const response = await fetch(`/${relative.replace(/^\//, "")}`, { credentials: "same-origin", redirect: "error" });
    if (!response.ok) fail(`HTTP ${response.status}`);
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > maxBytes) fail("Evidence object is too large");
    return bytes;
  }

  async function object(ref) {
    if (!ref || !/^[a-f0-9]{64}$/.test(ref.sha256) || ref.path !== `data/evidence/objects/${ref.sha256}.json.gz`) {
      fail("Object identity mismatch");
    }
    if (!Number.isSafeInteger(ref.uncompressedBytes) || ref.uncompressedBytes < 0 || ref.uncompressedBytes > maxBytes) {
      fail("Invalid object size");
    }
    const compressed = await getBytes(ref.path);
    if (compressed.byteLength !== ref.compressedBytes) fail("Compressed size mismatch");
    const reader = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip")).getReader();
    const chunks = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > ref.uncompressedBytes) {
        await reader.cancel();
        fail("Uncompressed size mismatch");
      }
      chunks.push(value);
    }
    const raw = await new Blob(chunks).arrayBuffer();
    if (length !== ref.uncompressedBytes || await digest(raw) !== ref.sha256) fail("Object checksum mismatch");
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
  }

  function csvCell(value) {
    let result = String(value ?? "");
    // Keep signed numeric weights usable while preventing formula injection in text.
    if (typeof value === "string" && /^[=+\-@\t\r]/.test(result)) result = `'${result}`;
    return /[",\r\n]/.test(result) ? `"${result.replace(/"/g, '""')}"` : result;
  }

  async function csv(manifest, changesOnly) {
    const totals = ["grossReturn", "equity", "targetGrossExposure", "targetNetExposure", "targetCashWeight",
      "effectiveGrossExposure", "effectiveNetExposure", "effectiveCashWeight", "driftedCashWeight", "targetChange", "rebalanceTurnover"];
    const assetFields = ["targetWeight", "effectiveWeight", "assetReturn", "contribution", "driftedWeight", "targetChange", "rebalanceTurnover"];
    const lines = [["date", ...totals, ...manifest.assets.flatMap(asset => assetFields.map(key => `${asset}.${key}`))].map(csvCell).join(",")];
    let previous = "";
    for (const ref of manifest.objects.records) {
      const chunk = await object(ref);
      if (JSON.stringify(chunk.assets) !== JSON.stringify(manifest.assets)) fail("Asset coverage mismatch");
      for (const row of chunk.rows) {
        if (row.date <= previous || row.date.slice(0, 7) !== chunk.month) fail("Record date mismatch");
        previous = row.date;
        if (changesOnly && row.rebalanceTurnover === 0 && row.targetChange === 0) continue;
        const values = [...totals.map(key => row[key]), ...manifest.assets.flatMap(asset => assetFields.map(key => row.assets[asset]?.[key]))];
        if (values.some(value => typeof value !== "number" || !Number.isFinite(value))) fail("Invalid record values");
        lines.push([row.date, ...values].map(csvCell).join(","));
      }
    }
    return `${lines.join("\r\n")}\r\n`;
  }

  async function download(button) {
    const bytes = await getBytes(button.dataset.manifest);
    if (await digest(bytes) !== button.dataset.manifestSha256) fail("Manifest checksum mismatch; refresh this page");
    const manifest = JSON.parse(new TextDecoder().decode(bytes));
    if (manifest.schemaVersion !== 2) fail("Unsupported manifest version");
    const kind = button.dataset.evidenceDownload;
    let content, extension, mime;
    if (kind === "source") {
      const sources = await object(manifest.objects.source);
      const source = await object(sources.files[sources.strategyPath]);
      if (typeof source.text !== "string") fail("Invalid strategy source");
      if (await digest(new TextEncoder().encode(source.text)) !== sources.fileHashes[sources.strategyPath]) {
        fail("Strategy source checksum mismatch");
      }
      content = source.text;
      extension = "py";
      mime = "text/plain;charset=utf-8";
    } else if (kind === "config") {
      content = `${JSON.stringify(await object(manifest.objects.config), null, 2)}\n`;
      extension = "json";
      mime = "application/json;charset=utf-8";
    } else {
      if (!["daily", "trades"].includes(kind)) fail("Unknown download");
      content = await csv(manifest, kind === "trades");
      extension = "csv";
      mime = "text/csv;charset=utf-8";
    }
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${manifest.strategyId}-${manifest.symbol}-${kind}.${extension}`.replace(/[^a-zA-Z0-9._-]/g, "_");
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  if (!buttons.length) return;
  if (typeof DecompressionStream === "undefined" || !globalThis.crypto?.subtle) {
    buttons.forEach(button => { button.disabled = true; });
    status.textContent = text("This browser cannot verify compressed downloads. Use the Python bundle downloader below.",
      "此浏览器不支持压缩文件校验，请使用下方 Python 工具下载完整复核包。");
    return;
  }
  buttons.forEach(button => button.addEventListener("click", async () => {
    buttons.forEach(item => { item.disabled = true; });
    status.textContent = text("Downloading and verifying…", "正在下载并校验…");
    try {
      await download(button);
      status.textContent = text("Verified download ready.", "校验通过，下载已就绪。");
      document.dispatchEvent(new CustomEvent("qa:download-ready", { detail: { anchor: button } }));
    } catch (error) {
      status.textContent = `${text("Download unavailable. No file was saved.", "下载不可用，未保存任何文件。")} ${error.message}`;
    } finally {
      buttons.forEach(item => { item.disabled = false; });
    }
  }));
})();
