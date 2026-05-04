(function () {
  const KEY_OPERATOR_MARINA = "bm_operatorMarinaId";
  const KEY_OPERATOR_EMAIL = "bm_operatorEmail";

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

  function nav(url) {
    window.location.href = url;
  }

  function setOperator(marinaId) {
    localStorage.setItem(KEY_OPERATOR_MARINA, String(marinaId));

    const email = String(marinaId) === "3"
      ? "operator@westhaven.example"
      : "operator@gulfharbour.example";

    localStorage.setItem(KEY_OPERATOR_EMAIL, email);
    els.operatorStatus.textContent =
      "Operator set: marinaId " + marinaId + " - " + email + " (saved)";
  }

  function loadOperator() {
    const current = localStorage.getItem(KEY_OPERATOR_MARINA) || "2";
    els.operatorSelect.value = current;
    setOperator(current);
  }

  els.btnBoatie.addEventListener("click", function () {
    nav("/boatie-demo.html");
  });

  els.btnInbox.addEventListener("click", function () {
    nav("/operator-inbox.html");
  });

  els.btnSetOperator.addEventListener("click", function () {
    setOperator(els.operatorSelect.value);
  });

  els.btnOpenInboxWithOperator.addEventListener("click", function () {
    setOperator(els.operatorSelect.value);
    nav("/operator-inbox.html");
  });

  els.btnOpenReview.addEventListener("click", function () {
    const id = (els.bookingId.value || "").trim();
    if (!id) {
      alert("Enter a Booking ID first, for example 101.");
      return;
    }
    nav("/operator-review.html?bookingId=" + encodeURIComponent(id));
  });

  els.resetConfirm.addEventListener("input", function () {
    const ok = (els.resetConfirm.value || "").trim().toUpperCase() === "RESET";
    els.btnReset.disabled = !ok;
    els.resetStatus.textContent = ok
      ? "Reset is armed. Click Reset Demo Data."
      : "Reset is locked.";
  });

  els.btnResetHelp.addEventListener("click", function () {
    alert("RESET restores bookings from the saved baseline.");
  });

  els.btnReset.addEventListener("click", async function () {
    if (!confirm("Reset demo data now? This restores bookings from baseline.")) return;
    els.resetStatus.textContent = "Resetting...";

    try {
      let demoAdminKey = "";
      try { demoAdminKey = localStorage.getItem("bmDemoAdminKey") || ""; } catch (e) {}

      if (!demoAdminKey) {
        demoAdminKey = window.prompt("Enter demo admin key");
        if (!demoAdminKey) {
          els.resetStatus.textContent = "Reset cancelled.";
          return;
        }
        try { localStorage.setItem("bmDemoAdminKey", demoAdminKey); } catch (e) {}
      }

      const res = await fetch("/api/demo/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Demo-Admin-Key": demoAdminKey
        },
        body: JSON.stringify({ reason: "presenter-console-reset" }),
      });

      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch (e) {}

      if (!res.ok) {
        els.resetStatus.textContent =
          "Reset failed (HTTP " + res.status + "). " +
          (data && data.message ? data.message : text);
        return;
      }

      els.resetStatus.textContent = data && data.message ? data.message : "Reset complete.";

      try { sessionStorage.removeItem("bmSubmitInFlight"); } catch (e) {}
      try { sessionStorage.removeItem("bmSubmittedBookingId"); } catch (e) {}
      try { sessionStorage.removeItem("bmBoatieDraft"); } catch (e) {}
      try { localStorage.removeItem("bmDemoLastSubmittedBookingId"); } catch (e) {}
      try { localStorage.removeItem("bmDemoIdentity"); } catch (e) {}
      try { localStorage.removeItem("bmStableIdentity"); } catch (e) {}

      setTimeout(function () {
        nav("/operator-inbox.html");
      }, 600);
    } catch (err) {
      els.resetStatus.textContent = "Reset failed.";
    }
  });

  els.baselineConfirm.addEventListener("input", function () {
    const ok = (els.baselineConfirm.value || "").trim().toUpperCase() === "BASELINE";
    els.btnBaseline.disabled = !ok;
    els.baselineStatus.textContent = ok
      ? "Baseline refresh is armed. Click Refresh Baseline."
      : "Baseline refresh is locked.";
  });

  els.btnBaselineHelp.addEventListener("click", function () {
    alert("Refresh Baseline overwrites the baseline using current bookings.");
  });

  els.btnBaseline.addEventListener("click", function () {
    alert("Baseline refresh is intentionally locked for investor walkthrough safety.");
  });

  loadOperator();
})();
