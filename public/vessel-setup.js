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

  function apiBase() {
    const v = ($("apiBase").value || "").trim();
    if (v) return v.replace(/\/$/, "");
    return "http://127.0.0.1:3000";
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
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) ? (data.error || data.message) : text;
      throw new Error(msg || ("HTTP " + res.status));
    }
    return data;
  }

  function numOrNull(v) {
    const s = String(v || "").trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isNaN(n) ? null : n;
  }

  function init() {
    const ownerId = Number(localStorage.getItem(LS_OWNER_ID) || "");
    $("ownerIdLabel").textContent = ownerId ? String(ownerId) : "NOT SET";

    const savedBase = localStorage.getItem(LS_API_BASE) || "";
    if (savedBase) $("apiBase").value = savedBase;

    if (!ownerId) {
      showMsg("Owner ID not found. Please go back and complete Boatie Registration first.", true);
      $("saveBtn").disabled = true;
      return;
    }

    $("saveBtn").addEventListener("click", async () => {
      try {
        const base = apiBase();
        localStorage.setItem(LS_API_BASE, base);

        const name = ($("name").value || "").trim();
        const type = ($("type").value || "").trim();
        const registration = ($("registration").value || "").trim();
        const lengthM = numOrNull($("lengthM").value);
        const beamM = numOrNull($("beamM").value);
        const draftM = numOrNull($("draftM").value);

        if (!name) {
          showMsg("Please enter a vessel name.", true);
          return;
        }
        if (lengthM === null) {
          showMsg("Please enter vessel length (m).", true);
          return;
        }

        $("saveBtn").disabled = true;
        $("saveBtn").textContent = "Saving…";

        const hasShorePower = !!(document.getElementById("hasShorePower") && document.getElementById("hasShorePower").checked);

        const data = await postJson(base + "/api/vessels", {
          ownerId,
          name,
          type,
          registration,
          lengthM,
          beamM,
          draftM,
          hasShorePower
        });

        const vesselId = data && data.vessel && data.vessel.id;
        if (!vesselId) throw new Error("Vessel created but no vesselId returned.");

        localStorage.setItem(LS_VESSEL_ID, String(vesselId));

        showMsg("Saved. Vessel ID = " + vesselId + ". Continue to Profile to manage compliance evidence.", false);

        setTimeout(() => {
          window.location.href = "profile.html";
        }, 500);
      } catch (err) {
        showMsg("Save failed: " + (err && err.message ? err.message : err), true);
      } finally {
        $("saveBtn").disabled = false;
        $("saveBtn").textContent = "Save Vessel & Continue";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
