// Phase 11 recovery: fallback helpers if missing
function setSubmitMsg(msg){
  try {
    const el = document.getElementById("submitMsg");
    if (el) el.textContent = String(msg || "");
    else console.log("submitMsg:", msg);
  } catch (e) {}
}

// Phase 11 recovery: fallback if handoff helper is missing
function setHandoffVisible(visible){
  try {
    const el = document.getElementById("handoff");
    if (el) el.style.display = visible ? "block" : "none";
  } catch (e) {}
}

(() => {
    const $ = (id) => document.getElementById(id);
  
    function apiBase() {
      const raw = ($("apiBase").value || "").trim();
      return raw ? raw.replace(/\/$/, "") : "";
    }
  
    function buildUrl(path, params = {}) {
      const base = apiBase();
      const url = (base ? base : "") + path;
  
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        qs.set(k, String(v));
      });
  
      const q = qs.toString();
      return q ? `${url}?${q}` : url;
    }
  
    async function apiGet(path, params) {
      const url = params ? buildUrl(path, params) : ((apiBase() ? apiBase() : "") + path);
      const res = await fetch(url);
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!res.ok) throw Object.assign(new Error("GET failed"), { status: res.status, data, url });
      return data;
    }
  
    async function apiPost(path, body) {
      const url = (apiBase() ? apiBase() : "") + path;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!res.ok) throw Object.assign(new Error("POST failed"), { status: res.status, data, url });
      return data;
    }
  
    // Demo identity (fixed for Phase 7 demo)
    const DEMO = { ownerId: 1, vesselId: 1 };
  
    let pollTimer = null;
    let marinasCache = [];
  
    function setStatus(text, cls = "") {
      const el = $("statusLine");
      el.className = "status " + cls;
      el.textContent = text;
    }
  
    function setDecisionText(text) {
      $("decisionLine").textContent = text || "";
    }
  
    function showMsg(msg) {
      $("submitMsg").textContent = msg || "";
    }
  
    function debug(obj) {
      $("debugBlock").style.display = "block";
      $("debugPre").textContent = JSON.stringify(obj, null, 2);
    }
  
    function showEmailPreview({ to, subject, body }) {
      const card = $("emailCard");
      if (!card) return;
      $("emailTo").textContent = to || "";
      $("emailSubject").textContent = subject || "";
      $("emailBody").textContent = body || "";
      card.style.display = "block";
    }
  
    function hideEmailPreview() {
      const card = $("emailCard");
      if (!card) return;
      card.style.display = "none";
    }
  
    function stopPolling() {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
    }
  
    function getMarinaName(marinaId) {
      const m = (marinasCache || []).find(x => String(x.id) === String(marinaId));
      return (m && (m.name || m.title)) ? (m.name || m.title) : `Marina ${marinaId}`;
    }
  
    function updateTermsLink() {
      const marinaId = $("marinaId").value;
      const link = $("termsLink");
      if (link) link.href = `terms.html?marinaId=${encodeURIComponent(marinaId || "")}`;
  
      const hint = $("tcHint");
      if (hint) {
        hint.textContent = marinaId
          ? `You are acknowledging the terms for: ${getMarinaName(marinaId)}`
          : "";
      }
    }
  
    function isTermsAccepted() {
      const cb = $("tcAccept");
      return cb ? cb.checked : false;
    }
  
    function buildTermsLink(marinaId) {
      return `terms.html?marinaId=${encodeURIComponent(marinaId)}`;
    }
  
    function buildSimulatedEmail({ booking, marinaName }) {
      const to = "demo.boatie@example.com";
      const decision = (booking.status || "").toUpperCase();
      const subject = `BoatiesMate: Booking ${decision} — ${marinaName} (${booking.startDate} to ${booking.endDate})`;
      const termsUrl = buildTermsLink(booking.marinaId);
  
      const lines = [];
      lines.push(`Kia ora,`);
      lines.push(``);
      lines.push(`Your booking request has been ${booking.status}.`);
      lines.push(``);
      lines.push(`Booking details`);
      lines.push(`- Booking ID: ${booking.id}`);
      lines.push(`- Marina: ${marinaName} (ID ${booking.marinaId})`);
      lines.push(`- Mooring/Berth ID: ${booking.mooringId}`);
      lines.push(`- Dates: ${booking.startDate} to ${booking.endDate}`);
      lines.push(``);
      lines.push(`Marina Terms & Conditions`);
      lines.push(`Please ensure you have reviewed the marina’s terms prior to arrival:`);
      lines.push(`${termsUrl}`);
      lines.push(``);
  
      if (booking.status === "declined") {
        lines.push(`If you would like to rebook, please select alternate dates or another marina.`);
        lines.push(``);
      } else {
        lines.push(`Next steps`);
        lines.push(`- Arrive within your approved booking dates.`);
        lines.push(`- Keep compliance documents current and available.`);
        lines.push(``);
      }
  
      lines.push(`Regards,`);
      lines.push(`BoatiesMate (Demo)`);
  
      return { to, subject, body: lines.join("\n") };
    }
  
    function startPolling(bookingId) {
      stopPolling();
  
      pollTimer = setInterval(async () => {
        try {
          const data = await apiGet(`/api/bookings/${encodeURIComponent(bookingId)}`);
          const b = data.booking || data;
          if (!b || !b.status) return;
  
          if (b.status === "pending") {
            setStatus(`Pending (Booking ${bookingId})`, "warn");
            // keep decisionLine as-is (it contains useful operator-scope note)
            return;
          }
  
          const marinaName = getMarinaName(b.marinaId);
  
          if (b.status === "approved") {
            setStatus(`APPROVED (Booking ${bookingId})`, "good");
            setDecisionText(`Approved. Terms acceptance is recorded. (Operator must be scoped to marinaId ${b.marinaId}.)`);
            showEmailPreview(buildSimulatedEmail({ booking: b, marinaName }));
            stopPolling();
            return;
          }
  
          if (b.status === "declined") {
            setStatus(`DECLINED (Booking ${bookingId})`, "bad");
            setDecisionText(`Declined. (Operator must be scoped to marinaId ${b.marinaId}.)`);
            showEmailPreview(buildSimulatedEmail({ booking: b, marinaName }));
            stopPolling();
            return;
          }
  
          setStatus(`${b.status} (Booking ${bookingId})`);
        } catch {
          // ignore transient errors during polling
        }
      }, 2500);
    }
  
    function extractMooringIdFromAvailability(resp) {
      const list =
        resp.moorings ||
        resp.available ||
        resp.results ||
        resp.items ||
        (Array.isArray(resp) ? resp : null);
  
      if (!Array.isArray(list) || list.length === 0) return null;
  
      const first = list[0];
      if (!first) return null;
  
      return first.mooringId ?? first.id ?? (first.mooring && first.mooring.id) ?? null;
    }
  
    async function findSuitableMooringId({ marinaId, vesselId, startDate, endDate }) {
      const resp = await apiGet("/api/availability", { marinaId, vesselId, startDate, endDate });
      const mooringId = extractMooringIdFromAvailability(resp);
      if (mooringId) return mooringId;
  
      const marinaName = (resp.marina && resp.marina.name) ? resp.marina.name : getMarinaName(marinaId);
  
      let msg = `No available moorings for ${marinaName} for these dates. Try different dates or choose another marina.`;
  
      if (resp.diagnostics) {
        const d = resp.diagnostics;
        if (d.mooringsInMarina === 0) {
          msg = `${marinaName} has no moorings configured in demo data. Choose another marina (or add demo moorings).`;
        } else if (d.suitableIgnoringAvailabilityCount === 0) {
          msg = `No moorings at ${marinaName} are suitable for this vessel. Try a different marina (or adjust demo mooring limits).`;
        } else if (d.suitableIgnoringAvailabilityCount > 0 && (!resp.results || resp.results.length === 0)) {
          msg = `Moorings exist at ${marinaName}, but none are available for these dates (likely a booking conflict). Try different dates.`;
        }
      }
  
      debug({
        error: "Availability returned no selectable mooring",
        marinaId, vesselId, startDate, endDate,
        availabilityResponse: resp
      });
  
      throw new Error(msg);
    }
  
    async function loadMarinas() {
      const data = await apiGet("/api/marinas");
      const list = data.marinas || data || [];
      marinasCache = list;
  
      const sel = $("marinaId");
      sel.innerHTML = "";
      list.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = `${m.name || "Marina"} (ID ${m.id})`;
        sel.appendChild(opt);
      });
    }
  
    async function submitBooking() {
      showMsg("");
        showMsg("Submit clicked…");
      $("submitBtn").disabled = true;
      $("debugBlock").style.display = "none";
      hideEmailPreview();
  
      try {
        const marinaId = Number($("marinaId").value);
        const startDate = $("startDate").value;
        const endDate = $("endDate").value;
  
        if (!marinaId || !startDate || !endDate) {
          showMsg("Please select a marina and both dates.");
          return;
        }
  
        if (!isTermsAccepted()) {
          showMsg("Please review and accept the marina Terms & Conditions before submitting.");
          return;
        }
  
        const marinaName = getMarinaName(marinaId);
        const tcAcceptedAt = new Date().toISOString();
  
        setStatus("Checking availability…", "warn");
        setDecisionText("");
  
        const mooringId = await findSuitableMooringId({
          marinaId,
          vesselId: DEMO.vesselId,
          startDate,
          endDate,
        });
  
        setStatus("Submitting booking…", "warn");
  
        const notesLines = [
          "Demo booking (Phase 7)",
          "T&C accepted: yes",
          `T&C marina: ${marinaName} (ID ${marinaId})`,
          `T&C acceptedAt: ${tcAcceptedAt}`,
        ];
  
        const payload = {
          ownerId: DEMO.ownerId,
          vesselId: DEMO.vesselId,
          marinaId,
          mooringId,
          startDate,
          endDate,
          status: "pending",
          notes: notesLines.join(" | "),
        };
  
        const resp = await apiPost("/api/bookings", payload);

        // Phase 11: demo handoff — reveal operator CTA after successful submit
        setSubmitMsg("Booking request submitted. Next: open the Operator Inbox to review and approve/decline.");
        setHandoffVisible(true);
        try { document.getElementById("handoffCta")?.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
        const booking = resp.booking || resp;
        const bookingId = booking.id;
  
        if (!bookingId) {
          debug(resp);
          throw new Error("Booking created but could not read booking id from response.");
        }
  
        showMsg(`Submitted. Booking ID: ${bookingId} (Auto-selected Mooring ID: ${mooringId}). T&C acceptance recorded.`);
        setStatus(`Pending (Booking ${bookingId})`, "warn");
        setDecisionText(`Note: This booking is for ${marinaName}. It will only appear for an operator scoped to marinaId ${marinaId}.`);
        startPolling(bookingId);
  
      } catch (e) {
          setHandoffVisible(false);
        showMsg((e && e.message ? e.message : "Submit failed.") + (e && e.status ? " (HTTP " + e.status + ")" : "") + (e && e.url ? " — " + e.url : ""));
        debug({
          error: e.message,
          status: e.status,
          data: e.data,
          url: e.url
        });
        setStatus("Not submitted");
        setDecisionText("");
      } finally {
        $("submitBtn").disabled = false;
      }
    }
  
    async function init() {
        const hb = document.getElementById("jsHeartbeat");
        if (hb) hb.textContent = "boatie-demo.js loaded and init() running.";
      $("identityText").textContent = `Demo boatie (Owner ID ${DEMO.ownerId}) • Demo vessel (Vessel ID ${DEMO.vesselId})`;
  
      try {
        await loadMarinas();
        updateTermsLink();
      } catch (e) {
        showMsg("Could not load marinas. Check /api/marinas endpoint.");
        debug({ error: e.message, status: e.status, data: e.data, url: e.url });
      }
  
      $("marinaId").addEventListener("change", () => {
        updateTermsLink();
        // require re-accept if marina changes
        $("tcAccept").checked = false;
      });
  
      setHandoffVisible(false);
      $("submitBtn").addEventListener("click", submitBooking);
        showMsg("Submit handler attached.");
    }
  
    init();
  })();
  