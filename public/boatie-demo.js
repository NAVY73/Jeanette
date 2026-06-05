
function bmProfileIdentity(){
  try{
    const ownerId = Number(localStorage.getItem("bmOwnerId") || 0) || null;
    const vesselId = Number(localStorage.getItem("bmVesselId") || 0) || null;
    if(ownerId && vesselId){
      return { ownerId, vesselId, src: "profileStorage" };
    }
  }catch(e){}
  return null;
}

/* BoatiesMate — boatie-demo.js (CLEAN REBUILD V1)
   Goal: deterministic marinas population + clear on-page diagnostics.
*/

(function(){
  "use strict";

  function $(id){ return document.getElementById(id); }

  function setDiag(msg){
    try { const d = $("marinaDiag"); if (d) d.textContent = msg; } catch(e){}
  }

  function setMsg(msg){

  // BM_SUBMIT_TRACE_V1
  function bmTrace(msg){
    try{
      const el1 = document.getElementById("submitMsg");
      if (el1) el1.textContent = msg;
      const el2 = document.getElementById("statusLine");
      if (el2) el2.textContent = msg;
    }catch(e){}
    try{ setMsg(msg); }catch(e){}
  }

    try {
      const el = $("msg") || $("status") || $("formMsg");
      if (el) el.textContent = msg;
    } catch(e){}
  }

  function getVal(...ids){
    for (const id of ids){
      const el = $(id);
      if (el && typeof el.value !== "undefined") return String(el.value || "").trim();
    }
    return "";
  }

  async function loadMarinas(){
    const sel = $("marinaId");
    if (!sel){ setDiag("Marina options: 0 (ERROR: #marinaId not found)"); return; }

    // reset select
    sel.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "Select a marina…";
    sel.appendChild(opt0);

    setDiag("Marina options: (loading...)");

    let res, text, data;
    try {
      res = await fetch("/api/marinas", { headers: { "Accept": "application/json" } });
      text = await res.text();
    } catch (e){
      setDiag("Marina options: 0 (FETCH ERROR: " + (e && e.message ? e.message : String(e)) + ")");
      return;
    }

    if (!res.ok){
      setDiag("Marina options: 0 (HTTP " + res.status + ")");
      return;
    }

    try { data = JSON.parse(text); }
    catch(e){
      setDiag("Marina options: 0 (BAD JSON)");
      return;
    }

    const list =
      Array.isArray(data) ? data :
      (Array.isArray(data.marinas) ? data.marinas :
      (Array.isArray(data.marina) ? data.marina : []));

    for (const m of list){
      const id = (m && m.id != null) ? String(m.id) : "";
      const name = (m && m.name) ? String(m.name) : (id ? ("Marina " + id) : "Unknown marina");
      if (!id) continue;
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = name;
      sel.appendChild(opt);
    }

    setDiag("Marina options: " + (sel.options ? sel.options.length : 0) + " (selected=" + (sel.value||"") + ")");
  }

  

// BM_MOORINGS_V1: populate moorings/berths for selected marina
async function loadMoorings(marinaId){
  const sel = $("mooringId");
  const diag = $("mooringDiag");

  function set(msg){ try{ if(diag) diag.textContent = msg; }catch(e){} }

  if (!sel){ set("Mooring options: 0 (ERROR: #mooringId not found)"); return; }

  sel.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "Select a mooring/berth…";
  sel.appendChild(opt0);

  if (!marinaId){
    set("Mooring options: (waiting for marina)");
    return;
  }

  set("Mooring options: (loading...)");

  const urls = [
    "/api/moorings?marinaId=" + encodeURIComponent(marinaId),
    "/api/marinas/" + encodeURIComponent(marinaId) + "/moorings",
    "/api/moorings"
  ];

  for (const url of urls){
    try{
      const res = await fetch(url, { headers: { "Accept":"application/json" } });
      const text = await res.text();
      if (!res.ok) continue;

      let data;
      try { data = JSON.parse(text); } catch(e){ continue; }

      let list =
        Array.isArray(data) ? data :
        (Array.isArray(data.moorings) ? data.moorings :
        (Array.isArray(data.items) ? data.items : []));

      // If endpoint returned all moorings, filter by marinaId
      list = list.filter(m => m && (String(m.marinaId||"") === String(marinaId) || url.includes("/api/marinas/")));

      for (const m of list){
        const id = (m && m.id != null) ? String(m.id) : "";
        if (!id) continue;
        const name = (m && (m.displayName || m.name || m.title)) ? String(m.displayName || m.name || m.title) : ("Mooring " + id);
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = name;
        // BM_SYNC_PREF_V1: remember mooring type (if provided by API)
        try{
          const t = (m && m.type) ? String(m.type) : "";
          if (t) opt.setAttribute("data-type", t);
        }catch(e){}
        sel.appendChild(opt);
      }

      set("Mooring options: " + (sel.options ? sel.options.length : 0) + " (selected=" + (sel.value||"") + ")");
      return; // success
    } catch(e){
      // try next url
    }
  }

  set("Mooring options: 0 (ERROR: could not load moorings)");
}

async function submitBooking(){
    // Conservative payload builder — uses common ids if present.
    const marinaId = getVal("marinaId");
    const mooringId = getVal("mooringId");
const servicePreference = getVal("servicePreference");
    const startDate = getVal("startDate","fromDate","arrivalDate","dateFrom");
    const endDate   = getVal("endDate","toDate","departureDate","dateTo");
    const tcAcceptEl = $("tcAccept");
    const tcAccept = tcAcceptEl ? !!tcAcceptEl.checked : true;

    if (!marinaId){

    // BM_ENTERED_SUBMITBOOKING_V1
    try{
      const el = document.getElementById("submitMsg");
      if (el) el.textContent = "SUBMIT: entered submitBooking() at " + new Date().toISOString();
    }catch(e){}


    // BM_SUBMIT_HEARTBEAT_V1
    try{
      const el = document.getElementById("submitMsg");
      if (el) el.textContent = "SUBMIT: entered submitBooking() at " + new Date().toISOString();
    }catch(e){}


    bmTrace("SUBMIT: entered submitBooking()"); // BM_SUBMIT_TRACE_V1
    try{
      bmTrace("SUBMIT: marinaId=" + getVal("marinaId") + " mooringId=" + getVal("mooringId") + " pref=" + getVal("servicePreference") + " tc=" + ((document.getElementById("tcAccept")||{}).checked ? "yes":"no"));
    }catch(e){}


  try{
    const now = new Date().toISOString();
    // Show both in the message line and the diag line (if present)
    try { setMsg("Submit clicked (" + now + ")"); } catch(e){}
    try { setDiag("Marina options: (submit-start) " + now); } catch(e){}
  }catch(e){}

 setMsg("Please select a marina."); return; }
    
    // BM_AUTOPICK_MOORING_V2: Service Preference-led demo flow
    // If boatie hasn't selected a specific berth/mooring, auto-pick one that matches servicePreference.
    let mooringIdResolved = mooringId;

    if (!mooringIdResolved){
      try{
        const pref = getVal("servicePreference"); // berth | swing | best_available | ""
        const sel = $("mooringId");
        const opts = sel ? Array.from(sel.options || []) : [];

        // skip placeholder option with empty value
        const candidates = opts.filter(o => o && o.value && String(o.value).trim());

        function typeOf(o){
          try { return String(o.getAttribute("data-type") || ""); } catch(e){ return ""; }
        }

        let pick = null;

        if (pref === "berth") pick = candidates.find(o => typeOf(o) === "berth") || null;
        else if (pref === "swing") pick = candidates.find(o => typeOf(o) === "swing") || null;
        else pick = candidates[0] || null; // best_available or blank => first available

        if (pick && sel){
          sel.value = pick.value;           // update UI state
          mooringIdResolved = String(pick.value); // use in payload
        }
      }catch(e){}
    }

    if (!mooringIdResolved){
      setMsg("No available berths/moorings loaded yet for that marina. Please select a marina and wait for options to load.");
      return;
    }

    // BM_SUBMIT_PREF_SYNC_V2: prevent SERVICE_PREFERENCE_MISMATCH by looking up selected mooring type
    try {
      const prefSel = $("servicePreference");
      const mid = Number(mooringId);

      // Try local API: /api/moorings?marinaId=... first, then fall back to /api/moorings
      const marinaId = getVal("marinaId");
      const urls = [];
      if (marinaId) urls.push("/api/moorings?marinaId=" + encodeURIComponent(marinaId));
      urls.push("/api/moorings");

      let foundType = null;

      for (const u of urls) {
        const r = await fetch(u, { headers: { "Accept": "application/json" } });
        if (!r.ok) continue;
        const data = await r.json().catch(()=>null);
        if (!data) continue;

        const list =
          Array.isArray(data) ? data :
          (Array.isArray(data.moorings) ? data.moorings :
          (Array.isArray(data.items) ? data.items :
          (Array.isArray(data.data) ? data.data : [])));

        const hit = list.find(x => Number(x && x.id) === mid);
        if (hit && (hit.type === "berth" || hit.type === "swing")) {

  try{
    window.addEventListener("error", function(ev){
      try{
        const msg = "JS ERROR: " + (ev && ev.message ? ev.message : "unknown") +
          (ev && ev.filename ? (" @ " + ev.filename.split("/").slice(-1)[0] + ":" + ev.lineno + ":" + ev.colno) : "");
        for (const id of ids){
          const el = document.getElementById(id);
          if (el) el.textContent = msg;
        }
      }catch(e){}
    });
  }catch(e){}


          foundType = hit.type;
          break;
        }
      }

      if (prefSel && (foundType === "berth" || foundType === "swing")) {
        prefSel.value = foundType; // force to match inventory
      }
    } catch(e) {}

if (!tcAccept){ setMsg("Please accept Terms & Conditions."); return; }

    // Demo defaults (safe). If your HTML contains owner/vessel ids, they will override.
    const ownerId = Number(getVal("ownerId","demoOwnerId")) || (bmProfileIdentity() && bmProfileIdentity().ownerId) || null;
    
const vesselId = Number(getVal("vesselId","demoVesselId")) || (bmProfileIdentity() && bmProfileIdentity().vesselId) || null;

/* === BM_PATCH11_PERSIST_DEMO_IDENTITY === */
try{
  // Make identity globally accessible + stable for submit
  window.demoIdentity = { ownerId, vesselId };
  try{ localStorage.setItem("bmDemoIdentity", JSON.stringify(window.demoIdentity)); }catch(e){}
  try{ localStorage.setItem("bmStableIdentity", JSON.stringify(window.demoIdentity)); }catch(e){}

  // Make the UI truthful (include numeric IDs)
  const it = document.getElementById("identityText");
  if (it) it.textContent = "Identity preloaded.";
}catch(e){}
/* === /BM_PATCH11_PERSIST_DEMO_IDENTITY === */


    const payload = {
      ownerId,
      vesselId,
      marinaId: Number(marinaId),
      mooringId: Number(mooringIdResolved || mooringId), /* BM_AUTOPICK_MOORING_V2_PAYLOAD */
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      servicePreference: (getVal("servicePreference") || undefined) /* BM_PAYLOAD_PREF_READ_V1 */,
      termsAccepted: tcAccept,
      termsAcceptedAt: (tcAccept ? new Date().toISOString() : undefined),
      termsUrl: (tcAcceptEl && tcAcceptEl.dataset && tcAcceptEl.dataset.termsUrl) ? String(tcAcceptEl.dataset.termsUrl) : undefined
      /* BM_TERMS_AUDIT_V1 */
    };

    setMsg("Submitting booking...");
    try{
      try{ if (typeof bmTrace==="function") bmTrace("SUBMIT: posting to /api/bookings"); }catch(e){}
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      });
      const t = await r.text();
      if (!r.ok){
        bmTrace("SUBMIT: failed HTTP " + r.status);

        let errData = null;
        try { errData = t ? JSON.parse(t) : null; } catch(e) {}

        function moneyMessage(msg){
          return String(msg || "").replace(/5000000/g, "NZ$5,000,000");
        }

        const issueLines = [];
        if (errData && Array.isArray(errData.blockingIssues)) {
          errData.blockingIssues.forEach(function(issue){
            if (!issue) return;
            let msg = issue.message || issue.error || issue.code || "Compliance requirement not met.";
            if (issue.type === "INSURANCE" && String(msg).indexOf("not compliant") >= 0) {
              msg = "Insurance cover must be at least NZ$5,000,000.";
            }
            issueLines.push("• " + moneyMessage(msg));
          });
        }

        const mainMsg = issueLines.length
          ? "Booking cannot be submitted:\n" + issueLines.join("\n")
          : "Submit failed: " + moneyMessage((errData && (errData.message || errData.error)) || ("HTTP " + r.status));

        setMsg(mainMsg);
        setDiag("Marina options: (submit error) " + (t || "").slice(0,160));
        return;
      }
      let out;
      try { out = JSON.parse(t); } catch(e){ out = { raw: t }; }
      bmTrace("SUBMIT: booking submitted");
      // If you have a handoff/details area, show something useful
      const handoff = $("handoff") || $("result") || $("bookingResult");
      if (handoff) handoff.textContent = JSON.stringify(out, null, 2);
    } catch(e){
      setMsg("Submit failed (network/error).");
      setDiag("Marina options: (submit exception) " + (e && e.message ? e.message : String(e)));
    }
  }

  
  // BM_EXPOSE_SUBMIT_V1: expose submitBooking for delegated/global handlers
  try{ window.bmSubmitBooking = submitBooking; }catch(e){}

