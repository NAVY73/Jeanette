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
      body.innerHTML = `<tr><td colspan="6" class="muted">No documents saved yet.</td></tr>`;
      return;
    }
  
    for (const d of docs) {
      const cov = d.coverageAmountNZD ? String(d.coverageAmountNZD) : '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${d.id}</td>
        <td>${d.type}</td>
        <td>${formatNzDate(d.issueDate)}</td>
        <td>${formatNzDate(d.expiryDate)}</td>
        <td>${cov}</td>
        <td><button data-del="${d.id}">Delete</button></td>
      `;
      body.appendChild(tr);
    }
  
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
  
    $('ownerMeta').textContent = formatMeta(owner);
    showStatus('ok', 'Boatie profile saved.');
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
  
    $('vesselMeta').textContent = formatMeta(v);
    showStatus('ok', 'Vessel details saved.');
  }
  
  async function loadDocs() {
    const url = `${apiBase()}/api/vessel-documents`;
    return await fetchJson(url);
  }
  
  async function addDoc() {
    const type = $('doc_type').value;
    const issuer = $('doc_issuer').value.trim();
  
    // Accept NZ/AU input but store ISO
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

    const payload = {
      vesselId: activeVesselId,
      type,
      issuer,
      issueDate: issueDateIso,
      expiryDate: expiryDateIso
    };
  
    if (type === 'INSURANCE') {
      const coverage = Number($('doc_coverage').value || 0);
      if (!coverage) {
        throw new Error('For INSURANCE, Coverage Amount NZD is required.');
      }
      payload.policyNumber = $('doc_policyNumber').value.trim();
      payload.coverageAmountNZD = coverage;
    }
  
    const url = `${apiBase()}/api/vessel-documents`;
    await fetchJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  
    // reset a few fields
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
    const el = $("readinessPanel");
    if (!el) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    function normaliseType(value) {
      return String(value || "").trim().toUpperCase();
    }

    function docFor(type) {
      return (docs || []).find(d => normaliseType(d.type) === type);
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

      if (isExpired(req.doc)) {
        expired.push(req.label + " expired on " + req.doc.expiryDate);
        return;
      }

      if (isExpiringSoon(req.doc)) {
        warnings.push(req.label + " expires soon on " + req.doc.expiryDate);
      }
    });

    if (missing.length === 0 && expired.length === 0) {
      el.className = warnings.length ? "status warn" : "status ok";
      el.innerHTML =
        (warnings.length ? "⚠ READY TO BOOK — CHECK EXPIRIES" : "✓ READY TO BOOK") +
        "<br><span class='muted'>Owner, vessel and required compliance records are complete.</span>" +
        (warnings.length ? "<br>" + warnings.map(x => "• " + x).join("<br>") : "");
      return;
    }

    el.className = "status warn";
    el.innerHTML =
      "⚠ NOT READY TO BOOK<br>" +
      "<span class='muted'>Complete the following before requesting a booking:</span><br>" +
      missing.map(x => "• Missing: " + x).concat(expired.map(x => "• Expired: " + x)).join("<br>");
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
    try{ showStatus('ok', ''); }catch(e){}
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    $('doc_type').addEventListener('change', setInsuranceFieldVisibility);
    $('btnReloadAll').addEventListener('click', () => reloadAll().catch(err => showStatus('bad', err.message)));
    $('btnSaveOwner').addEventListener('click', () => saveOwner().catch(err => showStatus('bad', err.message)));
    $('btnSaveVessel').addEventListener('click', () => saveVessel().catch(err => showStatus('bad', err.message)));
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
