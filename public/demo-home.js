(function () {
  const els = {
    btnBoatie: document.getElementById("btnBoatie"),
    btnInbox: document.getElementById("btnInbox"),
    btnOperationsCentre: document.getElementById("btnOperationsCentre"),
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


  els.btnBoatie.addEventListener("click", function () {
    nav("/boatie-demo.html");
  });

  els.btnInbox.addEventListener("click", function () {
    nav("/operator-inbox.html");
  });

  els.btnOperationsCentre.addEventListener("click", function () {
    nav("/operations-centre.html");
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
        demoAdminKey = window.prompt("Enter demo admin key. This is the Render DEMO_ADMIN_KEY. It will be saved in this browser for future resets.");
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
        if (res.status === 403) {
          try { localStorage.removeItem("bmDemoAdminKey"); } catch (e) {}
          els.resetStatus.textContent =
            "Reset failed: saved demo key is missing or incorrect. Click Reset Demo again and re-enter the Render DEMO_ADMIN_KEY.";
          return;
        }

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
      try { localStorage.removeItem("bmOwnerId"); } catch (e) {}
      try { localStorage.removeItem("bmVesselId"); } catch (e) {}
      try { localStorage.removeItem("BM_OWNER_ID"); } catch (e) {}
      try { localStorage.removeItem("BM_VESSEL_ID"); } catch (e) {}
      try { localStorage.removeItem("profileOwnerId"); } catch (e) {}
      try { localStorage.removeItem("profileVesselId"); } catch (e) {}

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
      ? "Baseline refresh ready."
      : "Baseline refresh is locked.";
  });

  els.btnBaselineHelp.addEventListener("click", function () {
    alert("Refresh Baseline updates the walkthrough dataset using the current bookings.");
  });

  els.btnBaseline.addEventListener("click", function () {
    alert("Baseline refresh is intentionally locked for investor walkthrough safety.");
  });

})();
