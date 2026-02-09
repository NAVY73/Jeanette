(function () {
  const KEY_OPERATOR_MARINA = "bm_operatorMarinaId";
  const KEY_OPERATOR_EMAIL  = "bm_operatorEmail";

  const els = {
    btnBoatie: document.getElementById("btnBoatie"),
    btnInbox: document.getElementById("btnInbox"),

    operatorSelect: document.getElementById("operatorSelect"),
    btnSetOperator: document.getElementById("btnSetOperator"),
    btnOpenInboxWithOperator: document.getElementById("btnOpenInboxWithOperator"),
    operatorStatus: document.getElementById("operatorStatus"),

    bookingId: document.getElementById("bookingId"),
    btnOpenReview: document.getElementById("btnOpenReview"),

    resetConfirm: document.getElementById("resetConfirm"),
    btnReset: document.getElementById("btnReset"),
    btnResetHelp: document.getElementById("btnResetHelp"),
    resetStatus: document.getElementById("resetStatus"),

    baselineConfirm: document.getElementById("baselineConfirm"),
    btnBaseline: document.getElementById("btnBaseline"),
    btnBaselineHelp: document.getElementById("btnBaselineHelp"),
    baselineStatus: document.getElementById("baselineStatus"),
  };

  function nav(url) { window.location.href = url; }

  function setOperator(marinaId) {
    localStorage.setItem(KEY_OPERATOR_MARINA, String(marinaId));

    const email = (String(marinaId) === "3")
      ? "operator@westhaven.example"
      : "operator@gulfharbour.example";

    localStorage.setItem(KEY_OPERATOR_EMAIL, email);

    els.operatorStatus.textContent =
      `Operator set: marinaId ${marinaId} • ${email} (saved)`;
  }

  function loadOperator() {
    const current = localStorage.getItem(KEY_OPERATOR_MARINA) || "2";
    els.operatorSelect.value = current;
    setOperator(current);
  }

  // Quick Launch
  els.btnBoatie.addEventListener("click", () => nav("/boatie-demo.html"));
  els.btnInbox.addEventListener("click", () => nav("/operator-inbox.html"));

  // Operator selector
  els.btnSetOperator.addEventListener("click", () => setOperator(els.operatorSelect.value));
  els.btnOpenInboxWithOperator.addEventListener("click", () => { setOperator(els.operatorSelect.value); nav("/operator-inbox.html"); });

  // Open Review
  els.btnOpenReview.addEventListener("click", () => {
    const id = (els.bookingId.value || "").trim();
    if (!id) { alert("Enter a Booking ID first (e.g., 101)."); return; }
    nav(`/operator-review.html?bookingId=${encodeURIComponent(id)}`);
  });

  // Reset safety lock
  els.resetConfirm.addEventListener("input", () => {
    const ok = (els.resetConfirm.value || "").trim().toUpperCase() === "RESET";
    els.btnReset.disabled = !ok;
    els.resetStatus.textContent = ok ? "Reset is armed. Click Reset Demo Data." : "Reset is locked.";
  });

  els.btnResetHelp.addEventListener("click", () => {
    alert(
      "RESET restores bookings from the saved baseline.\n\n" +
      "Use it during demos to return to a clean starting state.\n\n" +
      "Endpoint: POST /api/demo/reset"
    );
  });

  els.btnReset.addEventListener("click", async () => {
    if (!confirm("Reset demo data now? This restores bookings from baseline.")) return;
    els.resetStatus.textContent = "Resetting…";

    try {
      const res = await fetch("/api/demo/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "phase12-demo-home-reset" }),
      });

      const text = await res.text();
      let data = null; try { data = JSON.parse(text); } catch (e) {}

      if (!res.ok) {
        els.resetStatus.textContent = `Reset failed (HTTP ${res.status}). ${data && data.message ? data.message : text}`;
        return;
      }

      els.resetStatus.textContent = data && data.message ? data.message : "Reset complete.";
      setTimeout(() => nav("/operator-inbox.html"), 600);
    } catch (err) {
      els.resetStatus.textContent = "Reset failed (server not reachable).";
    }
  });

  // Baseline safety lock
  els.baselineConfirm.addEventListener("input", () => {
    const ok = (els.baselineConfirm.value || "").trim().toUpperCase() === "BASELINE";
    els.btnBaseline.disabled = !ok;
    els.baselineStatus.textContent = ok ? "Baseline refresh is armed. Click Refresh Baseline." : "Baseline refresh is locked.";
  });

  els.btnBaselineHelp.addEventListener("click", () => {
    alert(
      "REFRESH BASELINE overwrites the baseline using current bookings.\n\n" +
      "Use this right before an investor demo once your dataset is PERFECT.\n" +
      "Then RESET will always return to that perfect state.\n\n" +
      "Endpoint: POST /api/demo/baseline"
    );
  });

  els.btnBaseline.addEventListener("click", async () => {
    if (!confirm("Refresh baseline now? This overwrites the baseline from current bookings.")) return;
    els.baselineStatus.textContent = "Refreshing baseline…";

    try {
      const res = await fetch("/api/demo/baseline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "phase12-demo-home-baseline" }),
      });

      const text = await res.text();
      let data = null; try { data = JSON.parse(text); } catch (e) {}

      if (!res.ok) {
        els.baselineStatus.textContent = `Baseline refresh failed (HTTP ${res.status}). ${data && data.message ? data.message : text}`;
        return;
      }

      els.baselineStatus.textContent = data && data.message ? data.message : "Baseline refreshed.";
    } catch (err) {
      els.baselineStatus.textContent = "Baseline refresh failed (server not reachable).";
    }
  });

  // Init
  loadOperator();
})();
