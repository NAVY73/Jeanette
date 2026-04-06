(function () {
  const LS_API_BASE = "BM_API_BASE";
  const LS_OWNER_ID = "BM_OWNER_ID";
  const LS_VESSEL_ID = "BM_VESSEL_ID";

  function $(id) { return document.getElementById(id); }

  function showMsg(text, isError) {
    const el = $("msg");
    el.style.display = "block";
    el.textContent = text;
    el.className = "notice " + (isError ? "notice-error" : "notice-ok");
  }

  function showElig(text, ok) {
    const el = $("eligBox");
    el.style.display = "block";
    el.textContent = text;
    el.className = "notice " + (ok ? "notice-ok" : "notice-error");

    const proceed = $("proceedBtn");
    proceed.style.pointerEvents = ok ? "auto" : "none";
    proceed.style.opacity = ok ? "1" : "0.6";
  }

  function apiBase() {
    const v = ($("apiBase").value || "").trim();
    if (v) return v.replace(/\/$/, "");
    return "http://127.0.0.1:3000";
  }

  async function getJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch (e) {}
    if (!res.ok) throw new Error((data && (data.error || data.message)) || text || ("HTTP " + res.status));
    return data;
  }

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch (e) {}
    if (!res.ok) throw new Error((data && (data.error || data.message)) || text || ("HTTP " + res.status));
    return data;
  }

  function ymdTodayUtc() {
    const d = new Date();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function addMonthsYmd(ymd, monthsToAdd) {
    const [y, m, d] = ymd.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCMonth(dt.getUTCMonth() + monthsToAdd);
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }

  function fileNameFromInput(inputId) {
    const el = $(inputId);
    const f = el && el.files && el.files[0];
    return f ? f.name : "";
  }

  function renderDocsForVessel(allDocs, vesselId) {
    const docs = (allDocs || []).filter(d => Number(d && d.vesselId) === Number(vesselId));
    const empty = $("docsEmpty");
    const wrap = $("docsTableWrap");
    const tbody = $("docsTbody");

    tbody.innerHTML = "";

    if (!docs.length) {
      empty.style.display = "block";
      wrap.style.display = "none";
      return;
    }

    empty.style.display = "none";
    wrap.style.display = "block";

    docs
      .slice()
      .sort((a, b) => Number(b.id) - Number(a.id))
      .forEach(d => {
        const file = (d.file && (d.file.fileName || d.file.name)) ? (d.file.fileName || d.file.name) : "";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${d.id ?? ""}</td>
          <td>${d.type ?? ""}</td>
          <td>${d.issueDate ?? ""}</td>
          <td>${d.expiryDate ?? ""}</td>
          <td>${file}</td>
          <td>${(d.issuer || "")}</td>
          <td>${(d.policyNumber || "")}</td>
          <td>${(d.coverageAmountNZD ?? "")}</td>
        `;
        tbody.appendChild(tr);
      });
  }

  async function refreshDocs() {
    const base = apiBase();
    return await getJson(base + "/api/vessel-documents");
  }

  async function checkEligibility(marinaId, vesselId) {
    const base = apiBase();
    const url = base + "/api/compliance/check?marinaId=" + encodeURIComponent(String(marinaId)) +
      "&vesselId=" + encodeURIComponent(String(vesselId));
    return await getJson(url);
  }

  async function uploadDoc(type, vesselId, fileInputId) {
    const issueDate = ($("issueDate").value || "").trim();
    const expiryDate = ($("expiryDate").value || "").trim();
    if (!issueDate || !expiryDate) throw new Error("Please set both Issue date and Expiry date first.");

    const fname = fileNameFromInput(fileInputId);
    if (!fname) throw new Error("Please choose a file first (proof upload).");

    const payload = {
      vesselId: Number(vesselId),
      type,
      issueDate,
      expiryDate,
      file: { fileName: fname }
    };

    if (type === "INSURANCE") {
      payload.issuer = "Demo Insurer";
      payload.policyNumber = "POL-" + String(vesselId).padStart(3, "0");
      payload.coverageAmountNZD = 5000000;
    } else if (type === "EWoF") {
      payload.issuer = "Demo Inspector";
    } else if (type === "BIOFOULING_INSPECTION") {
      payload.issuer = "Biosecurity Inspector";
    } else if (type === "REGISTRATION") {
      payload.issuer = "Maritime NZ";
    }

    const base = apiBase();
    return await postJson(base + "/api/vessel-documents", payload);
  }

  function init() {
    const ownerId = Number(localStorage.getItem(LS_OWNER_ID) || "");
    const vesselId = Number(localStorage.getItem(LS_VESSEL_ID) || "");

    $("ownerIdLabel").textContent = ownerId ? String(ownerId) : "NOT SET";
    $("vesselIdLabel").textContent = vesselId ? String(vesselId) : "NOT SET";

    const savedBase = localStorage.getItem(LS_API_BASE) || "";
    if (savedBase) $("apiBase").value = savedBase;

    const today = ymdTodayUtc();
    $("issueDate").value = today;
    $("expiryDate").value = addMonthsYmd(today, 12);

    $("fillDatesBtn").addEventListener("click", () => {
      const t = ymdTodayUtc();
      $("issueDate").value = t;
      $("expiryDate").value = addMonthsYmd(t, 12);
      showMsg("Dates filled: today + 12 months.", false);
    });

    if (!vesselId) {
      showMsg("Vessel ID not found. Please go back and complete Vessel Setup first.", true);
      return;
    }

    async function fullRefreshAndAutoCheck() {
      const allDocs = await refreshDocs();
      renderDocsForVessel(allDocs, vesselId);

      const marinaId = Number(($("marinaId").value || "").trim());
      if (!marinaId) return;

      const r = await checkEligibility(marinaId, vesselId);
      const ok = !!r.eligibleToBook;
      try {
        const _elig = (typeof data !== "undefined" && data) ? (data.eligibleToBook ?? (data.result && data.result.eligibleToBook)) : undefined;
        if (typeof _elig === "boolean") phase15SetProceedVisible(_elig);
      } catch (e) {}

      if (ok) {
        showElig("Eligibility: GREEN — Eligible to book (marinaId=" + r.marinaId + ")", true);
      } else {
        const blockers = (r.blockingIssues || []).map(x => x.message || x.code).join(" | ");
        showElig("Eligibility: NOT READY — " + (blockers || "Blocking issues present"), false);
      }
    }

    async function doUpload(btnId, type, fileInputId) {
      const btn = $(btnId);
      try {
        btn.disabled = true;
        const created = await uploadDoc(type, vesselId, fileInputId);
        showMsg(`Uploaded ${type} proof (doc id ${created && created.id}).`, false);
        await fullRefreshAndAutoCheck();
      } catch (e) {
        showMsg("Upload failed: " + (e && e.message ? e.message : e), true);
      } finally {
        btn.disabled = false;
      }
    }

    $("uploadInsuranceBtn").addEventListener("click", () => doUpload("uploadInsuranceBtn", "INSURANCE", "fileInsurance"));
    $("uploadEwofBtn").addEventListener("click", () => doUpload("uploadEwofBtn", "EWoF", "fileEwof"));
    $("uploadBioBtn").addEventListener("click", () => doUpload("uploadBioBtn", "BIOFOULING_INSPECTION", "fileBio"));
    $("uploadShoreBtn").addEventListener("click", () => doUpload("uploadShoreBtn", "SHORE_POWER_LEAD_TEST", "fileShore"));
    $("uploadRegBtn").addEventListener("click", () => doUpload("uploadRegBtn", "REGISTRATION", "fileReg"));

    $("checkBtn").addEventListener("click", async () => {
      try {
        $("checkBtn").disabled = true;
        await fullRefreshAndAutoCheck();
      } catch (e) {
        showMsg("Eligibility check failed: " + (e && e.message ? e.message : e), true);
      } finally {
        $("checkBtn").disabled = false;
      }
    });

    // Initial load + auto-check
    fullRefreshAndAutoCheck().catch(err => showMsg("Failed to load/check: " + err.message, true));
  }

  document.addEventListener("DOMContentLoaded", init);
})();
