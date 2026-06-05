function $(id) {
    return document.getElementById(id);
  }
  
  const PROFILE_OWNER_ID_KEY = "bmOwnerId";
const PROFILE_VESSEL_ID_KEY = "bmVesselId";

function getStoredOwnerId(){ return Number(localStorage.getItem(PROFILE_OWNER_ID_KEY) || 0) || null; }
function getStoredVesselId(){ return Number(localStorage.getItem(PROFILE_VESSEL_ID_KEY) || 0) || null; }
function storeOwnerId(id){ if(id) localStorage.setItem(PROFILE_OWNER_ID_KEY, String(id)); }
function storeVesselId(id){ if(id) localStorage.setItem(PROFILE_VESSEL_ID_KEY, String(id)); }

function apiBase() {
    const raw = ($('apiBase') && $('apiBase').value ? $('apiBase').value : '').replace(/\/$/, '');
    if (raw.includes('127.0.0.1') && window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'localhost') {
      return window.location.origin;
    }
    return raw || window.location.origin;
  }
  
  function showStatus(kind, msg) {
    const el = $('status');
    el.style.display = 'block';
    el.className = 'status ' + (kind || 'ok');
    el.textContent = msg;
  }
  
  async function fetchJson(url, options) {
    const res = await fetch(url, options);
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  
    if (!res.ok) {
      const message = (data && (data.message || data.error)) ? (data.message || data.error) : `HTTP ${res.status}`;
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }
  
  function setInsuranceFieldVisibility() {
    const type = $('doc_type').value;
    $('insuranceFields').style.display = (type === 'INSURANCE') ? 'block' : 'none';
  }
  
  function formatMeta(obj) {
    if (!obj) return '';
    const parts = [];
    return parts.join(' | ');
  }
  
  /**
   * Date handling (NZ/AU-friendly input, ISO storage)
   *
   * Accepts:
   *  - DD/MM/YYYY
   *  - DD-MM-YYYY
   *  - YYYY-MM-DD
   *  - YYYY/MM/DD
   * Returns ISO YYYY-MM-DD or '' (empty) if blank.
   * Throws Error if invalid.
   */
  function formatNzDate(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "";
    const parts = iso.split("-");
    return parts[2] + "-" + parts[1] + "-" + parts[0];
  }

  function toIsoDate(input, labelForErrors) {
    const raw = (input || '').trim();
    if (!raw) return '';
  
    // Normalize separators to '-'
    const s = raw.replaceAll('/', '-');
  
    // ISO already?
    const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (isoMatch) {
      const yyyy = Number(isoMatch[1]);
      const mm = Number(isoMatch[2]);
      const dd = Number(isoMatch[3]);
      return validateAndFormatIso(yyyy, mm, dd, labelForErrors);
    }
  
    // NZ/AU: DD-MM-YYYY
    const dmyMatch = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(s);
    if (dmyMatch) {
      const dd = Number(dmyMatch[1]);
      const mm = Number(dmyMatch[2]);
      const yyyy = Number(dmyMatch[3]);
      return validateAndFormatIso(yyyy, mm, dd, labelForErrors);
    }
  
    throw new Error(`${labelForErrors || 'Date'} must be in DD/MM/YYYY or YYYY-MM-DD format.`);
  }
  
  function validateAndFormatIso(yyyy, mm, dd, labelForErrors) {
    if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) {
      throw new Error(`${labelForErrors || 'Date'} is invalid.`);
    }
    if (yyyy < 1900 || yyyy > 2100) {
      throw new Error(`${labelForErrors || 'Date'} year looks invalid.`);
    }
    if (mm < 1 || mm > 12) {
      throw new Error(`${labelForErrors || 'Date'} month must be 1–12.`);
    }
    if (dd < 1 || dd > 31) {
      throw new Error(`${labelForErrors || 'Date'} day must be 1–31.`);
    }
  
    // Validate real calendar date
    const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
    const same =
      dt.getUTCFullYear() === yyyy &&
      (dt.getUTCMonth() + 1) === mm &&
      dt.getUTCDate() === dd;
  
    if (!same) {
      throw new Error(`${labelForErrors || 'Date'} is not a real calendar date.`);
    }
  
    const iso = `${String(yyyy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    return iso;
  }
  
  function renderDocs(docs) {
    const body = $('docsBody');
    body.innerHTML = '';
  
    if (!docs || docs.length === 0) {
      body.innerHTML = `<tr><td colspan="7" class="muted">No documents saved yet.</td></tr>`;
      return;
    }
  
    for (const d of docs) {
      const cov = d.coverageAmountNZD ? String(d.coverageAmountNZD) : '';
      const evidence = d.file && d.file.url
        ? `<a href="${d.file.url}" target="_blank" rel="noopener">View Document</a>`
        : '<span class="muted small">No file</span>';
      const uploadLabel = d.file ? 'Replace Evidence' : 'Upload Evidence';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${d.id}</td>
        <td>${d.type}</td>
        <td>${formatNzDate(d.issueDate)}</td>
        <td>${formatNzDate(d.expiryDate)}</td>
        <td>${cov}</td>
        <td>${evidence}</td>
        <td>
          <input type="file" data-file="${d.id}" accept=".pdf,.png,.jpg,.jpeg,image/*,application/pdf" />
          <button data-upload="${d.id}">${uploadLabel}</button>
          <button data-del="${d.id}">Delete</button>
        </td>
      `;
      body.appendChild(tr);
    }
  
    // Wire upload buttons
    body.querySelectorAll('button[data-upload]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-upload');

        const input = body.querySelector(`input[data-file="${id}"]`);

        if (!input || !input.files || !input.files[0]) {
          alert('Choose a file first.');
          return;
        }

        const formData = new FormData();
        formData.append('documentFile', input.files[0]);

        try {
          const result = await fetchJson(`${apiBase()}/api/vessel-documents/${id}/file`, {
            method: 'POST',
            body: formData
          });

          showStatus('ok', 'Evidence uploaded.' + (result && result.file && result.file.url ? ' File: ' + result.file.url : ''));
          await reloadAll();
        } catch (err) {
          showStatus('error', 'Evidence upload failed: ' + (err && err.message ? err.message : String(err)));
          alert('Evidence upload failed: ' + (err && err.message ? err.message : String(err)));
        }
      });
    });

    // Wire delete buttons
    body.querySelectorAll('button[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-del');
        if (!confirm(`Delete document ${id}?`)) return;
        await deleteDoc(Number(id));
        await reloadAll();
      });
    });
  }
  
  async function loadOwner() {
    const url = `${apiBase()}/api/owner`;
    const owner = await fetchJson(url);
    $('owner_fullName').value = owner.fullName || '';
    $('owner_email').value = owner.email || '';
    $('owner_phone').value = owner.phone || '';
    $('owner_addressLine1').value = owner.addressLine1 || '';
    $('owner_addressLine2').value = owner.addressLine2 || '';
    $('owner_city').value = owner.city || '';
    $('owner_region').value = owner.region || 'Auckland';
    $('owner_postcode').value = owner.postcode || '';
    $('owner_emergencyName').value = owner.emergencyContactName || '';
    $('owner_emergencyPhone').value = owner.emergencyContactPhone || '';
    storeOwnerId(owner.id);
    $('ownerMeta').textContent = formatMeta(owner);
    return owner;
  }
  
  async function saveOwner() {
    const url = `${apiBase()}/api/owner`;
    const payload = {
      id: getStoredOwnerId(),
      fullName: $('owner_fullName').value,
      email: $('owner_email').value,
      phone: $('owner_phone').value,
      addressLine1: $('owner_addressLine1').value,
      addressLine2: $('owner_addressLine2').value,
      city: $('owner_city').value,
      region: $('owner_region').value,
      postcode: $('owner_postcode').value,
      emergencyContactName: $('owner_emergencyName').value,
      emergencyContactPhone: $('owner_emergencyPhone').value
    };
  
    const owner = await fetchJson(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  
    storeOwnerId(owner.id);
    $('ownerMeta').textContent = formatMeta(owner);
    showStatus('ok', 'Boatie profile saved. Owner ID = ' + owner.id);
  }
  
  async function loadVessel() {
    const url = `${apiBase()}/api/vessel`;
    const v = await fetchJson(url);
    $('vessel_name').value = v.name || '';
    $('vessel_type').value = v.type || '';
    $('vessel_make').value = v.make || '';
    $('vessel_model').value = v.model || '';
    $('vessel_reg').value = v.registrationNumber || '';
    $('vessel_homePort').value = v.homePort || '';
    $('vessel_loa').value = (v.lengthOverallM ?? '') === null ? '' : (v.lengthOverallM ?? '');
    $('vessel_maxInc').value = (v.maxInclusiveLengthM ?? '') === null ? '' : (v.maxInclusiveLengthM ?? '');
    $('vessel_beam').value = (v.beamM ?? '') === null ? '' : (v.beamM ?? '');
    $('vessel_draft').value = (v.draftM ?? '') === null ? '' : (v.draftM ?? '');
    $('vessel_shorePower').checked = Boolean(v.hasShorePower);
    $('vessel_notes').value = v.notes || '';
    storeVesselId(v.id);
    $('vesselMeta').textContent = formatMeta(v);
    return v;
  }
  
  async function saveVessel() {
    const url = `${apiBase()}/api/vessel`;
  
    const payload = {
      id: getStoredVesselId(),
      ownerId: getStoredOwnerId(),
      name: $('vessel_name').value,
      type: $('vessel_type').value,
      make: $('vessel_make').value,
      model: $('vessel_model').value,
      registrationNumber: $('vessel_reg').value,
      homePort: $('vessel_homePort').value,
      lengthOverallM: $('vessel_loa').value ? Number($('vessel_loa').value) : null,
      maxInclusiveLengthM: $('vessel_maxInc').value ? Number($('vessel_maxInc').value) : null,
      beamM: $('vessel_beam').value ? Number($('vessel_beam').value) : null,
      draftM: $('vessel_draft').value ? Number($('vessel_draft').value) : null,
      hasShorePower: $('vessel_shorePower').checked,
      notes: $('vessel_notes').value
    };
  
    const v = await fetchJson(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  
    storeVesselId(v.id);
    $('vesselMeta').textContent = formatMeta(v);
    showStatus('ok', 'Vessel details saved. Vessel ID = ' + v.id);
  }
  
  async function loadDocs() {
    const url = `${apiBase()}/api/vessel-documents`;
    return await fetchJson(url);
  }
  
  async function addDoc() {
    const type = $('doc_type').value;
    const issuer = $('doc_issuer').value.trim();

    const issueDateIso = toIsoDate($('doc_issueDate').value.trim(), 'Issue Date');
    const expiryDateIso = toIsoDate($('doc_expiryDate').value.trim(), 'Expiry Date');

    if (!issueDateIso) throw new Error('Issue Date is required.');
    if (!expiryDateIso) throw new Error('Expiry Date is required.');
    if (expiryDateIso < issueDateIso) throw new Error('Expiry Date cannot be before Issue Date.');

    let activeVesselId = getStoredVesselId();
    if (!activeVesselId) {
      const activeVessel = await fetchJson(`${apiBase()}/api/vessel`);
      activeVesselId = activeVessel && activeVessel.id;
      storeVesselId(activeVesselId);
    }

    const formData = new FormData();
    formData.append('vesselId', String(activeVesselId || ''));
    formData.append('type', type);
    formData.append('issuer', issuer);
    formData.append('issueDate', issueDateIso);
    formData.append('expiryDate', expiryDateIso);

    if (type === 'INSURANCE') {
      const coverage = Number($('doc_coverage').value || 0);
      if (!coverage) {
        throw new Error('For INSURANCE, Coverage Amount NZD is required.');
      }
      formData.append('policyNumber', $('doc_policyNumber').value.trim());
      formData.append('coverageAmountNZD', String(coverage));
    }

    const url = `${apiBase()}/api/vessel-documents`;
    await fetchJson(url, {
      method: 'POST',
      body: formData
    });

    $('doc_issuer').value = '';
    $('doc_issueDate').value = '';
    $('doc_expiryDate').value = '';
    $('doc_policyNumber').value = '';
    $('doc_coverage').value = '';


    showStatus('ok', 'Document added.');
  }

  async function deleteDoc(id) {
    const url = `${apiBase()}/api/vessel-documents/${id}`;
    await fetchJson(url, { method: 'DELETE' });
    showStatus('ok', `Document ${id} deleted.`);
  }
  
  async function testPack() {
    const bookingId = Number($('test_bookingId').value || 0);
    if (!bookingId) throw new Error('Enter a valid Booking ID');
  
    const url = `${apiBase()}/api/bookings/${bookingId}/application-pack`;
    const pack = await fetchJson(url);
    $('packOutput').textContent = JSON.stringify(pack, null, 2);
    showStatus('ok', 'Application Pack loaded.');
  }
  
  function renderReadiness(owner, vessel, docs) {
    const panels = [
      document.getElementById("readinessPanel"),
      document.getElementById("complianceStatusPanel")
    ].filter(Boolean);

    if (!panels.length) return;

    function updatePanels(className, html) {
      panels.forEach(function (panel) {
        panel.className = className;
        panel.innerHTML = html;
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    function normaliseType(value) {
      return String(value || "").trim().toUpperCase();
    }

    function docFor(type) {
      return (docs || []).find(d => normaliseType(d.type) === type);
    }

    function hasEvidence(doc) {
      return !!(doc && doc.file && doc.file.url);
    }

    function isExpired(doc) {
      if (!doc || !doc.expiryDate) return false;
      const expiry = new Date(doc.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      return expiry < today;
    }

    function isExpiringSoon(doc) {
      if (!doc || !doc.expiryDate || isExpired(doc)) return false;
      const expiry = new Date(doc.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      const days = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      return days <= 30;
    }

    const hasOwner = !!(owner && owner.id && owner.fullName && owner.email);
    const hasVessel = !!(vessel && vessel.id && vessel.name);
    const usesShorePower = !!(vessel && vessel.hasShorePower);

    const requirements = [
      { label: "Boatie profile details", ok: hasOwner },
      { label: "Vessel details", ok: hasVessel },
      { label: "Insurance", doc: docFor("INSURANCE") },
      { label: "EWOF", doc: docFor("EWOF") },
      { label: "Biofouling Inspection", doc: docFor("BIOFOULING_INSPECTION") }
    ];

    if (usesShorePower) {
      requirements.push({
        label: "Shore Power Lead Test Tag",
        doc: docFor("SHORE_POWER_LEAD_TEST"),
        note: "Required because this vessel uses shore power."
      });
    }

    const missing = [];
    const expired = [];
    const warnings = [];

    requirements.forEach(req => {
      if (req.ok === true) return;

      if (!req.doc) {
        missing.push(req.label + (req.note ? " — " + req.note : ""));
        return;
      }

      if (!hasEvidence(req.doc)) {
        missing.push(req.label + " evidence file" + (req.note ? " — " + req.note : ""));
        return;
      }

      if (isExpired(req.doc)) {
        expired.push(req.label + " expired on " + req.doc.expiryDate);
        return;
      }

      if (isExpiringSoon(req.doc)) {
        warnings.push(req.label + " expires soon on " + req.doc.expiryDate);
      }
    });

    if (missing.length === 0 && expired.length === 0) {
      updatePanels(
        warnings.length ? "status warn" : "status ok",
        (warnings.length ? "⚠ READY TO BOOK — CHECK EXPIRIES" : "✓ READY TO BOOK") +
        "<br><span class='muted'>Owner, vessel and required compliance records are complete.</span>" +
        (warnings.length ? "<br>" + warnings.map(x => "• " + x).join("<br>") : "")
      );
      return;
    }

      updatePanels(
        "status warn",
        "⚠ NOT READY TO BOOK<br>" +
        "<span class='muted'>Complete the following before requesting a booking:</span><br>" +
        missing.map(x => "• Missing: " + x).concat(expired.map(x => "• Expired: " + x)).join("<br>")
      );
  }

  async function reloadAll() {
    const owner = await loadOwner();
    const v = await loadVessel();
    const docs = await loadDocs();
    const activeVesselId = v && v.id ? Number(v.id) : getStoredVesselId();
    const scopedDocs = (docs || []).filter(d => !activeVesselId || Number(d.vesselId) === Number(activeVesselId));
    renderDocs(scopedDocs);
    renderReadiness(owner, v, scopedDocs);
    setInsuranceFieldVisibility();
    try{
      const statusEl = $('status');
      if (statusEl && !statusEl.textContent.trim()) statusEl.style.display = 'none';
    }catch(e){}
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    $('doc_type').addEventListener('change', setInsuranceFieldVisibility);
    $('btnReloadAll').addEventListener('click', () => reloadAll().catch(err => showStatus('bad', err.message)));
    $('btnSaveOwner').addEventListener('click', async (e) => {
      e.preventDefault();
      showStatus('ok', 'Saving boatie profile...');
      try {
        await saveOwner();
      } catch (err) {
        showStatus('bad', err.message);
      }
    });

    $('btnSaveVessel').addEventListener('click', async (e) => {
      e.preventDefault();
      showStatus('ok', 'Saving vessel details...');
      try {
        await saveVessel();
      } catch (err) {
        showStatus('bad', err.message);
      }
    });
    $('btnAddDoc').addEventListener('click', async () => {
      try {
        await addDoc();
        await reloadAll();
      } catch (err) {
        showStatus('bad', err.message);
      }
    });
    const btnTestPack = $('btnTestPack');
    if (btnTestPack) {
      btnTestPack.addEventListener('click', () => testPack().catch(err => showStatus('bad', err.message)));
    }
  
    reloadAll().catch(err => showStatus('bad', err.message));
  });

// BM_TEMP_DIRECT_SAVE_TEST
window.addEventListener("load", function(){
  var status = document.getElementById("status");
  if (status) {
    status.style.display = "block";
    status.className = "status ok";
    status.textContent = "Profile script loaded.";
  }

  var ownerBtn = document.getElementById("btnSaveOwner");
  if (ownerBtn) {
    ownerBtn.onclick = async function(e){
      e.preventDefault();
      var status = document.getElementById("status");
      if (status) {
        status.style.display = "block";
        status.className = "status ok";
        status.textContent = "Direct owner save test running...";
      }
      try {
        var res = await fetch("/api/owner", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: document.getElementById("owner_fullName").value,
            email: document.getElementById("owner_email").value,
            phone: document.getElementById("owner_phone").value,
            region: document.getElementById("owner_region").value,
            city: document.getElementById("owner_city").value
          })
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || ("HTTP " + res.status));
        localStorage.setItem("bmOwnerId", String(data.id));
        if (status) status.textContent = "Direct owner save OK. Owner ID = " + data.id;
      } catch (err) {
        if (status) {
          status.className = "status bad";
          status.textContent = "Direct owner save failed: " + err.message;
        }
      }
    };
  }

  var vesselBtn = document.getElementById("btnSaveVessel");
  if (vesselBtn) {
    vesselBtn.onclick = async function(e){
      e.preventDefault();
      var status = document.getElementById("status");
      if (status) {
        status.style.display = "block";
        status.className = "status ok";
        status.textContent = "Direct vessel save test running...";
      }
      try {
        var res = await fetch("/api/vessel", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerId: Number(localStorage.getItem("bmOwnerId") || 0) || null,
            name: document.getElementById("vessel_name").value,
            type: document.getElementById("vessel_type").value,
            make: document.getElementById("vessel_make").value,
            model: document.getElementById("vessel_model").value,
            registrationNumber: document.getElementById("vessel_reg").value,
            homePort: document.getElementById("vessel_homePort").value,
            lengthOverallM: document.getElementById("vessel_loa").value ? Number(document.getElementById("vessel_loa").value) : null,
            maxInclusiveLengthM: document.getElementById("vessel_maxInc").value ? Number(document.getElementById("vessel_maxInc").value) : null,
            beamM: document.getElementById("vessel_beam").value ? Number(document.getElementById("vessel_beam").value) : null,
            draftM: document.getElementById("vessel_draft").value ? Number(document.getElementById("vessel_draft").value) : null,
            hasShorePower: document.getElementById("vessel_shorePower").checked,
            notes: document.getElementById("vessel_notes").value
          })
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || ("HTTP " + res.status));
        localStorage.setItem("bmVesselId", String(data.id));
        if (status) status.textContent = "Direct vessel save OK. Vessel ID = " + data.id;
      } catch (err) {
        if (status) {
          status.className = "status bad";
          status.textContent = "Direct vessel save failed: " + err.message;
        }
      }
    };
  }
});

/* BM_FINAL_DIRECT_SAVE_HANDLERS
   Final recovery layer: bypasses legacy Profile save-handler conflicts.
*/
(function(){
  function setText(id, text){
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function getValue(id){
    var el = document.getElementById(id);
    return el ? el.value : "";
  }

  async function bmSaveOwnerDirect(){
    var btn = document.getElementById("btnSaveOwner");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Saving Owner...";
    }

    setText("status", "Saving owner profile...");

    try {
      var payload = {
        firstName: getValue("owner_firstName"),
        lastName: getValue("owner_lastName"),
        email: getValue("owner_email"),
        phone: getValue("owner_phone")
      };

      var res = await fetch("/api/owner", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      });

      var data = await res.json().catch(function(){ return {}; });

      if (!res.ok) {
        throw new Error(data.error || data.message || ("HTTP " + res.status));
      }

      var owner = data.owner || data;
      var ownerId = owner.id || data.ownerId || data.id;

      if (ownerId) {
        window.BM_OWNER_ID = ownerId;
        setText("ownerId", ownerId);
      }

      setText("status", "Owner saved successfully" + (ownerId ? " — Owner ID " + ownerId : "") + ".");
      if (btn) btn.textContent = "Owner Saved ✔";
    } catch (err) {
      console.error("BM owner direct save failed:", err);
      setText("status", "Owner save failed: " + err.message);
      if (btn) btn.textContent = "Save Owner";
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function bmSaveVesselDirect(){
    var btn = document.getElementById("btnSaveVessel");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Saving Vessel...";
    }

    setText("status", "Saving vessel details...");

    try {
      var ownerId = window.BM_OWNER_ID || getValue("ownerId") || document.getElementById("ownerId")?.textContent;

      var payload = {
        ownerId: Number(ownerId) || undefined,
        name: getValue("vessel_name"),
        vesselName: getValue("vessel_name"),
        type: getValue("vessel_type"),
        lengthM: Number(getValue("vessel_length")) || undefined,
        beamM: Number(getValue("vessel_beam")) || undefined,
        draftM: Number(getValue("vessel_draft")) || undefined,
        shorePower: !!document.getElementById("vessel_shorePower")?.checked,
        notes: getValue("vessel_notes")
      };

      var res = await fetch("/api/vessel", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      });

      var data = await res.json().catch(function(){ return {}; });

      if (!res.ok) {
        throw new Error(data.error || data.message || ("HTTP " + res.status));
      }

      var vessel = data.vessel || data;
      var vesselId = vessel.id || data.vesselId || data.id;

      if (vesselId) {
        window.BM_VESSEL_ID = vesselId;
        setText("vesselId", vesselId);
      }

      setText("status", "Vessel saved successfully" + (vesselId ? " — Vessel ID " + vesselId : "") + ".");
      if (btn) btn.textContent = "Vessel Saved ✔";
    } catch (err) {
      console.error("BM vessel direct save failed:", err);
      setText("status", "Vessel save failed: " + err.message);
      if (btn) btn.textContent = "Save Vessel";
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function install(){
    var ownerBtn = document.getElementById("btnSaveOwner");
    var vesselBtn = document.getElementById("btnSaveVessel");

    if (ownerBtn) ownerBtn.onclick = bmSaveOwnerDirect;
    if (vesselBtn) vesselBtn.onclick = bmSaveVesselDirect;

    console.log("BM_FINAL_DIRECT_SAVE_HANDLERS installed", {
      ownerButton: !!ownerBtn,
      vesselButton: !!vesselBtn
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
})();
