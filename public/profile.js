function $(id) {
    return document.getElementById(id);
  }
  
  function apiBase() {
    return ($('apiBase').value || '').replace(/\/$/, '');
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
    if (obj.createdAt) parts.push(`Created: ${obj.createdAt}`);
    if (obj.updatedAt) parts.push(`Updated: ${obj.updatedAt}`);
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
        <td>${d.issueDate}</td>
        <td>${d.expiryDate}</td>
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
    $('ownerMeta').textContent = formatMeta(owner);
  }
  
  async function saveOwner() {
    const url = `${apiBase()}/api/owner`;
    const payload = {
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
    $('vesselMeta').textContent = formatMeta(v);
  }
  
  async function saveVessel() {
    const url = `${apiBase()}/api/vessel`;
  
    const payload = {
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
  
    const payload = {
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
  
  async function reloadAll() {
    await loadOwner();
    await loadVessel();
    const docs = await loadDocs();
    renderDocs(docs);
    setInsuranceFieldVisibility();
    showStatus('ok', 'Loaded profile, vessel, and documents.');
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
    $('btnTestPack').addEventListener('click', () => testPack().catch(err => showStatus('bad', err.message)));
  
    reloadAll().catch(err => showStatus('bad', err.message));
  });
  