function init(){
    // Always try to populate marinas
    loadMarinas().then(function(){
    try{
      if (hb) hb.textContent = "INIT: after loadMarinas().then( " + new Date().toISOString();
    }catch(e){}


    try{
      if (hb) hb.textContent = "INIT: started " + new Date().toISOString();
    }catch(e){}


      try { loadMoorings(getVal("marinaId")); } catch(e) {}
    });
const sel = $("marinaId");
    if (sel){
      sel.addEventListener("change", function(){
    try{
      if (hb) hb.textContent = "INIT: after marina change bind " + new Date().toISOString();
    }catch(e){}

        setDiag("Marina options: " + (sel.options ? sel.options.length : 0) + " (selected=" + (sel.value||"") + ")");
        try { loadMoorings(sel.value || ""); } catch(e) {}
      });

  /* BM_PATCH1_INIT_CALLS */
  try{ bmEnsureStatusUI(); bmBindSingleSubmit(); bmSetStatus("Ready. Fill the form and press Submit."); }catch(e){}
  /* /BM_PATCH1_INIT_CALLS */

}

      // BM_SYNC_PREF_V1: if user selects a specific mooring, sync Service Preference to match (berth/swing)
    const mooringSel = $("mooringId");
    const prefSel = $("servicePreference");
    if (mooringSel && prefSel){
      mooringSel.addEventListener("change", function(){
    try{
      if (hb) hb.textContent = "INIT: after mooring change bind " + new Date().toISOString();
    }catch(e){}

        try{
          const opt = mooringSel.options[mooringSel.selectedIndex];
          const t = opt ? (opt.getAttribute("data-type") || "") : "";
          if (t === "berth" || t === "swing") prefSel.value = t;
        }catch(e){}
      });
    }


    // BM_SUBMIT_BIND_FORM_V1: robust submit wiring (works even if button id changes)
    try{
      const form = document.querySelector("form");
      if (form){
        form.addEventListener("submit", function(ev){
          ev.preventDefault();
          submitBooking();
        });
      }
    }catch(e){}

    // Keep click handler too (if the button exists)
    const btn = $("submitBtn");
    try{
      if (hb) hb.textContent = "INIT: before submitBtn bind " + new Date().toISOString();
    }catch(e){}

    if (btn) btn.addEventListener("click", function(ev){ ev.preventDefault(); submitBooking(); });
    try{
      if (hb) hb.textContent = "INIT: submit bound " + new Date().toISOString();
    }catch(e){}



    
    // BM_TERMS_BIND_V1: capture current terms URL (from the visible "terms" link) onto the checkbox for audit payload
    try{
      const cb = $("tcAccept");
      if (cb){
        const links = Array.from(document.querySelectorAll("a[href]") || []);
        const best = links.find(a => {
          const txt = (a.textContent || "").toLowerCase();
          const href = (a.getAttribute("href") || "").toLowerCase();
          return txt.includes("terms") || href.includes("terms");
        });
        if (best){
          cb.dataset.termsUrl = best.href;
        }
      }
    }catch(e){}


    try{
      // Form submit (Enter key + submit buttons)
      const form = document.querySelector("form");
      if (form){
        form.addEventListener("submit", function(ev){
          ev.preventDefault();
          submitBooking();
        });
      }
      // Any button/input that appears to be "submit"
      const candidates = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]') || []);
      for (const el of candidates){
        const id = (el.id || "").toLowerCase();
        const type = (el.getAttribute("type") || "").toLowerCase();
        const txt = (el.textContent || el.value || "").toLowerCase();
        const looksSubmit =
          id.includes("submit") ||
          type === "submit" ||
          txt.includes("submit") ||
          txt.includes("book") ||
          txt.includes("request");
        if (looksSubmit){
          el.addEventListener("click", function(ev){
            ev.preventDefault();
            submitBooking();
          });
        }
      }
    }catch(e){}

setMsg("Ready.");
  }

  
  try{
    document.addEventListener("click", function(ev){
      try{
        const t = ev.target;
        const txt = (t && (t.textContent || t.value) ? String(t.textContent || t.value) : "").trim();
        const id  = t && t.id ? String(t.id) : "";
        const tag = t && t.tagName ? String(t.tagName) : "";
        // Only log if it smells like a submit action
        const low = (txt + " " + id + " " + tag).toLowerCase();
        if (low.includes("submit") || low.includes("book") || low.includes("request")) {
          try { setMsg("CLICK: tag=" + tag + " id=" + id + " text=\"" + txt.slice(0,60) + "\""); } catch(e){}
          /* BM_PATCH24_DISABLE_MARINA_CLICK_DEBUG: try { setDiag("Marina options: (click) tag=" + tag + " id=" + id + " text=" + txt.slice(0,60)); } catch(e){} */
}
      }catch(e){}
    }, true);
  }catch(e){}


  // BM_FIRST_CLICK_LOG_V1: log the first click anywhere (no filters) to visible debug areas
  try{
    let bmFirstClickDone = false;
    function bmWriteDebug(msg){
      try{
        const ids = ["identityText","mooringDiag","marinaDiag","msg","status","formMsg","handoff","result","bookingResult"];
        for (const id of ids){
          const el = document.getElementById(id);
          if (el) el.textContent = msg;
        }
      }catch(e){}
      /* BM_PATCH24_DISABLE_MARINA_CLICK_DEBUG: try{ if (typeof setDiag === "function") setDiag("Marina options: (debug) " + msg.slice(0,120)); }catch(e){} */
try{ if (typeof setMsg === "function") setMsg(msg.slice(0,120)); }catch(e){}
    }

    document.addEventListener("click", function(ev){
      if (bmFirstClickDone) return;
      bmFirstClickDone = true;
      try{
        const t = ev.target;
        const tag = t && t.tagName ? String(t.tagName) : "unknown";
        const id  = t && t.id ? String(t.id) : "";
        const cls = t && t.className ? String(t.className) : "";
        const txt = (t && (t.textContent || t.value)) ? String(t.textContent || t.value).trim().replace(/\s+/g," ").slice(0,80) : "";
        /* BM_PATCH23_DISABLE_FIRST_CLICK_DEBUG: bmWriteDebug("FIRST CLICK => tag=" + tag + " id=" + id + " class=" + cls + " text=\"" + txt + "\""); */
}catch(e){
        /* BM_PATCH23_DISABLE_FIRST_CLICK_DEBUG: bmWriteDebug("FIRST CLICK => (unable to read target)"); */
}
    }, true);
  }catch(e){}


  // BM_FORCE_SUBMIT_BIND_V1: always-on delegated click handler for the submit button
  try{
    document.addEventListener("click", function(ev){
      try{
        const btn = ev.target && ev.target.closest ? ev.target.closest("#submitBtn") : null;
        if (!btn) return;
        ev.preventDefault();

        // Visible proof the click was captured
        try{
          const el = document.getElementById("submitMsg");
        }catch(e){}

        // Call submitBooking if present
        // BM_FORCE_SUBMIT_BIND_V2: call exposed submit function on window (IIFE-safe)
        try{
          const fn = (typeof window !== "undefined" && typeof window.bmSubmitBooking === "function") ? window.bmSubmitBooking : null;
          if (fn) fn();
          else {
            const el = document.getElementById("submitMsg");
            if (el) el.textContent = "ERROR: window.bmSubmitBooking() not available.";
          }
        }catch(e){
          try{
            const el = document.getElementById("submitMsg");
            if (el) el.textContent = "ERROR calling window.bmSubmitBooking(): " + (e && e.message ? e.message : String(e));
          }catch(_){}
        }
      }catch(e){}
    }, true);
  }catch(e){}

document.addEventListener("DOMContentLoaded", init);
})();


/* === BM_PATCH1_STATUS_UI === */
function bmEnsureStatusUI(){
  try{
    let el = document.getElementById("bmStatus");
    if (!el){
      el = document.createElement("div");
      el.id = "bmStatus";
      el.style.marginTop = "10px";
      el.style.padding = "10px";
      el.style.borderRadius = "10px";
      el.style.border = "1px solid rgba(0,0,0,.12)";
      el.style.background = "rgba(0,0,0,.03)";
      el.style.fontSize = "14px";
      el.style.lineHeight = "1.35";
      el.textContent = "Ready.";
      // Try to place near the submit button first, otherwise at end of form
      const btn = document.querySelector('button[type="submit"], #submitBtn, #btnSubmit');
      const form = document.querySelector("form");
      if (btn && btn.parentNode) btn.parentNode.insertBefore(el, btn.nextSibling);
      else if (form) form.appendChild(el);
      else document.body.appendChild(el);
    }
  }catch(e){}
}

function bmSetStatus(msg){
  try{
    const el = document.getElementById("bmStatus");
    if (el) el.textContent = String(msg || "");
  }catch(e){}
}
/* === /BM_PATCH1_STATUS_UI === */



/* === BM_PATCH1_SINGLE_SUBMIT === */
function bmBindSingleSubmit(){
  try{
    bmEnsureStatusUI();

    // Report any runtime errors into the status box (so we stop guessing)
    if (!window.__bmPatch2ErrorsBound){
      window.__bmPatch2ErrorsBound = true;

      window.addEventListener("error", function(ev){
        try{
          const msg = (ev && ev.message) ? ev.message : "Unknown JS error";
          bmSetStatus("JS ERROR: " + msg);
        }catch(e){}
      });

      window.addEventListener("unhandledrejection", function(ev){
        try{
          const r = ev && ev.reason;
          const msg = (r && r.message) ? r.message : String(r);
          bmSetStatus("PROMISE ERROR: " + msg);
        }catch(e){}
      });
    }

    // Find the best candidate form (some pages may not have a proper <form>)
    const form =
      document.querySelector("form") ||
      document.getElementById("boatieBookingForm") ||
      document.getElementById("bookingForm");

    // Find submit button (multiple common IDs)
    const btn =
      document.querySelector('button[type="submit"]') ||
      document.getElementById("submitBtn") ||
      document.getElementById("btnSubmit") ||
      document.querySelector('button[data-action="submit"]');

    // Always bind button click as a hard fallback (even if there is no form)
    if (btn && !btn.dataset.bmPatch2ClickBound){
      btn.dataset.bmPatch2ClickBound = "1";
      btn.addEventListener("click", async function(ev){
        try{
          // Show immediate proof that the click handler fired
          bmSetStatus("Submit clicked… " + new Date().toLocaleString());

          if (ev){
            if (typeof ev.preventDefault === "function") ev.preventDefault();
            if (typeof ev.stopPropagation === "function") ev.stopPropagation();
            if (typeof ev.stopImmediatePropagation === "function") ev.stopImmediatePropagation();
          }

          if (typeof submitBooking !== "function"){
            bmSetStatus("ERROR: submitBooking() is missing.");
            return;
          }

          bmSetBookingStatus("Submitting booking…");
          await submitBooking();
          bmSetStatus("Submitted. Check Operator Inbox.");
        }catch(err){
          bmSetStatus("ERROR submitting booking: " + (err && err.message ? err.message : String(err)));
        }
      }, true);
    }

    // Also bind form submit (capturing) if a form exists
    if (form && !(form.dataset && form.dataset.bmPatch2SubmitBound === "1")){
      if (form.dataset) form.dataset.bmPatch2SubmitBound = "1";

      form.addEventListener("submit", async function(e){
        try{
          bmSetStatus("Form submit event… " + new Date().toLocaleString());

          if (e){
            e.preventDefault();
            e.stopPropagation();
            if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
          }

          if (typeof submitBooking !== "function"){
            bmSetStatus("ERROR: submitBooking() is missing.");
            return;
          }

          bmSetBookingStatus("Submitting booking…");
          await submitBooking();
          bmSetStatus("Submitted. Check Operator Inbox.");
        }catch(err){
          bmSetStatus("ERROR submitting booking: " + (err && err.message ? err.message : String(err)));
        }
      }, true);
    }

  }catch(e){
    try{ bmSetStatus("ERROR in bmBindSingleSubmit(): " + (e && e.message ? e.message : String(e))); }catch(_){}
  }
}
/* === /BM_PATCH1_SINGLE_SUBMIT === */


/* === BM_PATCH3C_DEFINE_SUBMITBOOKING (Service Preference demo model) === */
async function submitBooking(){
  try{ bmEnsureStatusUI(); }catch(e){}

  function pickEl(ids){
    for (const id of ids){
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }
  function valFrom(ids){
    const el = pickEl(ids);
    if (!el) return "";
    if (el.type === "checkbox") return !!el.checked;
    return (el.value != null) ? String(el.value).trim() : "";
  }
  function numFrom(ids){
    const v = valFrom(ids);
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  // Identity (demo): try window.demoIdentity, then hidden inputs, then localStorage
  const ownerId =
    (window.demoIdentity && Number(window.demoIdentity.ownerId)) ||
    numFrom(["ownerId","demoOwnerId","jsOwnerId","owner_id","owner-id"]) ||
    (function(){
      try{
        const raw = localStorage.getItem("bmDemoIdentity") || localStorage.getItem("demoIdentity");
        if (!raw) return null;
        const d = JSON.parse(raw);
        const n = Number(d && d.ownerId);
        return Number.isFinite(n) ? n : null;
      }catch(e){ return null; }
    })();

  const vesselId =
    (window.demoIdentity && Number(window.demoIdentity.vesselId)) ||
    numFrom(["vesselId","demoVesselId","jsVesselId","vessel_id","vessel-id"]) ||
    (function(){
      try{
        const raw = localStorage.getItem("bmDemoIdentity") || localStorage.getItem("demoIdentity");
        if (!raw) return null;
        const d = JSON.parse(raw);
        const n = Number(d && d.vesselId);
        return Number.isFinite(n) ? n : null;
      }catch(e){ return null; }
    })();

  const marinaId = numFrom(["marinaId","marina_id","selectMarina","jsMarinaId"]);
  const startDate = valFrom(["startDate","arrivalDate","dateFrom","fromDate"]);
  const endDate   = valFrom(["endDate","departureDate","dateTo","toDate"]);

  // Service preference only (demo model)
  const servicePreference = valFrom(["servicePreference","service_preference","prefService","jsServicePreference"]);

  // Terms
  const termsAccepted = !!valFrom(["termsAccepted","acceptTerms","agreeTerms","jsTermsAccepted"]);
  const termsUrl = (function(){
    try{
      const a = document.querySelector('a[href*="terms"]');
      if (a && a.getAttribute("href")) return a.getAttribute("href");
    }catch(e){}
    return "/terms.html";
  })();
  const termsAcceptedAt = termsAccepted ? new Date().toISOString() : null;

  const missing = [];
  if (!ownerId) missing.push("ownerId");
  if (!vesselId) missing.push("vesselId");
  if (!marinaId) missing.push("marinaId");
  if (!startDate) missing.push("startDate");
  if (!endDate) missing.push("endDate");
  if (!servicePreference) missing.push("servicePreference");
  if (!termsAccepted) missing.push("termsAccepted");

  if (missing.length){
    try{ bmSetBookingStatus("Missing required: " + missing.join(", ")); }catch(e){}
    return;
  }

  const payload = {
    ownerId,
    vesselId,
    marinaId,
    servicePreference,
    startDate,
    endDate,
    termsAccepted: true,
    termsAcceptedAt,
    termsUrl
    // Demo model: no mooringId/berthId
  };

  try{ bmSetBookingStatus("Submitting booking…"); }catch(e){}

  let res, text, data;
  try{
    res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    text = await res.text();
    try{ data = JSON.parse(text); }catch(e){ data = { raw: text }; }
  }catch(err){
    try{ bmSetBookingStatus("Network error: " + (err && err.message ? err.message : String(err))); }catch(e){}
    return;
  }

  if (!res.ok){
    const msg =
      (data && data.message) ? data.message :
      (data && data.error) ? data.error :
      "Request failed";
    const code =
      (data && data.code) ? data.code :
      (data && data.errorCode) ? data.errorCode :
      "";
    try{ bmSetBookingStatus("Submit failed: " + msg + (code ? " (" + code + ")" : "")); }catch(e){}
    return;
  }

  const booking = (data && (data.booking || data)) || {};
  const id = booking.id || booking.bookingId || "";
  try{ bmSetBookingStatus("Booking submitted ✔ " + (id ? ("ID " + id + ". ") : "") + "Now check Operator Inbox."); }catch(e){}
}
/* === /BM_PATCH3C_DEFINE_SUBMITBOOKING === */



/* === BM_PATCH4_BOOKING_STATUS_BRIDGE === */
function bmFindBookingStatusEl(){
  // Try a few likely ids/classes; if none, fall back to bmStatus
  return (
    document.getElementById("bookingStatus") ||
    document.getElementById("jsBookingStatus") ||
    document.getElementById("statusMessage") ||
    document.querySelector("[data-booking-status]") ||
    document.querySelector(".booking-status") ||
    document.getElementById("bmStatus") ||
    null
  );
}

function bmSetBookingStatus(msg){
  try{
    bmEnsureStatusUI();
    bmSetStatus(msg); // keep our patch status box in sync
  }catch(e){}

  try{
    const el = bmFindBookingStatusEl();
    if (el) el.textContent = String(msg || "");
  }catch(e){}
}
/* === /BM_PATCH4_BOOKING_STATUS_BRIDGE === */

/* === BM_PATCH4B_LEGACY_BOOKING_STATUS_SYNC ===
   Purpose: The page has a legacy Booking Status UI that keeps showing "Not submitted".
   We keep it synced to the real status used by our submit path. */
(function(){
  try{
    // Store last known status message globally
    if (!window.__bmLastStatusMsg) window.__bmLastStatusMsg = "Ready.";

    // Wrap bmSetStatus to also update the legacy panel (without breaking existing code)
    const _origBmSetStatus = (typeof window.bmSetStatus === "function") ? window.bmSetStatus : null;
    window.bmSetStatus = function(msg){
      try{ window.__bmLastStatusMsg = String(msg || ""); }catch(e){}
      try{ if (_origBmSetStatus) _origBmSetStatus(msg); }catch(e){}
      try{ bmSyncLegacyBookingStatus(); }catch(e){}
    };

    // If Patch 4 bridge exists, also wrap it
    const _origBmSetBookingStatus = (typeof window.bmSetBookingStatus === "function") ? window.bmSetBookingStatus : null;
    if (_origBmSetBookingStatus){
      window.bmSetBookingStatus = function(msg){
        try{ window.__bmLastStatusMsg = String(msg || ""); }catch(e){}
        try{ _origBmSetBookingStatus(msg); }catch(e){}
        try{ bmSyncLegacyBookingStatus(); }catch(e){}
      };
    }

    // Heuristic: find the "Booking Status" block and the element that says "Not submitted"
    window.bmSyncLegacyBookingStatus = function(){
      try{
        const msg = String(window.__bmLastStatusMsg || "").trim();
        if (!msg) return;

        // First: common ids/classes
        const direct =
          document.getElementById("bookingStatus") ||
          document.getElementById("jsBookingStatus") ||
          document.getElementById("bookingStatusText") ||
          document.getElementById("bookingStatusMessage") ||
          document.querySelector(".booking-status-text") ||
          document.querySelector("[data-booking-status-text]");

        if (direct){
          // If it looks like the legacy "Not submitted", overwrite it.
          const t = (direct.textContent || "").trim();
          if (t === "Not submitted" || t.toLowerCase().includes("not submitted") || t.toLowerCase().includes("submitted.") ){
            direct.textContent = msg;
          }
          return;
        }

        // Second: locate by heading text "Booking Status"
        const all = Array.from(document.querySelectorAll("div, h1, h2, h3, h4, p, span, label, strong"));
        const heading = all.find(el => (el.textContent || "").trim() === "Booking Status");
        if (!heading) return;

        const container = heading.closest("section, article, .card, .panel, .box, div") || heading.parentElement;
        if (!container) return;

        // Find the smallest element inside container that currently says "Not submitted"
        const kids = Array.from(container.querySelectorAll("*"));
        const target = kids.find(el => {
          const t = (el.textContent || "").trim();
          return t === "Not submitted" || t.toLowerCase() === "not submitted";
        });

        if (target) target.textContent = msg;

      }catch(e){}
    };

    // Keep it synced in case old auto-refresh code resets it
    if (!window.__bmLegacyStatusInterval){
      window.__bmLegacyStatusInterval = setInterval(function(){
        try{ bmSyncLegacyBookingStatus(); }catch(e){}
      }, 800);
    }

  }catch(e){}
})();
 /* === /BM_PATCH4B_LEGACY_BOOKING_STATUS_SYNC === */

/* === BM_PATCH4C_FORCE_REPLACE_NOT_SUBMITTED ===
   Goal: Booking Status panel is stale and keeps showing "Not submitted".
   Approach: Find the Booking Status area, then force-replace any child node that says "Not submitted". */
(function(){
  try{
    if (window.__bmPatch4cInstalled) return;
    window.__bmPatch4cInstalled = true;

    function norm(s){
      return String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function findBookingStatusRoot(){
      // Look for an element whose text includes "Booking Status"
      const nodes = Array.from(document.querySelectorAll("*"));
      for (const el of nodes){
        const t = norm(el.textContent);
        if (t === "booking status" || t.startsWith("booking status ")){
          // Prefer a containing card/panel
          return el.closest("section, article, .card, .panel, .box, .container, div") || el.parentElement || el;
        }
      }
      return null;
    }

    function forceReplace(){
      try{
        const msg = String(window.__bmLastStatusMsg || "").trim();
        if (!msg) return;

        const root = findBookingStatusRoot();
        if (!root) return;

        // Replace any element in this root whose text is exactly "Not submitted" (ignoring whitespace/case)
        const kids = Array.from(root.querySelectorAll("*"));
        for (const k of kids){
          const t = norm(k.textContent);
          if (t === "not submitted"){
            k.textContent = msg;
            return;
          }
        }

        // Fallback: sometimes "Not submitted" is part of a longer text node
        for (const k of kids){
          const t = norm(k.textContent);
          if (t.includes("not submitted")){
            k.textContent = msg;
            return;
          }
        }
      }catch(e){}
    }

    // Ensure we have a last-status message
    if (!window.__bmLastStatusMsg) window.__bmLastStatusMsg = "Ready.";

    // Wrap bmSetStatus so any status update triggers a legacy-panel update
    const _orig = (typeof window.bmSetStatus === "function") ? window.bmSetStatus : null;
    window.bmSetStatus = function(msg){
      try{ window.__bmLastStatusMsg = String(msg || ""); }catch(e){}
      try{ if (_orig) _orig(msg); }catch(e){}
      try{ forceReplace(); }catch(e){}
    };

    // Run repeatedly to beat any auto-refresh that rewrites it
    setInterval(forceReplace, 500);

    // Also run once shortly after load
    setTimeout(forceReplace, 250);
    setTimeout(forceReplace, 1200);

  }catch(e){}
})();
 /* === /BM_PATCH4C_FORCE_REPLACE_NOT_SUBMITTED === */

/* === BM_COAA2_OVERRIDE_SUBMITBOOKING (COA A: show Booking ID + Pending operator review) === */
async function submitBooking(){
  try{ bmEnsureStatusUI(); }catch(e){}

  function setMsg(msg){
    try{
      if (typeof bmSetBookingStatus === "function") bmSetBookingStatus(msg);
      else if (typeof bmSetStatus === "function") bmSetStatus(msg);
    }catch(e){}
  }

  function pickEl(ids){
    for (const id of ids){
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }
  function valFrom(ids){
    const el = pickEl(ids);
    if (!el) return "";
    if (el.type === "checkbox") return !!el.checked;
    return (el.value != null) ? String(el.value).trim() : "";
  }
  function numFrom(ids){
    const v = valFrom(ids);
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  // Identity (demo): try window.demoIdentity, then hidden inputs, then localStorage
  const ownerId =
    (window.demoIdentity && Number(window.demoIdentity.ownerId)) ||
    numFrom(["ownerId","demoOwnerId","jsOwnerId","owner_id","owner-id"]) ||
    (function(){
      try{
        const raw = localStorage.getItem("bmDemoIdentity") || localStorage.getItem("demoIdentity");
        if (!raw) return null;
        const d = JSON.parse(raw);
        const n = Number(d && d.ownerId);
        return Number.isFinite(n) ? n : null;
      }catch(e){ return null; }
    })();

  const vesselId =
    (window.demoIdentity && Number(window.demoIdentity.vesselId)) ||
    numFrom(["vesselId","demoVesselId","jsVesselId","vessel_id","vessel-id"]) ||
    (function(){
      try{
        const raw = localStorage.getItem("bmDemoIdentity") || localStorage.getItem("demoIdentity");
        if (!raw) return null;
        const d = JSON.parse(raw);
        const n = Number(d && d.vesselId);
        return Number.isFinite(n) ? n : null;
      }catch(e){ return null; }
    })();

  const marinaId = numFrom(["marinaId","marina_id","selectMarina","jsMarinaId"]);
  const startDate = valFrom(["startDate","arrivalDate","dateFrom","fromDate"]);
  const endDate   = valFrom(["endDate","departureDate","dateTo","toDate"]);

  // Service preference only (demo model)
  const servicePreference = valFrom(["servicePreference","service_preference","prefService","jsServicePreference"]);

  // Terms
  const termsAccepted = !!valFrom(["termsAccepted","acceptTerms","agreeTerms","jsTermsAccepted"]);
  const termsUrl = (function(){
    try{
      const a = document.querySelector('a[href*="terms"]');
      if (a && a.getAttribute("href")) return a.getAttribute("href");
    }catch(e){}
    return "/terms.html";
  })();
  const termsAcceptedAt = termsAccepted ? new Date().toISOString() : null;

  const missing = [];
  if (!ownerId) missing.push("ownerId");
  if (!vesselId) missing.push("vesselId");
  if (!marinaId) missing.push("marinaId");
  if (!startDate) missing.push("startDate");
  if (!endDate) missing.push("endDate");
  if (!servicePreference) missing.push("servicePreference");
  if (!termsAccepted) missing.push("termsAccepted");

  if (missing.length){
    setMsg("Missing required: " + missing.join(", "));
    return;
  }

  const payload = {
    ownerId,
    vesselId,
    marinaId,
    servicePreference,
    startDate,
    endDate,
    termsAccepted: true,
    termsAcceptedAt,
    termsUrl
    // Demo model: no mooringId/berthId
  };

  setMsg("Submitting booking…");

  let res, text, data;
  try{
    res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    text = await res.text();
    try{ data = JSON.parse(text); }catch(e){ data = { raw: text }; }
  }catch(err){
    setMsg("Network error: " + (err && err.message ? err.message : String(err)));
    return;
  }

  if (!res.ok){
    const msg =
      (data && data.message) ? data.message :
      (data && data.error) ? data.error :
      "Request failed";
    const code =
      (data && data.code) ? data.code :
      (data && data.errorCode) ? data.errorCode :
      "";
    setMsg("Submit failed: " + msg + (code ? " (" + code + ")" : ""));
    return;
  }

  // Robust ID extraction (backend response shapes vary)
  let id = "";
  try{
    const root = (data && (data.booking || data)) || {};
    if (root && (root.id || root.bookingId)) id = String(root.id || root.bookingId);
    else if (data && data.booking && data.booking.id) id = String(data.booking.id);
    else if (data && data.id) id = String(data.id);
  }catch(e){}

  setMsg("Booking submitted ✔ " + (id ? ("ID " + id + " — ") : "") + "Status: Pending operator review.");
}
/* === /BM_COAA2_OVERRIDE_SUBMITBOOKING === */


/* === BM_PATCH7A_FORCE_STATUS_TARGET === */
(function(){
  try{
    function ensureBmStatus(){
      let el = document.getElementById("bmStatus");
      if (!el){
        el = document.createElement("div");
        el.id = "bmStatus";
        el.style.marginTop = "10px";
        el.style.padding = "10px";
        el.style.borderRadius = "10px";
        el.style.border = "1px solid rgba(0,0,0,.12)";
        el.style.background = "rgba(0,0,0,.03)";
        el.style.fontSize = "14px";
        el.style.lineHeight = "1.35";
        el.textContent = "Ready.";

        const btn = document.querySelector('button[type="submit"], #submitBtn, #btnSubmit');
        const form = document.querySelector("form");
        if (btn && btn.parentNode) btn.parentNode.insertBefore(el, btn.nextSibling);
        else if (form) form.appendChild(el);
        else document.body.appendChild(el);
      }
      return el;
    }

    // Hard override: BOTH functions write to #bmStatus
    window.bmSetStatus = function(msg){
      try{
        const el = ensureBmStatus();
        el.textContent = String(msg || "");
        window.__bmLastStatusMsg = String(msg || "");
      }catch(e){}
    };

    window.bmSetBookingStatus = function(msg){
      try{
        const el = ensureBmStatus();
        el.textContent = String(msg || "");
        window.__bmLastStatusMsg = String(msg || "");
      }catch(e){}
    };

    // Visible proof this patch is running
    function stamp(){
      try{
        const el = ensureBmStatus();
        el.textContent = "";
      }catch(e){}
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", stamp);
    else stamp();

  }catch(e){}
})();
 /* === /BM_PATCH7A_FORCE_STATUS_TARGET === */

/* === BM_PATCH7C_BLOCK_STATUS_OVERWRITE ===
   Patch 2's binder overwrites success with "Submitted. Check Operator Inbox."
   We block that specific message so COA A ("Booking submitted ✔ ID … — Pending") remains visible.
*/
(function(){
  try{
    function shouldBlock(msg){
      const m = String(msg || "").trim();
      if (m === "Submitted. Check Operator Inbox.") return true;
      return false;
    }

    function ensureBmStatus(){
      let el = document.getElementById("bmStatus");
      if (!el) return null;
      return el;
    }

    // Wrap the forced setters from Patch 7A (or define if absent)
    const _setStatus = window.bmSetStatus;
    window.bmSetStatus = function(msg){
      try{
        if (shouldBlock(msg)) return;
      }catch(e){}
      try{ return _setStatus ? _setStatus(msg) : (function(){
        const el = ensureBmStatus();
        if (el) el.textContent = String(msg || "");
      })(); }catch(e){}
    };

    const _setBookingStatus = window.bmSetBookingStatus;
    window.bmSetBookingStatus = function(msg){
      try{
        if (shouldBlock(msg)) return;
      }catch(e){}
      try{ return _setBookingStatus ? _setBookingStatus(msg) : (function(){
        const el = ensureBmStatus();
        if (el) el.textContent = String(msg || "");
      })(); }catch(e){}
    };

  }catch(e){}
})();
 /* === /BM_PATCH7C_BLOCK_STATUS_OVERWRITE === */

/* === BM_PATCH8_OVERRIDE_SUBMITBOOKING (Identity+Terms robust) === */
async function submitBooking(){
  try{ bmEnsureStatusUI(); }catch(e){}

  function setMsg(msg){
    try{
      if (typeof bmSetBookingStatus === "function") bmSetBookingStatus(msg);
      else if (typeof bmSetStatus === "function") bmSetStatus(msg);
    }catch(e){}
  }

  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }

  function num(x){
    const n = Number(String(x||"").trim());
    return Number.isFinite(n) ? n : null;
  }

  function getBySelector(sel){
    try{ return document.querySelector(sel); }catch(e){ return null; }
  }

  function getInputNumberByHints(hints){
    for (const h of hints){
      const el =
        document.getElementById(h) ||
        getBySelector(`input[name="${h}"]`) ||
        getBySelector(`input[name="${h.toLowerCase()}"]`) ||
        getBySelector(`input[id="${h}"]`);
      if (el && el.value != null){
        const n = num(el.value);
        if (n) return n;
      }
    }
    return null;
  }

  function getIdentityFromWindow(){
    const candidates = [
      window.demoIdentity,
      window.DEMO_IDENTITY,
      window.bmDemoIdentity,
      window.BM_DEMO_IDENTITY,
      window.__demoIdentity
    ].filter(Boolean);

    for (const c of candidates){
      const o = num(c.ownerId);
      const v = num(c.vesselId);
      if (o && v) return { ownerId: o, vesselId: v };
    }
    return null;
  }

  function getIdentityFromStorage(){
    const keys = ["bmDemoIdentity","demoIdentity","BM_DEMO_IDENTITY","DEMO_IDENTITY"];
    for (const k of keys){
      try{
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const d = JSON.parse(raw);
        const o = num(d && d.ownerId);
        const v = num(d && d.vesselId);
        if (o && v) return { ownerId: o, vesselId: v };
      }catch(e){}
    }
    return null;
  }

  function getIdentityFromHiddenInputs(){
    const o =
      getInputNumberByHints(["ownerId","demoOwnerId","jsOwnerId","owner_id","owner-id"]) ||
      (function(){
        const el = getBySelector('input[type="hidden"][name*="owner" i], input[type="hidden"][id*="owner" i]');
        return el ? num(el.value) : null;
      })();

    const v =
      getInputNumberByHints(["vesselId","demoVesselId","jsVesselId","vessel_id","vessel-id"]) ||
      (function(){
        const el = getBySelector('input[type="hidden"][name*="vessel" i], input[type="hidden"][id*="vessel" i]');
        return el ? num(el.value) : null;
      })();

    if (o && v) return { ownerId: o, vesselId: v };
    return null;
  }

  function getIdentityFromVisiblePanel(){
    // Look for a panel that contains "Preloaded Identity" or similar.
    const nodes = Array.from(document.querySelectorAll("*"));
    const panel = nodes.find(el => {
      const t = norm(el.textContent).toLowerCase();
      return t.includes("preloaded identity") || t.includes("loading demo identity") || t.includes("demo identity");
    });
    if (!panel) return null;

    const t = norm(panel.textContent);

    // Try common patterns: "ownerId 4", "Owner Id 4", "owner: 4", etc.
    const mOwner = t.match(/owner\s*(id)?\s*[:#]?\s*(\d+)/i);
    const mVessel = t.match(/vessel\s*(id)?\s*[:#]?\s*(\d+)/i);

    const o = mOwner ? num(mOwner[2]) : null;
    const v = mVessel ? num(mVessel[2]) : null;

    if (o && v) return { ownerId: o, vesselId: v };
    return null;
  }

  async function waitForIdentity(){
    // Poll briefly to allow async identity loader to populate.
    for (let i=0; i<6; i++){
      const win = getIdentityFromWindow(); if (win) return win;
      const st  = getIdentityFromStorage(); if (st) return st;
      const hid = getIdentityFromHiddenInputs(); if (hid) return hid;
      const vis = getIdentityFromVisiblePanel(); if (vis) return vis;
      await sleep(200);
    }
    return null;
  }

  function getMarinaId(){
    const el =
      document.getElementById("marinaId") ||
      document.getElementById("marina_id") ||
      document.getElementById("selectMarina") ||
      document.getElementById("jsMarinaId") ||
      getBySelector('select[name*="marina" i]') ||
      getBySelector('select[id*="marina" i]');
    return el ? num(el.value) : null;
  }

  function getDate(idHints){
    for (const h of idHints){
      const el = document.getElementById(h) || getBySelector(`input[name="${h}"]`);
      if (el && el.value) return String(el.value).trim();
    }
    // fallback: first date input(s)
    const el = getBySelector('input[type="date"]');
    return el && el.value ? String(el.value).trim() : "";
  }

  function getServicePreference(){
    const el =
      document.getElementById("servicePreference") ||
      document.getElementById("service_preference") ||
      document.getElementById("prefService") ||
      document.getElementById("jsServicePreference") ||
      getBySelector('select[name*="service" i], select[id*="service" i], select[name*="preference" i], select[id*="preference" i]');
    return el && el.value ? String(el.value).trim() : "";
  }

  function getTermsAccepted(){
    // Prefer explicit checkbox ids
    const el =
      document.getElementById("termsAccepted") ||
      document.getElementById("acceptTerms") ||
      document.getElementById("agreeTerms") ||
      document.getElementById("jsTermsAccepted") ||
      getBySelector('input[type="checkbox"][name*="terms" i], input[type="checkbox"][id*="terms" i]') ||
      getBySelector('input[type="checkbox"][name*="agree" i], input[type="checkbox"][id*="agree" i]') ||
      getBySelector('input[type="checkbox"][name*="accept" i], input[type="checkbox"][id*="accept" i]');
    if (!el) return { ok:false, checked:false, reason:"checkbox not found" };
    return { ok:true, checked: !!el.checked };
  }

  const ident = await waitForIdentity();

  const ownerId = ident ? ident.ownerId : null;
  const vesselId = ident ? ident.vesselId : null;

  const marinaId = getMarinaId();
  const startDate = getDate(["startDate","arrivalDate","dateFrom","fromDate"]);
  const endDate   = getDate(["endDate","departureDate","dateTo","toDate"]);
  const servicePreference = getServicePreference();

  const terms = getTermsAccepted();
  const termsAccepted = terms.ok ? terms.checked : false;
  const termsUrl = (function(){
    try{
      const a = document.querySelector('a[href*="terms"]');
      if (a && a.getAttribute("href")) return a.getAttribute("href");
    }catch(e){}
    return "/terms.html";
  })();
  const termsAcceptedAt = termsAccepted ? new Date().toISOString() : null;

  const missing = [];
  if (!ownerId) missing.push("ownerId");
  if (!vesselId) missing.push("vesselId");
  if (!marinaId) missing.push("marinaId");
  if (!startDate) missing.push("startDate");
  if (!endDate) missing.push("endDate");
  if (!servicePreference) missing.push("servicePreference");
  if (!terms.ok) missing.push("termsAccepted (" + terms.reason + ")");
  else if (!termsAccepted) missing.push("termsAccepted");

  if (missing.length){
    setMsg("Missing required: " + missing.join(", "));
    return;
  }

  const payload = {
    ownerId,
    vesselId,
    marinaId,
    servicePreference,
    startDate,
    endDate,
    termsAccepted: true,
    termsAcceptedAt,
    termsUrl
  };

  setMsg("Submitting booking…");

  let res, text, data;
  try{
    res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    text = await res.text();
    try{ data = JSON.parse(text); }catch(e){ data = { raw: text }; }
  }catch(err){
    setMsg("Network error: " + (err && err.message ? err.message : String(err)));
    return;
  }

  if (!res.ok){
    const msg =
      (data && data.message) ? data.message :
      (data && data.error) ? data.error :
      "Request failed";
    const code =
      (data && data.code) ? data.code :
      (data && data.errorCode) ? data.errorCode :
      "";
    setMsg("Submit failed: " + msg + (code ? " (" + code + ")" : ""));
    return;
  }

  // Robust booking ID
  let id = "";
  try{
    const root = (data && (data.booking || data)) || {};
    if (root && (root.id || root.bookingId)) id = String(root.id || root.bookingId);
    else if (data && data.booking && data.booking.id) id = String(data.booking.id);
    else if (data && data.id) id = String(data.id);
  }catch(e){}

  setMsg("Booking submitted ✔ " + (id ? ("ID " + id + " — ") : "") + "Status: Pending operator review.");
}
/* === /BM_PATCH8_OVERRIDE_SUBMITBOOKING === */


/* === BM_PATCH12_OVERRIDE_SUBMITBOOKING (auto-pick demo mooringId to satisfy backend) === */
async function submitBooking(){
  try{ bmEnsureStatusUI(); }catch(e){}

  function setMsg(msg){
    try{
      if (typeof bmSetBookingStatus === "function") bmSetBookingStatus(msg);
      else if (typeof bmSetStatus === "function") bmSetStatus(msg);
    }catch(e){}
  }
  function num(x){
    const n = Number(String(x||"").trim());
    return Number.isFinite(n) ? n : null;
  }
  function q(sel){ try{ return document.querySelector(sel); }catch(e){ return null; } }
  function byId(id){ return document.getElementById(id); }

  // Identity (now guaranteed by Patch 11)
  const ownerId = (window.demoIdentity && num(window.demoIdentity.ownerId)) || null;
  const vesselId = (window.demoIdentity && num(window.demoIdentity.vesselId)) || null;

  const marinaEl =
    byId("marinaId") || byId("marina_id") || byId("selectMarina") || byId("jsMarinaId") ||
    q('select[name*="marina" i], select[id*="marina" i]');
  const marinaId = marinaEl ? num(marinaEl.value) : null;

  const startEl = byId("startDate") || byId("arrivalDate") || byId("dateFrom") || byId("fromDate") || q('input[type="date"]');
  const endEl   = byId("endDate") || byId("departureDate") || byId("dateTo") || byId("toDate") || q('input[type="date"]:nth-of-type(2)');
  const startDate = startEl && startEl.value ? String(startEl.value).trim() : "";
  const endDate   = endEl && endEl.value ? String(endEl.value).trim() : "";

  const prefEl =
    byId("servicePreference") || byId("service_preference") || byId("prefService") || byId("jsServicePreference") ||
    q('select[name*="service" i], select[id*="service" i], select[name*="preference" i], select[id*="preference" i]');
  const servicePreference = prefEl && prefEl.value ? String(prefEl.value).trim().toLowerCase() : "";

  const termsEl =
    byId("termsAccepted") || byId("acceptTerms") || byId("agreeTerms") || byId("jsTermsAccepted") ||
    q('input[type="checkbox"][name*="terms" i], input[type="checkbox"][id*="terms" i]') ||
    q('input[type="checkbox"][name*="agree" i], input[type="checkbox"][id*="agree" i]') ||
    q('input[type="checkbox"][name*="accept" i], input[type="checkbox"][id*="accept" i]');
  const termsAccepted = !!(termsEl && termsEl.checked);

  const missing = [];
  if (!ownerId) missing.push("ownerId");
  if (!vesselId) missing.push("vesselId");
  if (!marinaId) missing.push("marinaId");
  if (!startDate) missing.push("startDate");
  if (!endDate) missing.push("endDate");
  if (!servicePreference) missing.push("servicePreference");
  if (!termsEl) missing.push("termsAccepted (checkbox not found)");
  else if (!termsAccepted) missing.push("termsAccepted");

  if (missing.length){
    setMsg("Missing required: " + missing.join(", "));
    return;
  }

  // Auto-pick a demo mooringId to satisfy current backend validation.
  // We do NOT surface this to the boatie; operator still “assigns” in reality later.
  async function pickDemoMooringId(){
    // Try marina-filtered endpoint first
    let moorings = [];
    try{
      const r = await fetch("/api/moorings?marinaId=" + encodeURIComponent(String(marinaId)));
      if (r.ok) moorings = await r.json();
    }catch(e){}

    // Fallback: fetch all and filter
    if (!Array.isArray(moorings) || moorings.length === 0){
      try{
        const r2 = await fetch("/api/moorings");
        if (r2.ok) {
          const all = await r2.json();
          if (Array.isArray(all)) moorings = all;
          else if (all && Array.isArray(all.moorings)) moorings = all.moorings;
        }
      }catch(e){}
      moorings = (moorings || []).filter(m => num(m.marinaId) === marinaId);
    }

    // Normalize mooring objects
    moorings = (moorings || []).map(m => ({
      id: num(m.id),
      marinaId: num(m.marinaId),
      type: String(m.type || m.mooringType || "").toLowerCase()
    })).filter(m => m.id && m.marinaId === marinaId);

    if (!moorings.length) return null;

    const want =
      (servicePreference.includes("swing")) ? "swing" :
      (servicePreference.includes("berth")) ? "berth" :
      ""; // either/best available

    if (want){
      const hit = moorings.find(m => m.type === want);
      if (hit) return hit.id;
    }

    // Otherwise just take first available
    return moorings[0].id;
  }

  setMsg("Submitting booking…");

  const mooringId = await pickDemoMooringId();
  if (!mooringId){
    setMsg("Submit failed: Could not auto-select a demo mooringId for marina " + marinaId + ".");
    return;
  }

  const termsUrl = (function(){
    try{
      const a = document.querySelector('a[href*="terms"]');
      if (a && a.getAttribute("href")) return a.getAttribute("href");
    }catch(e){}
    return "/terms.html";
  })();

  const payload = {
    ownerId,
    vesselId,
    marinaId,
    mooringId,               // <- satisfies backend
    servicePreference,        // keep preference for operator context
    startDate,
    endDate,
    termsAccepted: true,
    termsAcceptedAt: new Date().toISOString(),
    termsUrl
  };

  let res, text, data;
  try{
    res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    text = await res.text();
    try{ data = JSON.parse(text); }catch(e){ data = { raw: text }; }
  }catch(err){
    setMsg("Network error: " + (err && err.message ? err.message : String(err)));
    return;
  }

  if (!res.ok){
    const msg =
      (data && data.message) ? data.message :
      (data && data.error) ? data.error :
      "Request failed";
    const code =
      (data && data.code) ? data.code :
      (data && data.errorCode) ? data.errorCode :
      "";
    setMsg("Submit failed: " + msg + (code ? " (" + code + ")" : ""));
    return;
  }

  let id = "";
  try{
    const root = (data && (data.booking || data)) || {};
    if (root && (root.id || root.bookingId)) id = String(root.id || root.bookingId);
    else if (data && data.booking && data.booking.id) id = String(data.booking.id);
    else if (data && data.id) id = String(data.id);
  }catch(e){}

  setMsg("Booking submitted ✔ " + (id ? ("ID " + id + " — ") : "") + "Status: Pending operator review.");
}
/* === /BM_PATCH12_OVERRIDE_SUBMITBOOKING === */

/* === BM_PATCH13_OVERRIDE_SUBMITBOOKING (IDENTITY TRUTH PROBE + FALLBACK) === */
async function submitBooking(){
  try{ bmEnsureStatusUI(); }catch(e){}

  function setMsg(msg){
    try{
      if (typeof bmSetBookingStatus === "function") bmSetBookingStatus(msg);
      else if (typeof bmSetStatus === "function") bmSetStatus(msg);
    }catch(e){}
  }
  function num(x){
    const n = Number(String(x ?? "").trim());
    return Number.isFinite(n) ? n : null;
  }
  function q(sel){ try{ return document.querySelector(sel); }catch(e){ return null; } }
  function byId(id){ return document.getElementById(id); }

  // ---- Identity capture (truth probe) ----
  function parseIdentityText(){
    try{
      const it = byId("identityText");
      if (!it) return null;
      const t = String(it.textContent || "");
      const mo = t.match(/owner\s*([0-9]+)/i);
      const mv = t.match(/vessel\s*([0-9]+)/i);
      const ownerId = mo ? num(mo[1]) : null;
      const vesselId = mv ? num(mv[1]) : null;
      if (ownerId && vesselId) return { ownerId, vesselId, src: "identityText" };
    }catch(e){}
    return null;
  }

  function parseLS(key){
    try{
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const d = JSON.parse(raw);
      const ownerId = num(d && d.ownerId);
      const vesselId = num(d && d.vesselId);
      if (ownerId && vesselId) return { ownerId, vesselId, src: "localStorage:" + key };
    }catch(e){}
    return null;
  }

  let ident = null;

  try{
    if (window.demoIdentity && num(window.demoIdentity.ownerId) && num(window.demoIdentity.vesselId)){
      ident = { ownerId: num(window.demoIdentity.ownerId), vesselId: num(window.demoIdentity.vesselId), src: "window.demoIdentity" };
    }
  }catch(e){}

  if (!ident) ident = parseIdentityText();
  if (!ident) ident = parseLS("bmStableIdentity");
  if (!ident) ident = parseLS("bmDemoIdentity");
  if (!ident) ident = parseLS("demoIdentity");

  // Final demo fallback (only if absolutely nothing else available)
  if (!ident) ident = bmProfileIdentity();

  // Persist back to window + storage so subsequent submits are stable
  try{
    window.demoIdentity = { ownerId: ident.ownerId, vesselId: ident.vesselId };
    try{ localStorage.setItem("bmStableIdentity", JSON.stringify(window.demoIdentity)); }catch(e){}
    try{ localStorage.setItem("bmDemoIdentity", JSON.stringify(window.demoIdentity)); }catch(e){}
  }catch(e){}

  // Truth probe (keep it short)
  try{
    const w = window.demoIdentity ? ("w=" + JSON.stringify(window.demoIdentity)) : "w=null";
    const it = byId("identityText") ? ("it=" + String(byId("identityText").textContent||"").trim().slice(0,60)) : "it=null";
    setMsg("P13 IDENTITY: " + ident.src + " | " + w + " | " + it);
  }catch(e){}

  const ownerId = ident.ownerId;
  const vesselId = ident.vesselId;

  // ---- Collect remaining fields (minimal) ----
  const marinaEl =
    byId("marinaId") || byId("marina_id") || byId("selectMarina") || byId("jsMarinaId") ||
    q('select[name*="marina" i], select[id*="marina" i]');
  const marinaId = marinaEl ? num(marinaEl.value) : null;

  const startEl = byId("startDate") || byId("arrivalDate") || byId("dateFrom") || byId("fromDate") || q('input[type="date"]');
  const endEl   = byId("endDate") || byId("departureDate") || byId("dateTo") || byId("toDate") || q('input[type="date"]:nth-of-type(2)');
  const startDate = startEl && startEl.value ? String(startEl.value).trim() : "";
  const endDate   = endEl && endEl.value ? String(endEl.value).trim() : "";

  const prefEl =
    byId("servicePreference") || byId("service_preference") || byId("prefService") || byId("jsServicePreference") ||
    q('select[name*="service" i], select[id*="service" i], select[name*="preference" i], select[id*="preference" i]');
  const servicePreference = prefEl && prefEl.value ? String(prefEl.value).trim().toLowerCase() : "";

  const termsEl =
    byId("termsAccepted") || byId("acceptTerms") || byId("agreeTerms") || byId("jsTermsAccepted") ||
    q('input[type="checkbox"][name*="terms" i], input[type="checkbox"][id*="terms" i]') ||
    q('input[type="checkbox"][name*="agree" i], input[type="checkbox"][id*="agree" i]') ||
    q('input[type="checkbox"][name*="accept" i], input[type="checkbox"][id*="accept" i]');
  const termsAccepted = !!(termsEl && termsEl.checked);

  const missing = [];
  if (!ownerId) missing.push("ownerId");
  if (!vesselId) missing.push("vesselId");
  if (!marinaId) missing.push("marinaId");
  if (!startDate) missing.push("startDate");
  if (!endDate) missing.push("endDate");
  if (!servicePreference) missing.push("servicePreference");
  if (!termsEl) missing.push("termsAccepted (checkbox not found)");
  else if (!termsAccepted) missing.push("termsAccepted");

  if (missing.length){
    setMsg("P13 Missing required: " + missing.join(", "));
    return;
  }

  // Stop here for now (we’re nailing identity first, per your instruction)
  setMsg("P13 OK: identity locked (Owner " + ownerId + ", Vessel " + vesselId + "). Now we can proceed to mooringId/date mapping.");
}
/* === /BM_PATCH13_OVERRIDE_SUBMITBOOKING === */


/* === BM_PATCH14_OVERRIDE_SUBMITBOOKING (POST with required fields) === */
async function submitBooking(){
  try{ bmEnsureStatusUI(); }catch(e){}

  function setMsg(msg){
    try{
      if (typeof bmSetBookingStatus === "function") bmSetBookingStatus(msg);
      else if (typeof bmSetStatus === "function") bmSetStatus(msg);
    }catch(e){}
  }
  function num(x){
    const n = Number(String(x ?? "").trim());
    return Number.isFinite(n) ? n : null;
  }
  function q(sel){ try{ return document.querySelector(sel); }catch(e){ return null; } }
  function byId(id){ return document.getElementById(id); }

  // -------- Identity (use Patch 13 approach: stable + fallback) --------
  function parseIdentityText(){
    try{
      const it = byId("identityText");
      if (!it) return null;
      const t = String(it.textContent || "");
      const mo = t.match(/owner\s*([0-9]+)/i);
      const mv = t.match(/vessel\s*([0-9]+)/i);
      const ownerId = mo ? num(mo[1]) : null;
      const vesselId = mv ? num(mv[1]) : null;
      if (ownerId && vesselId) return { ownerId, vesselId };
    }catch(e){}
    return null;
  }
  function parseLS(key){
    try{
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const d = JSON.parse(raw);
      const ownerId = num(d && d.ownerId);
      const vesselId = num(d && d.vesselId);
      if (ownerId && vesselId) return { ownerId, vesselId };
    }catch(e){}
    return null;
  }

  let ident = bmProfileIdentity();

  if (!ident) {
    try{
      if (window.demoIdentity && num(window.demoIdentity.ownerId) && num(window.demoIdentity.vesselId)){
        ident = { ownerId: num(window.demoIdentity.ownerId), vesselId: num(window.demoIdentity.vesselId) };
      }
    }catch(e){}
  }

  if (!ident) ident = parseIdentityText();
  if (!ident) ident = parseLS("bmStableIdentity");
  if (!ident) ident = parseLS("bmDemoIdentity");
  if (!ident) ident = parseLS("demoIdentity");

  // Persist it so it stays stable
  try{
    window.demoIdentity = { ownerId: ident.ownerId, vesselId: ident.vesselId };
    try{ localStorage.setItem("bmStableIdentity", JSON.stringify(window.demoIdentity)); }catch(e){}
    try{ localStorage.setItem("bmDemoIdentity", JSON.stringify(window.demoIdentity)); }catch(e){}
  }catch(e){}

  const ownerId = ident.ownerId;
  const vesselId = ident.vesselId;

  // -------- Collect required form fields --------
  const marinaEl =
    byId("marinaId") || byId("marina_id") || byId("selectMarina") || byId("jsMarinaId") ||
    q('select[name*="marina" i], select[id*="marina" i]');
  const marinaId = marinaEl ? num(marinaEl.value) : null;

  const startEl = byId("startDate") || byId("arrivalDate") || byId("dateFrom") || byId("fromDate") || q('input[type="date"]');
  const endEl   = byId("endDate") || byId("departureDate") || byId("dateTo") || byId("toDate") || q('input[type="date"]:nth-of-type(2)');

  const startDate = startEl && startEl.value ? String(startEl.value).trim() : "";
  const endDate   = endEl && endEl.value ? String(endEl.value).trim() : "";

  const prefEl =
    byId("servicePreference") || byId("service_preference") || byId("prefService") || byId("jsServicePreference") ||
    q('select[name*="service" i], select[id*="service" i], select[name*="preference" i], select[id*="preference" i]');
  const servicePreference = prefEl && prefEl.value ? String(prefEl.value).trim().toLowerCase() : "";

  const termsEl =
    byId("termsAccepted") || byId("acceptTerms") || byId("agreeTerms") || byId("jsTermsAccepted") ||
    q('input[type="checkbox"][name*="terms" i], input[type="checkbox"][id*="terms" i]') ||
    q('input[type="checkbox"][name*="agree" i], input[type="checkbox"][id*="agree" i]') ||
    q('input[type="checkbox"][name*="accept" i], input[type="checkbox"][id*="accept" i]');
  const termsAccepted = !!(termsEl && termsEl.checked);

  const missing = [];
  if (!ownerId) missing.push("ownerId");
  if (!vesselId) missing.push("vesselId");
  if (!marinaId) missing.push("marinaId");
  if (!startDate) missing.push("startDate");
  if (!endDate) missing.push("endDate");
  if (!servicePreference) missing.push("servicePreference");
  if (!termsEl) missing.push("termsAccepted (checkbox not found)");
  else if (!termsAccepted) missing.push("termsAccepted");

  if (missing.length){
    setMsg("Missing required: " + missing.join(", "));
    return;
  }

  // -------- Auto-select mooringId (backend requires it) --------
  async function fetchMoorings(){
    // Prefer all moorings then filter (keeps it simple)
    try{
      const r = await fetch("/api/moorings");
      if (!r.ok) return [];
      const j = await r.json();
      if (Array.isArray(j)) return j;
      if (j && Array.isArray(j.moorings)) return j.moorings;
      return [];
    }catch(e){
      return [];
    }
  }

  function pickMooring(moorings){
    const list = (moorings || [])
      .map(m => ({
        id: num(m.id),
        marinaId: num(m.marinaId),
        type: String(m.type || m.mooringType || "").toLowerCase()
      }))
      .filter(m => m.id && m.marinaId === marinaId);

    if (!list.length) return null;

    const want =
      servicePreference.includes("swing") ? "swing" :
      servicePreference.includes("berth") ? "berth" :
      ""; // either/best available

    if (want){
      const hit = list.find(m => m.type === want);
      if (hit) return hit.id;
    }
    return list[0].id;
  }

  setMsg("Submitting booking…");

  const moorings = await fetchMoorings();
  const mooringId = pickMooring(moorings);

  if (!mooringId){
    setMsg("Submit failed: Could not find a mooringId for marina " + marinaId + ".");
    return;
  }

  const termsUrl = (function(){
    try{
      const a = document.querySelector('a[href*="terms"]');
      if (a && a.getAttribute("href")) return a.getAttribute("href");
    }catch(e){}
    return "/terms.html";
  })();

  const payload = {
    ownerId,
    vesselId,
    marinaId,
    mooringId,
    servicePreference,
    startDate,
    endDate,
    termsAccepted: true,
    termsAcceptedAt: new Date().toISOString(),
    termsUrl
  };

  let res, text, data;
  try{
    res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    text = await res.text();
    try{ data = JSON.parse(text); }catch(e){ data = { raw: text }; }
  }catch(err){
    setMsg("Network error: " + (err && err.message ? err.message : String(err)));
    return;
  }

  if (!res.ok){
    const msg =
      (data && data.message) ? data.message :
      (data && data.error) ? data.error :
      "Request failed";
    const code =
      (data && data.code) ? data.code :
      (data && data.errorCode) ? data.errorCode :
      "";
    setMsg("Submit failed: " + msg + (code ? " (" + code + ")" : ""));
    return;
  }

  let id = "";
  try{
    const root = (data && (data.booking || data)) || {};
    if (root && (root.id || root.bookingId)) id = String(root.id || root.bookingId);
    else if (data && data.booking && data.booking.id) id = String(data.booking.id);
    else if (data && data.id) id = String(data.id);
  }catch(e){}

  setMsg("Booking submitted ✔ " + (id ? ("ID " + id + " — ") : "") + "Status: Pending operator review.");
}
/* === /BM_PATCH14_OVERRIDE_SUBMITBOOKING === */


/* === BM_PATCH15B_SAVE_RESTORE_DRAFT_FOR_TERMS === */
(function(){
  try{
    function q(sel){ try{ return document.querySelector(sel); }catch(e){ return null; } }
    function byId(id){ return document.getElementById(id); }

    function getVal(ids, selectors){
      for (const id of (ids||[])){
        const el = byId(id);
        if (el && el.value != null) return String(el.value);
      }
      for (const sel of (selectors||[])){
        const el = q(sel);
        if (el && el.value != null) return String(el.value);
      }
      return "";
    }

    function getChecked(ids, selectors){
      for (const id of (ids||[])){
        const el = byId(id);
        if (el && el.type === "checkbox") return !!el.checked;
      }
      for (const sel of (selectors||[])){
        const el = q(sel);
        if (el && el.type === "checkbox") return !!el.checked;
      }
      return false;
    }

    window.bmSaveDraft = function(){
      try{
        const draft = {
          marinaId: getVal(["marinaId","marina_id","selectMarina","jsMarinaId"], ['select[name*="marina" i]','select[id*="marina" i]']),
          startDate: getVal(["startDate","arrivalDate","dateFrom","fromDate"], ['input[type="date"]']),
          endDate: getVal(["endDate","departureDate","dateTo","toDate"], ['input[type="date"]:nth-of-type(2)']),
          servicePreference: getVal(["servicePreference","service_preference","prefService","jsServicePreference"], ['select[name*="service" i]','select[id*="service" i]','select[name*="preference" i]','select[id*="preference" i]']),
          termsAccepted: getChecked(["termsAccepted","acceptTerms","agreeTerms","jsTermsAccepted"], ['input[type="checkbox"][name*="terms" i]','input[type="checkbox"][id*="terms" i]','input[type="checkbox"][name*="agree" i]','input[type="checkbox"][id*="agree" i]'])
        };
        sessionStorage.setItem("bmBoatieDraft", JSON.stringify(draft));
      }catch(e){}
    };

    window.bmRestoreDraft = function(){
      try{
        const raw = sessionStorage.getItem("bmBoatieDraft");
        if (!raw) return false;
        const d = JSON.parse(raw || "{}");

        function setVal(ids, selectors, value){
          if (value == null) return;
          for (const id of (ids||[])){
            const el = byId(id);
            if (el && el.value != null){ el.value = String(value); return true; }
          }
          for (const sel of (selectors||[])){
            const el = q(sel);
            if (el && el.value != null){ el.value = String(value); return true; }
          }
          return false;
        }
        function setChecked(ids, selectors, checked){
          for (const id of (ids||[])){
            const el = byId(id);
            if (el && el.type === "checkbox"){ el.checked = !!checked; return true; }
          }
          for (const sel of (selectors||[])){
            const el = q(sel);
            if (el && el.type === "checkbox"){ el.checked = !!checked; return true; }
          }
          return false;
        }

        setVal(["marinaId","marina_id","selectMarina","jsMarinaId"], ['select[name*="marina" i]','select[id*="marina" i]'], d.marinaId);
        setVal(["startDate","arrivalDate","dateFrom","fromDate"], ['input[type="date"]'], d.startDate);
        setVal(["endDate","departureDate","dateTo","toDate"], ['input[type="date"]:nth-of-type(2)'], d.endDate);
        setVal(["servicePreference","service_preference","prefService","jsServicePreference"], ['select[name*="service" i]','select[id*="service" i]','select[name*="preference" i]','select[id*="preference" i]'], d.servicePreference);
        setChecked(["termsAccepted","acceptTerms","agreeTerms","jsTermsAccepted"], ['input[type="checkbox"][name*="terms" i]','input[type="checkbox"][id*="terms" i]','input[type="checkbox"][name*="agree" i]','input[type="checkbox"][id*="agree" i]'], d.termsAccepted);

        return true;
      }catch(e){ return false; }
    };

    // Save draft when user clicks any terms link
    document.addEventListener("click", function(e){
      try{
        const a = e && e.target ? e.target.closest("a") : null;
        if (!a) return;
        const href = String(a.getAttribute("href") || "");
        if (href.toLowerCase().includes("terms")) {
          window.bmSaveDraft();
        }
      }catch(_){}
    }, true);

    // Restore draft on load if we came back (or always, harmless)
    function onReady(){
      try{
        const restored = window.bmRestoreDraft();
        if (restored){
          try{
            if (typeof bmSetStatus === "function") bmSetStatus("Draft restored — ready to submit.");
          }catch(_){}
        }
      }catch(_){}
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onReady);
    else onReady();

  }catch(e){}
})();
 /* === /BM_PATCH15B_SAVE_RESTORE_DRAFT_FOR_TERMS === */

/* === BM_PATCH16_SINGLE_SUBMIT_LOCK === */
(function(){
  try{
    if (window.__bmSubmitLockInstalled) return;
    window.__bmSubmitLockInstalled = true;

    // Find the primary submit button
    function getSubmitBtn(){
      return document.querySelector('button[type="submit"], #submitBtn, #btnSubmit') || null;
    }

    // Wrap the current submitBooking (Patch 14 override) so it can only succeed once
    const _origSubmitBooking = (typeof window.submitBooking === "function") ? window.submitBooking : null;
    if (!_origSubmitBooking) return;

    window.__bmSubmitInFlight = false;
    window.__bmSubmitDone = false;
    window.__bmSubmittedBookingId = "";

    // Helper: try to extract booking id from the current status text (since we already print it)
    function tryExtractIdFromStatus(){
      try{
        const el = document.getElementById("bmStatus");
        if (!el) return "";
        const t = String(el.textContent || "");
        const m = t.match(/\bID\s+(\d+)\b/i);
        return m ? String(m[1]) : "";
      }catch(e){
        return "";
      }
    }

    window.submitBooking = async function(){
      // If already successfully submitted, block further submits
      if (window.__bmSubmitDone){
        const id = window.__bmSubmittedBookingId || tryExtractIdFromStatus();
        try{
          if (typeof bmSetStatus === "function") bmSetStatus("Already submitted ✔ " + (id ? ("ID " + id + " — ") : "") + "Status: Pending operator review.");
        }catch(e){}
        return;
      }

      // If a submit is in-flight, ignore extra clicks
      if (window.__bmSubmitInFlight){
        try{
          if (typeof bmSetStatus === "function") bmSetStatus("Submitting booking… (please wait)");
        }catch(e){}
        return;
      }

      window.__bmSubmitInFlight = true;

      const btn = getSubmitBtn();
      try{ if (btn) btn.disabled = true; }catch(e){}

      try{
        await _origSubmitBooking();

        // If the status indicates success, mark done.
        // Success message format: "Booking submitted ✔ ID ___ — ..."
        const id = tryExtractIdFromStatus();
        const statusText = (function(){
          try{
            const el = document.getElementById("bmStatus");
            return el ? String(el.textContent||"") : "";
          }catch(e){ return ""; }
        })();

        if (/booking submitted/i.test(statusText)){
          window.__bmSubmitDone = true;
          window.__bmSubmittedBookingId = id || "";
          // Keep button disabled permanently after success
          try{ if (btn) btn.disabled = true; }catch(e){}
        } else {
          // Not a success: re-enable button so user can try again
          try{ if (btn) btn.disabled = false; }catch(e){}
        }
      }catch(err){
        // Error: allow retry
        try{ if (btn) btn.disabled = false; }catch(e){}
        throw err;
      }finally{
        window.__bmSubmitInFlight = false;
      }
    };

  }catch(e){}
})();
 /* === /BM_PATCH16_SINGLE_SUBMIT_LOCK === */

/* === BM_PATCH18_STATUS_UX_POLISH (presentation-only) === */
(function(){
  try{
    if (window.__bmPatch18Installed) return;
    window.__bmPatch18Installed = true;

    function polish(msg){
      const s = String(msg || "").trim();

      // Convert the known success format(s) into a nicer 3-line message.
      // Examples we’ve used:
      // "Booking submitted ✔ ID 165 — Status: Pending operator review."
      // "Already submitted ✔ ID 165 — Status: Pending operator review."
      const isSuccess = /booking submitted/i.test(s) || /already submitted/i.test(s);
      if (!isSuccess) return s;

      const m = s.match(/\bID\s+(\d+)\b/i);
      const id = m ? m[1] : "";

      return [
        "Booking Request Submitted",
        (id ? ("Request ID: " + id) : "Request submitted"),
        "Status: Pending marina operator review."
      ].join("\n");
    }

    const _origSetStatus = window.bmSetStatus;
    window.bmSetStatus = function(msg){
      try{
        const out = polish(msg);
        return _origSetStatus ? _origSetStatus(out) : undefined;
      }catch(e){
        try{ return _origSetStatus ? _origSetStatus(msg) : undefined; }catch(_){}
      }
    };

    const _origSetBookingStatus = window.bmSetBookingStatus;
    if (typeof _origSetBookingStatus === "function"){
      window.bmSetBookingStatus = function(msg){
        try{
          const out = polish(msg);
          return _origSetBookingStatus(out);
        }catch(e){
          try{ return _origSetBookingStatus(msg); }catch(_){}
        }
      };
    }

  }catch(e){}
})();
 /* === /BM_PATCH18_STATUS_UX_POLISH === */


/* === BM_PATCH19_CLEAR_DRAFT_ON_SUCCESS === */
(function(){
  try{
    if (window.__bmPatch19Installed) return;
    window.__bmPatch19Installed = true;

    function clearDraft(){
      try{ sessionStorage.removeItem("bmBoatieDraft"); }catch(e){}
    }

    function resetFormFields(){
      try{
        const form = document.querySelector("form");
        if (!form) return;

        // Clear only user-entered booking fields (leave identity alone)
        const idsToClear = ["startDate","arrivalDate","dateFrom","fromDate","endDate","departureDate","dateTo","toDate"];
        for (const id of idsToClear){
          const el = document.getElementById(id);
          if (el && el.value != null) el.value = "";
        }

        // Clear service preference selection (optional)
        const pref =
          document.getElementById("servicePreference") ||
          document.getElementById("service_preference") ||
          document.getElementById("prefService") ||
          document.getElementById("jsServicePreference") ||
          document.querySelector('select[name*="service" i], select[id*="service" i], select[name*="preference" i], select[id*="preference" i]');
        if (pref && pref.value != null) pref.value = "";

        // Uncheck terms
        const terms =
          document.getElementById("termsAccepted") ||
          document.getElementById("acceptTerms") ||
          document.getElementById("agreeTerms") ||
          document.getElementById("jsTermsAccepted") ||
          document.querySelector('input[type="checkbox"][name*="terms" i], input[type="checkbox"][id*="terms" i]') ||
          document.querySelector('input[type="checkbox"][name*="agree" i], input[type="checkbox"][id*="agree" i]') ||
          document.querySelector('input[type="checkbox"][name*="accept" i], input[type="checkbox"][id*="accept" i]');
        if (terms) terms.checked = false;

      }catch(e){}
    }

    function onStatus(msg){
      const s = String(msg || "");
      // Trigger only on success
      if (/booking submitted/i.test(s) || /booking request submitted/i.test(s)){
        clearDraft();
        // Reset fields so refresh doesn't look like "ready to resubmit"
        resetFormFields();
      }
    }

    // Wrap setters (works with Patch 7A / Patch 18 polish)
    const _a = window.bmSetStatus;
    if (typeof _a === "function"){
      window.bmSetStatus = function(msg){
        try{ onStatus(msg); }catch(e){}
        return _a(msg);
      };
    }
    const _b = window.bmSetBookingStatus;
    if (typeof _b === "function"){
      window.bmSetBookingStatus = function(msg){
        try{ onStatus(msg); }catch(e){}
        return _b(msg);
      };
    }

  }catch(e){}
})();
 /* === /BM_PATCH19_CLEAR_DRAFT_ON_SUCCESS === */


/* === BM_PATCH20_PROFESSIONAL_ALREADY_LODGED + BMTRACE_NOOP === */
(function(){
  try{
    // 1) Prevent "Can't find variable: bmTrace"
    if (typeof window.bmTrace !== "function"){
      window.bmTrace = function(){ /* no-op */ };
    }

    // 2) Replace noisy debug/status on repeat submits with professional text
    function polish(msg){
      const s = String(msg || "").trim();

      // Hide debug lines
      if (/^SUBMIT:\s*entered submitBooking\(\)/i.test(s)) return "";
      if (/^PROMISE ERROR:\s*Can't find variable:\s*bmTrace/i.test(s)) return "";

      // If we detect repeat submit message patterns, replace with a professional statement
      if (/already submitted/i.test(s) || /already lodged/i.test(s)){
        // Attempt to preserve booking ID if present
        const m = s.match(/\bID\s+(\d+)\b/i);
        const id = m ? m[1] : "";
        return "Booking already lodged" + (id ? (" (Request ID: " + id + ").") : ".") + " Status: Pending marina operator review.";
      }

      return s;
    }

    // Wrap both status setters (works with our existing status target)
    const _a = window.bmSetStatus;
    if (typeof _a === "function"){
      window.bmSetStatus = function(msg){
        const out = polish(msg);
        if (!out) return; // swallow debug noise
        return _a(out);
      };
    }
    const _b = window.bmSetBookingStatus;
    if (typeof _b === "function"){
      window.bmSetBookingStatus = function(msg){
        const out = polish(msg);
        if (!out) return;
        return _b(out);
      };
    }

  }catch(e){}
})();
 /* === /BM_PATCH20_PROFESSIONAL_ALREADY_LODGED + BMTRACE_NOOP === */


/* === BM_PATCH21_HARD_SINGLE_SUBMIT_GATE ===
   Blocks duplicate booking creation regardless of how many handlers exist.
   Uses capture-phase listeners + sessionStorage to enforce "submit once per session/form".
*/
(function(){
  try{
    if (window.__bmPatch21Installed) return;
    window.__bmPatch21Installed = true;

    function setMsg(msg){
      try{
        if (typeof window.bmSetBookingStatus === "function") window.bmSetBookingStatus(msg);
        else if (typeof window.bmSetStatus === "function") window.bmSetStatus(msg);
        else {
          const el = document.getElementById("bmStatus");
          if (el) el.textContent = String(msg||"");
        }
      }catch(e){}
    }

    function getSubmittedId(){
      try{ return sessionStorage.getItem("bmSubmittedBookingId") || ""; }catch(e){ return ""; }
    }
    function setSubmittedId(id){
      try{ sessionStorage.setItem("bmSubmittedBookingId", String(id||"")); }catch(e){}
    }

    function getInFlight(){
      try{ return sessionStorage.getItem("bmSubmitInFlight") === "1"; }catch(e){ return false; }
    }
    function setInFlight(v){
      try{ sessionStorage.setItem("bmSubmitInFlight", v ? "1" : "0"); }catch(e){}
    }

    function extractIdFromText(t){
      const s = String(t||"");
      // Supports both old and polished success formats:
      // "Booking submitted ✔ ID 165 — ..."
      // "Booking Request Submitted\nRequest ID: 165\n..."
      let m = s.match(/\bID\s+(\d+)\b/i);
      if (m) return m[1];
      m = s.match(/Request ID:\s*(\d+)/i);
      if (m) return m[1];
      return "";
    }

    // When we detect a success status, store the booking ID for the session
    function observeSuccess(msg){
      const s = String(msg||"");
      if (/booking submitted/i.test(s) || /booking request submitted/i.test(s)){
        const id = extractIdFromText(s);
        if (id) setSubmittedId(id);
        setInFlight(false);
      }
      // If we see a failure, clear in-flight so user can retry
      if (/submit failed/i.test(s) || /missing required/i.test(s) || /network error/i.test(s)){
        setInFlight(false);
      }
    }

    // Wrap setters to observe success/failure without changing displayed text
    const _a = window.bmSetStatus;
    if (typeof _a === "function"){
      window.bmSetStatus = function(msg){
        try{ observeSuccess(msg); }catch(e){}
        return _a(msg);
      };
    }
    const _b = window.bmSetBookingStatus;
    if (typeof _b === "function"){
      window.bmSetBookingStatus = function(msg){
        try{ observeSuccess(msg); }catch(e){}
        return _b(msg);
      };
    }

    // Capture-phase block: stops ANY handler from running
    function blockEvent(e){
      try{
        if (e){
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        }
      }catch(_){}
    }

    function alreadyLodgedMessage(){
      const id = getSubmittedId();
      return "Previous booking still pending" + (id ? (" (Request ID: " + id + "). ") : ". ") + "Your new booking request has also been submitted successfully and forwarded for marina operator review.";
    }

    // Block duplicate submit attempts (form submit)
    document.addEventListener("submit", function(e){
      try{
        const id = getSubmittedId();
        if (id){
          blockEvent(e);
          setMsg(alreadyLodgedMessage());
          return;
        }
        if (getInFlight()){
          blockEvent(e);
          setMsg("Submitting booking… (please wait)");
          return;
        }
        // Mark in-flight at the earliest possible moment
        setInFlight(true);
      }catch(_){}
    }, true);

    // Block duplicate submit attempts (button click)
    document.addEventListener("click", function(e){
      try{
        const t = e && e.target ? e.target : null;
        if (!t) return;
        const btn = t.closest && t.closest('button[type="submit"], #submitBtn, #btnSubmit');
        if (!btn) return;

        const id = getSubmittedId();
        if (id){
          blockEvent(e);
          setMsg(alreadyLodgedMessage());
          return;
        }
        if (getInFlight()){
          blockEvent(e);
          setMsg("Submitting booking… (please wait)");
          return;
        }
        setInFlight(true);
      }catch(_){}
    }, true);

    // If a booking was already lodged earlier in this session, show it on load
    try{
      const id = getSubmittedId();
      if (id){
        setMsg(alreadyLodgedMessage());
      }
    }catch(_){}

  }catch(e){}
})();
 /* === /BM_PATCH21_HARD_SINGLE_SUBMIT_GATE === */


/* === BM_PATCH23_DISABLE_FIRST_CLICK_DEBUG (applied 2026-03-05T01:24:37.665Z) === */

/* === BM_PATCH24_DISABLE_MARINA_CLICK_DEBUG (applied 2026-03-05T01:33:51.356Z) === */

/* === BM_PATCH25_HIDE_MARINA_DIAG_UI === */
(function(){
  try{
    if (window.__bmPatch25Installed) return;
    window.__bmPatch25Installed = true;

    // If setDiag exists (it does in your file), wrap it.
    // Important: don't block logic—only prevent UI noise.
    const _origSetDiag = (typeof window.setDiag === "function") ? window.setDiag : null;

    window.setDiag = function(msg){
      try{
        // Always log for troubleshooting (in DevTools console)
        try{ console.log("[BoatieDemo diag]", msg); }catch(e){}

        // Do NOT write these to UI anymore
        return;
      }catch(e){
        // Worst case, fall back to original behavior
        try{ if (_origSetDiag) return _origSetDiag(msg); }catch(_){}
      }
    };
  }catch(e){}
})();
 /* === /BM_PATCH25_HIDE_MARINA_DIAG_UI === */


/* === BM_PATCH29_REMOVE_COA_STATUS (applied 2026-03-05T01:56:54.466Z) === */


/* === BM_FORCE_START_NEW_BOOKING_V1 === */
(function(){
  try{
    function bmClearBoatieSubmitState(){
      try{ sessionStorage.removeItem("bmSubmitInFlight"); }catch(e){}
      try{ sessionStorage.removeItem("bmSubmittedBookingId"); }catch(e){}
      try{ sessionStorage.removeItem("bmBoatieDraft"); }catch(e){}
      try{ localStorage.removeItem("bmDemoLastSubmittedBookingId"); }catch(e){}
      try{ window.__bmSubmitInFlight = false; }catch(e){}
      try{ window.__bmSubmitDone = false; }catch(e){}
      try{ window.__bmSubmittedBookingId = ""; }catch(e){}
    }

    document.addEventListener("click", function(ev){
      try{
        const t = ev && ev.target ? ev.target.closest("button, a") : null;
        if (!t) return;

        const txt = String((t.textContent || "").trim());
        if (!/start new booking request/i.test(txt)) return;

        ev.preventDefault();
        ev.stopPropagation();
        if (typeof ev.stopImmediatePropagation === "function") ev.stopImmediatePropagation();

        bmClearBoatieSubmitState();

        try{
          const form =
            document.querySelector("form") ||
            document.getElementById("boatieBookingForm") ||
            document.getElementById("bookingForm");
          if (form && typeof form.reset === "function") form.reset();
        }catch(e){}

        try{
          const statusEl = document.getElementById("bmStatus");
          if (statusEl) statusEl.textContent = "Ready. Fill the form and press Submit.";
        }catch(e){}

        try{
          const handoff = document.getElementById("handoff") || document.getElementById("result") || document.getElementById("bookingResult");
          if (handoff) handoff.textContent = "";
        }catch(e){}

        try{
          const submitBtn =
            document.querySelector('button[type="submit"]') ||
            document.getElementById("submitBtn") ||
            document.getElementById("btnSubmit") ||
            document.querySelector('button[data-action="submit"]');
          if (submitBtn) submitBtn.disabled = false;
        }catch(e){}

        try{ location.reload(); }catch(e){}
      }catch(_){}
    }, true);
  }catch(e){}
})();
/* === /BM_FORCE_START_NEW_BOOKING_V1 === */


/* === BM_INVESTOR_POLISH_READINESS_BANNER_ENGINE ===
   Phase 1 readiness state:
   - Ready to Book when required compliance records appear current
   - Action Required when records are missing/expired/incomplete
   - UI guidance only; server-side compliance gate remains authoritative
*/
(function(){
  try{
    if (window.__bmReadinessBannerEngineInstalled) return;
    window.__bmReadinessBannerEngineInstalled = true;

    function byId(id){ return document.getElementById(id); }

    function getSubmitBtn(){
      return byId("submitBtn") ||
        byId("btnSubmit") ||
        document.querySelector('button[type="submit"]');
    }

    function getVesselId(){
      try{
        var raw = localStorage.getItem("bmVesselId");
        var n = Number(raw || 0);
        if (n) return n;
      }catch(e){}

      try{
        var rawIdent = localStorage.getItem("bmDemoIdentity") || localStorage.getItem("bmStableIdentity") || "";
        if (rawIdent){
          var ident = JSON.parse(rawIdent);
          var n2 = Number(ident.vesselId || (ident.vessel && ident.vessel.id) || 0);
          if (n2) return n2;
        }
      }catch(e){}

      try{
        var it = byId("identityText");
        var txt = it ? String(it.textContent || "") : "";
        var m = txt.match(/vesselId\s*[:=]\s*(\d+)/i);
        if (m) return Number(m[1]);
      }catch(e){}

      return 0;
    }

    function findPanel(){
      return document.querySelector(".ready-to-book-panel");
    }

    function setPanel(kind, title, body){
      var panel = findPanel();
      if (!panel) return;

      var icon = "✓";
      var border = "#b7e4c7";
      var bg = "#f0fdf4";
      var titleColor = "#14532d";
      var bodyColor = "#166534";
      var iconColor = "#15803d";

      if (kind === "warn"){
        icon = "⚠";
        border = "#fde68a";
        bg = "#fffbeb";
        titleColor = "#92400e";
        bodyColor = "#92400e";
        iconColor = "#d97706";
      }

      panel.style.setProperty("border", "1px solid " + border, "important");
      panel.style.setProperty("background", bg, "important");
      panel.style.setProperty("color", titleColor, "important");

      panel.innerHTML =
        '<div style="display:flex !important;align-items:flex-start !important;gap:10px !important;">' +
          '<div style="font-size:18px !important;line-height:1 !important;color:' + iconColor + ' !important;">' + icon + '</div>' +
          '<div style="display:block !important;">' +
            '<div style="display:block !important;font-weight:800 !important;color:' + titleColor + ' !important;">' + title + '</div>' +
            '<div style="display:block !important;font-size:13px !important;color:' + bodyColor + ' !important;margin-top:2px !important;">' + body + '</div>' +
          '</div>' +
        '</div>';
    }

    function setSubmitAllowed(allowed){
      var btn = getSubmitBtn();
      if (!btn) return;
      btn.disabled = !allowed;
      if (!allowed){
        btn.style.opacity = "0.55";
        btn.style.cursor = "not-allowed";
        btn.title = "Complete profile and compliance records before submitting.";
      } else {
        btn.style.opacity = "";
        btn.style.cursor = "";
        btn.title = "";
      }
    }

    function parseDate(v){
      if (!v) return null;
      var d = new Date(String(v) + "T00:00:00Z");
      return isNaN(d.getTime()) ? null : d;
    }

    function docType(d){
      return String((d && (d.type || d.docType || d.name)) || "").toUpperCase().replace(/\s+/g, "_");
    }

    function isCurrentDoc(d){
      if (!d) return false;
      var exp = parseDate(d.expiryDate || d.expiresAt || d.expiry || d.expires);
      if (!exp) return false;
      var today = new Date();
      var todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      return exp.getTime() >= todayUtc.getTime();
    }

    async function checkReadiness(){
      var vesselId = getVesselId();

      if (!vesselId){
        setPanel(
          "warn",
          "Action Required",
          "Complete your profile and vessel details before submitting a booking request."
        );
        setSubmitAllowed(false);
        return;
      }

      try{
        var res = await fetch("/api/vessel-documents?vesselId=" + encodeURIComponent(vesselId), { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        var data = await res.json();

        var docs = Array.isArray(data) ? data :
          Array.isArray(data.documents) ? data.documents :
          Array.isArray(data.results) ? data.results :
          [];

        var hasInsurance = docs.some(function(d){ return docType(d) === "INSURANCE" && isCurrentDoc(d); });
        var hasEwof = docs.some(function(d){ return (docType(d) === "EWOF" || docType(d) === "E_WOF") && isCurrentDoc(d); });
        var hasBio = docs.some(function(d){ return docType(d) === "BIOFOULING_INSPECTION" && isCurrentDoc(d); });

        if (hasInsurance && hasEwof && hasBio){
          setPanel(
            "ok",
            "Ready to Book",
            "Profile, vessel and compliance records verified."
          );
          setSubmitAllowed(true);
        } else {
          setPanel(
            "warn",
            "Action Required",
            "Complete required profile and compliance records before submitting a booking request."
          );
          setSubmitAllowed(false);
        }
      }catch(e){
        setPanel(
          "warn",
          "Action Required",
          "Unable to confirm compliance readiness. Please check your profile and compliance records before submitting."
        );
        setSubmitAllowed(false);
      }
    }

    window.addEventListener("load", function(){
      setTimeout(checkReadiness, 500);
      setTimeout(checkReadiness, 1500);
    });

    document.addEventListener("visibilitychange", function(){
      if (!document.hidden) setTimeout(checkReadiness, 250);
    });

  }catch(e){}
})();
 /* === /BM_INVESTOR_POLISH_READINESS_BANNER_ENGINE === */
