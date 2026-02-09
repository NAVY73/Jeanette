const resultEl = document.getElementById('result');
const mooringSelect = document.getElementById('mooringId');
const bannerEl = document.getElementById('banner');
const bannerTitleEl = document.getElementById('bannerTitle');
const bannerBodyEl = document.getElementById('bannerBody');

function clearBanner() {
  bannerEl.style.display = 'none';
  bannerEl.style.borderLeftColor = '#888';
  bannerTitleEl.textContent = '';
  bannerBodyEl.innerHTML = '';
}

function showBanner(kind, title, htmlBody) {
  // kind: 'success' | 'warn' | 'error' | 'info'
  const colors = {
    success: '#2e7d32',
    warn: '#b26a00',
    error: '#b00020',
    info: '#2b5cab',
  };

  bannerEl.style.display = 'block';
  bannerEl.style.borderLeftColor = colors[kind] || '#888';
  bannerTitleEl.textContent = title;
  bannerBodyEl.innerHTML = htmlBody || '';
}

function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function ymd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function apiBase() {
  const v = document.getElementById('apiBase').value.trim();
  return v.replace(/\/+$/, '');
}

function show(obj) {
  resultEl.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
}

async function fetchJson(url, options) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (e) {
    throw { type: 'FETCH_ERROR', message: e?.message || String(e), url };
  }

  const ct = res.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    throw { type: 'HTTP_ERROR', status: res.status, url, body };
  }
  return body;
}
// =====================================================
// Application Pack (Operator)
// GET /api/bookings/:id/application-pack
// =====================================================
function setPackOutput(textOrObj) {
    const el = document.getElementById('packOutput');
    if (!el) return;
    if (textOrObj == null) el.textContent = '';
    else if (typeof textOrObj === 'string') el.textContent = textOrObj;
    else el.textContent = JSON.stringify(textOrObj, null, 2);
  }
  
  function syncPackBookingIdFromApproveId() {
    const approveIdEl = document.getElementById('approveBookingId');
    const packIdEl = document.getElementById('packBookingId');
    if (!approveIdEl || !packIdEl) return;
  
    // If packBookingId is empty, keep it in sync with approveBookingId
    if (!packIdEl.value || Number(packIdEl.value) <= 0) {
      packIdEl.value = approveIdEl.value || '';
    }
  }
  
  async function loadApplicationPack() {
    clearBanner();
  
    const base = apiBase();
    const packIdEl = document.getElementById('packBookingId');
    const id = Number(packIdEl?.value);
  
    if (!base) {
      show('API Base URL is blank.');
      return;
    }
    if (!Number.isFinite(id) || id <= 0) {
      showBanner('warn', 'Application Pack', '<div>Please enter a valid Booking ID.</div>');
      setPackOutput('Enter a valid Booking ID above, then click Load Application Pack.');
      return;
    }
  
    const url = `${base}/api/bookings/${id}/application-pack`;
    show({ message: 'Loading application pack…', url });
    setPackOutput({ message: 'Loading…', url });
  
    try {
      const pack = await fetchJson(url);
  
      // Operator-friendly headline based on compliance
      const eligible = Boolean(pack?.complianceSummary?.eligibleToBook);
      const headline = eligible ? 'Application Pack loaded (compliant)' : 'Application Pack loaded (NOT compliant)';
  
      showBanner(
        eligible ? 'success' : 'warn',
        headline,
        `
          <div><strong>Booking ID:</strong> ${esc(String(id))}</div>
          <div style="margin-top:6px;"><strong>Status:</strong> ${esc(pack?.booking?.status || '')}</div>
          <div style="margin-top:6px;"><strong>Eligible to book:</strong> ${esc(String(eligible))}</div>
        `
      );
  
      setPackOutput(pack);
      return;
    } catch (err) {
      const status = err?.status;
      const body = err?.body;
  
      show({ error: 'Load application pack failed', status, body, err });
  
      showBanner(
        'error',
        'Could not load Application Pack',
        `<div>Booking ID <strong>${esc(String(id))}</strong> could not be loaded.</div>`
      );
  
      setPackOutput({ error: 'Load application pack failed', status, body });
    }
  }
  
function issueListHtml(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  const li = items.map(x => `<li>${esc(x.message || JSON.stringify(x))}</li>`).join('');
  return `<ul style="margin:6px 0 0 18px;">${li}</ul>`;
}

async function loadStoredProfileAndVessel() {
  const base = apiBase();
  if (!base) return;

  // MVP: one owner + one vessel; always ID 1
  const ownerIdEl = document.getElementById('ownerId');
  const vesselIdEl = document.getElementById('vesselId');
  if (ownerIdEl) ownerIdEl.value = '1';
  if (vesselIdEl) vesselIdEl.value = '1';

  try {
    // Your backend currently exposes /api/owner and /api/vessel (singular)
    const owner = await fetchJson(`${base}/api/owner`);
    const vessel = await fetchJson(`${base}/api/vessel`);

    const ownerLine = owner?.fullName
      ? `${esc(owner.fullName)} (${esc(owner.email || '')})`
      : 'Owner profile saved (details not filled)';

    const vesselLine = vessel?.name
      ? `${esc(vessel.name)} — ${esc(vessel.type || '')}`
      : 'Vessel profile saved (details not filled)';

    showBanner(
      'info',
      'Profile loaded',
      `<div><strong>Owner:</strong> ${ownerLine}</div>
       <div style="margin-top:6px;"><strong>Vessel:</strong> ${vesselLine}</div>
       <div style="margin-top:8px;" class="hint">Edit these in <a href="/profile.html">Profile & Compliance</a>.</div>`
    );
  } catch (e) {
    show({ message: 'Profile load failed (non-fatal)', error: e });
    showBanner(
      'warn',
      'Profile not loaded',
      `<div>Could not load stored profile/vessel from the server.</div>
       <div class="hint" style="margin-top:8px;">Open <a href="/profile.html">Profile & Compliance</a> and ensure the server is running.</div>`
    );
  }
}

async function refreshComplianceStatus() {
  const base = apiBase();
  if (!base) return;

  const marinaId = Number(document.getElementById('marinaId').value);
  if (!Number.isFinite(marinaId) || marinaId <= 0) return;

  const createBtn = document.getElementById('createBtn');

  try {
    const status = await fetchJson(`${base}/api/compliance/check?marinaId=${marinaId}`);

    if (status.eligibleToBook) {
      if (createBtn) createBtn.disabled = false;

      if (Array.isArray(status.warnings) && status.warnings.length > 0) {
        showBanner(
          'warn',
          'Compliance OK (with warnings)',
          `<div>You can create bookings, but note:</div>
           ${issueListHtml(status.warnings)}
           <div style="margin-top:8px;"><a href="/profile.html">Review compliance</a></div>`
        );
      }
      return;
    }

    // Not eligible: block Create Booking
    if (createBtn) createBtn.disabled = true;

    showBanner(
      'error',
      'Compliance required before booking',
      `<div>Booking creation is blocked until the following are fixed:</div>
       ${issueListHtml(status.blockingIssues)}
       <div style="margin-top:8px;"><a href="/profile.html">Go to Profile & Compliance</a></div>`
    );
  } catch (e) {
    // If compliance endpoint is missing, do not hard-block; just warn.
    if (createBtn) createBtn.disabled = false;

    show({ message: 'Compliance check failed (non-fatal)', error: e });
    showBanner(
      'warn',
      'Could not verify compliance',
      `<div>Compliance check endpoint did not respond. You can still attempt booking, but it may be rejected.</div>`
    );
  }
}

function renderReasonsList(reasons) {
  if (!Array.isArray(reasons) || reasons.length === 0) return '';
  const items = reasons.map(r => `<li>${esc(r)}</li>`).join('');
  return `<div style="margin-top:8px;"><div style="font-weight:bold;">Why it failed</div><ul style="margin:6px 0 0 18px;">${items}</ul></div>`;
}

function renderAlternativesAsResults(alternatives, contextLabel) {
  if (!Array.isArray(alternatives) || alternatives.length === 0) return;

  const payloadLike = {
    count: alternatives.length,
    results: alternatives.map(a => ({
      mooringId: a.mooringId,
      name: a.name || `Mooring ${a.mooringId}`,
      type: a.type || a.mooringType || null,
      maxLengthMetres: a.maxLengthMetres ?? null,
      maxDraftMetres: a.maxDraftMetres ?? null,
      score: a.score ?? null,
      reason: a.reason || 'Alternative',
    })),
    diagnostics: null,
  };

  const summaryEl = document.getElementById('availSummary');
  if (summaryEl) summaryEl.textContent = contextLabel || 'Suggested alternatives (click Select).';

  renderAvailabilityResults(payloadLike);
}

// Patch B: per-marina cache to avoid duplicate mooring loads
const mooringsInFlightByMarina = new Map(); // marinaId -> Promise<data>
const mooringsCacheByMarina = new Map();    // marinaId -> data

async function loadMoorings({ silent = false, force = false } = {}) {
  const base = apiBase();
  const marinaId = Number(document.getElementById('marinaId').value);

  if (!base) {
    if (!silent) show('API Base URL is blank. Set it to http://localhost:3000');
    return;
  }
  if (!Number.isFinite(marinaId) || marinaId <= 0) {
    if (!silent) show('Enter a valid Marina ID (e.g., 1).');
    return;
  }

  if (!force && mooringsCacheByMarina.has(marinaId)) {
    renderMooringsToSelect(mooringsCacheByMarina.get(marinaId), { silent, marinaId });
    return;
  }

  if (mooringsInFlightByMarina.has(marinaId)) {
    const data = await mooringsInFlightByMarina.get(marinaId);
    const currentMarinaId = Number(document.getElementById('marinaId').value);
    if (currentMarinaId === marinaId) {
      renderMooringsToSelect(data, { silent, marinaId });
      if (!silent) show({ message: 'Moorings loaded', marinaId, count: (data.moorings || []).length });
    }
    return;
  }

  const url = `${base}/api/moorings?marinaId=${marinaId}`;
  if (!silent) show({ message: 'Loading moorings…', url });

  const p = (async () => {
    const data = await fetchJson(url);
    mooringsCacheByMarina.set(marinaId, data);
    return data;
  })();

  mooringsInFlightByMarina.set(marinaId, p);

  try {
    const data = await p;
    const currentMarinaId = Number(document.getElementById('marinaId').value);
    if (currentMarinaId === marinaId) {
      renderMooringsToSelect(data, { silent, marinaId });
      if (!silent) show({ message: 'Moorings loaded', marinaId, count: (data.moorings || []).length });
    }
  } finally {
    mooringsInFlightByMarina.delete(marinaId);
  }
}

// Keep ONLY one version of this function (this one)
function renderMooringsToSelect(data, { silent = false, marinaId = null } = {}) {
  const moorings = data?.moorings || [];
  const mid = marinaId ?? Number(document.getElementById('marinaId').value);

  mooringSelect.innerHTML = '';

  if (moorings.length === 0) {
    mooringSelect.innerHTML = '<option value="">No moorings found</option>';
    if (!silent) show({ message: 'No moorings matched', marinaId: mid, count: 0 });
    return;
  }

  for (const m of moorings) {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.name} (ID ${m.id}, type ${m.type})`;
    mooringSelect.appendChild(opt);
  }
}

async function createBooking() {
  // Note: do NOT clear banner here; profile/compliance banners are useful
  const base = apiBase();
  const payload = {
    ownerId: Number(document.getElementById('ownerId').value),
    vesselId: Number(document.getElementById('vesselId').value),
    mooringId: Number(document.getElementById('mooringId').value),
    startDate: document.getElementById('startDate').value,
    endDate: document.getElementById('endDate').value,
    notes: document.getElementById('notes').value || ''
  };

  if (!base) return show('API Base URL is blank. Set it to http://localhost:3000');

  show({ message: 'Creating booking…', url: `${base}/api/bookings`, payload });

  try {
    const data = await fetchJson(`${base}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const newId = data?.booking?.id;
    if (newId) document.getElementById('approveBookingId').value = newId;

    showBanner(
      'success',
      'Booking created',
      `<div>Booking ID <strong>${esc(newId)}</strong> created as <strong>${esc(data?.booking?.status || '')}</strong>.</div>`
    );

    show(data);
    return;
  } catch (err) {
    const status = err?.status;
    const body = err?.body;

    show({ error: 'Create booking failed', status, body });

    // Compliance (400) must be handled BEFORE other status blocks
    if (status === 400 && body?.error === 'COMPLIANCE_NOT_ELIGIBLE') {
      showBanner(
        'error',
        'Compliance required before booking',
        `<div>${esc(body.message || 'Compliance rules not met.')}</div>
         ${issueListHtml(body.blockingIssues)}
         <div style="margin-top:8px;"><a href="/profile.html">Fix compliance in Profile & Compliance</a></div>`
      );
      return;
    }

    showBanner('error', 'Booking failed', `<div>Unexpected error.</div>`);

    if (status === 409) {
      showBanner(
        'warn',
        'Cannot create booking: dates not available',
        `<div>The selected mooring is not available for those dates.</div>`
      );

      if (body?.conflictsWith?.length) {
        const conflictsHtml = body.conflictsWith
          .map(c => `<li>ID ${esc(c.id)} — ${esc(c.startDate)} to ${esc(c.endDate)} (${esc(c.status)})</li>`)
          .join('');
        bannerBodyEl.innerHTML += `<div style="margin-top:8px;"><div style="font-weight:bold;">Conflicts with</div><ul style="margin:6px 0 0 18px;">${conflictsHtml}</ul></div>`;
      }

      if (Array.isArray(body?.alternatives) && body.alternatives.length > 0) {
        renderAlternativesAsResults(body.alternatives, 'Conflict detected — suggested alternatives (click Select).');
        return;
      }

      try {
        document.getElementById('availMarinaId').value = String(document.getElementById('marinaId').value);
        document.getElementById('availVesselId').value = String(document.getElementById('vesselId').value);
        document.getElementById('availStartDate').value = document.getElementById('startDate').value;
        document.getElementById('availEndDate').value = document.getElementById('endDate').value;
        document.getElementById('availBlockStatuses').value = 'pending,approved';
        await searchAvailability();
      } catch (_) {}

      return;
    }

    if (status === 422) {
      const reasonsHtml = renderReasonsList(body?.reasons);
      showBanner(
        'warn',
        'Not suitable for this mooring',
        `<div>This vessel does not fit the selected mooring.</div>${reasonsHtml}`
      );

      if (Array.isArray(body?.alternatives) && body.alternatives.length > 0) {
        renderAlternativesAsResults(body.alternatives, 'Suitability failed — suggested alternatives (click Select).');
        return;
      }

      try {
        document.getElementById('availMarinaId').value = String(document.getElementById('marinaId').value);
        document.getElementById('availVesselId').value = String(document.getElementById('vesselId').value);
        document.getElementById('availStartDate').value = document.getElementById('startDate').value;
        document.getElementById('availEndDate').value = document.getElementById('endDate').value;
        document.getElementById('availBlockStatuses').value = 'approved';
        await searchAvailability();
      } catch (_) {}

      return;
    }

    if (body) {
      bannerBodyEl.innerHTML += `<pre style="margin-top:10px;">${esc(JSON.stringify(body, null, 2))}</pre>`;
    }
  }
}

async function approveBooking() {
  clearBanner();

  const base = apiBase();
  const token = document.getElementById('token').value.trim();
  const id = Number(document.getElementById('approveBookingId').value);

  if (!base) return show('API Base URL is blank.');
  if (!token) return show('Operator token is required.');
  if (!Number.isFinite(id) || id <= 0) return show('Valid booking ID is required.');

  const url = `${base}/api/bookings/${id}/approve`;
  show({ message: 'Approving booking…', url });

  try {
    const data = await fetchJson(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    showBanner(
      'success',
      'Booking approved',
      `<div>Booking <strong>${esc(id)}</strong> has been approved.</div>`
    );

    show(data);
    return;
  } catch (err) {
    const status = err?.status;
    const body = err?.body;

    show({ error: 'Approve booking failed', status, body });

    showBanner(
      'error',
      'Cannot approve booking',
      `<div>The booking could not be approved.</div>`
    );

    if (status === 409) {
      showBanner(
        'warn',
        'Cannot approve: dates not available',
        `<div>This mooring is already allocated for the selected dates.</div>`
      );

      if (body?.conflictsWith?.length) {
        const conflictsHtml = body.conflictsWith
          .map(c => `<li>ID ${esc(c.id)} — ${esc(c.startDate)} to ${esc(c.endDate)} (${esc(c.status)})</li>`)
          .join('');
        bannerBodyEl.innerHTML +=
          `<div style="margin-top:8px;"><div style="font-weight:bold;">Conflicts with</div><ul style="margin:6px 0 0 18px;">${conflictsHtml}</ul></div>`;
      }

      if (Array.isArray(body?.alternatives) && body.alternatives.length > 0) {
        renderAlternativesAsResults(body.alternatives, 'Suggested alternatives (click Select).');
      }

      return;
    }

    if (body) {
      bannerBodyEl.innerHTML += `<pre style="margin-top:10px;">${esc(JSON.stringify(body, null, 2))}</pre>`;
    }
  }
}

// Availability functions (unchanged from your existing implementation)
async function loadVesselsForAvailability() {
  const base = apiBase();
  const select = document.getElementById('availVesselId');
  if (!base) return;

  try {
    const data = await fetchJson(`${base}/api/vessels`);
    const list = data.vessels || [];

    select.innerHTML = '';
    if (list.length === 0) {
      select.innerHTML = '<option value="">No vessels found</option>';
      updateAvailabilitySearchState();
      return;
    }

    for (const v of list) {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = `${v.name} (ID ${v.id}, ${v.lengthMetres ?? '?'}m, draft ${v.draftMetres ?? '?'}m)`;
      select.appendChild(opt);
    }

    const current = Number(document.getElementById('vesselId').value);
    if (Number.isFinite(current) && current > 0) {
      select.value = String(current);
    } else if (list.some(v => Number(v.id) === 1)) {
      select.value = '1';
    } else if (list.length > 0) {
      select.value = String(list[0].id);
    }
  } catch (err) {
    select.innerHTML = '<option value="">(Unable to load vessels)</option>';
  }

  updateAvailabilitySearchState();
}

function renderAvailabilityResults(payload) {
  const resultsEl = document.getElementById('availResults');
  const summaryEl = document.getElementById('availSummary');

  resultsEl.innerHTML = '';

  const count = payload?.count ?? 0;
  const items = Array.isArray(payload?.results) ? payload.results : [];

  const marinaName = payload?.marina?.name ? ` in ${payload.marina.name}` : '';
  summaryEl.textContent = `Found ${count} option(s)${marinaName}.`;

  if (items.length === 0) {
    const diag = payload?.diagnostics;

    resultsEl.innerHTML = `
      <div style="border:1px solid #ddd; border-radius:6px; padding:10px; margin-top:10px;">
        <div style="font-weight:bold;">No suitable availability found</div>
        <div class="hint" style="margin-top:6px;">
          Try changing dates, switching vessel, or using <em>pending + approved (strict)</em> depending on your scenario.
        </div>
        ${
          diag
            ? `
              <details>
                <summary>Show diagnostics</summary>
                <pre style="margin-top:8px;">${esc(JSON.stringify(diag, null, 2))}</pre>
              </details>
            `
            : ''
        }
      </div>
    `;
    return;
  }

  const recommended = items.slice(0, 3);
  const alternatives = items.slice(3);

  function renderCard(r, tagHtml) {
    const meta = [
      r.type ? `type ${r.type}` : null,
      r.maxLengthMetres != null ? `max length ${r.maxLengthMetres}m` : null,
      r.maxDraftMetres != null ? `max draft ${r.maxDraftMetres}m` : null,
    ].filter(Boolean);

    const score = r.score != null ? Number(r.score) : null;
    const scoreBadge = score != null
      ? `<span class="badge ${tagHtml ? 'badge-strong' : ''}">score ${esc(score)}</span>`
      : '';

    const reasonLine = r.reason ? `<div class="small" style="margin-top:6px;">${esc(r.reason)}</div>` : '';
    const metaLine = meta.length
      ? `<div class="kv">${meta.map(x => `<span>${esc(x)}</span>`).join('')}</div>`
      : '';

    const name = r.name || `Mooring ${r.mooringId}`;

    const wrap = document.createElement('div');
    wrap.style.border = '1px solid #ddd';
    wrap.style.borderRadius = '6px';
    wrap.style.padding = '10px';
    wrap.style.marginTop = '10px';

    wrap.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
        <div style="flex:1;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <div><strong>${esc(name)}</strong> <span class="small">(ID ${esc(r.mooringId)})</span></div>
            ${tagHtml || ''}
            ${scoreBadge}
          </div>
          ${metaLine}
          ${reasonLine}
        </div>
        <div style="min-width:120px;">
          <button type="button" style="width:100%;" data-mooring-id="${esc(r.mooringId)}">Select</button>
        </div>
      </div>
    `;

    wrap.querySelector('button').addEventListener('click', async () => {
      const marinaId = document.getElementById('availMarinaId').value;
      const vesselId = document.getElementById('availVesselId').value;
      const startDate = document.getElementById('availStartDate').value;
      const endDate = document.getElementById('availEndDate').value;

      document.getElementById('marinaId').value = marinaId;
      document.getElementById('vesselId').value = vesselId;
      document.getElementById('startDate').value = startDate;
      document.getElementById('endDate').value = endDate;

      await loadMoorings({ silent: true });
      document.getElementById('mooringId').value = String(r.mooringId);

      showBanner(
        'success',
        'Selection applied',
        `<div><strong>${esc(name)}</strong> selected (ID ${esc(r.mooringId)}).</div>
         <div class="hint" style="margin-top:6px;">Marina ${esc(marinaId)} • Vessel ${esc(vesselId)} • ${esc(startDate)} → ${esc(endDate)}</div>`
      );
    });

    return wrap;
  }

  const recTitle = document.createElement('div');
  recTitle.className = 'section-title';
  recTitle.textContent = 'Recommended';
  resultsEl.appendChild(recTitle);

  for (const r of recommended) {
    resultsEl.appendChild(renderCard(r, `<span class="badge badge-strong">top pick</span>`));
  }

  if (alternatives.length) {
    const altTitle = document.createElement('div');
    altTitle.className = 'section-title';
    altTitle.textContent = 'Alternatives';
    resultsEl.appendChild(altTitle);

    for (const r of alternatives) {
      resultsEl.appendChild(renderCard(r, ''));
    }
  }
}

function clearAvailabilityResults({ clearPre = false, clearBannerToo = false } = {}) {
  const resultsEl = document.getElementById('availResults');
  const summaryEl = document.getElementById('availSummary');

  if (resultsEl) resultsEl.innerHTML = '';
  if (summaryEl) summaryEl.textContent = '';

  if (clearPre) show('Ready.');
  if (clearBannerToo) clearBanner();
}

async function searchAvailability() {
  const base = apiBase();

  const marinaId = Number(document.getElementById('availMarinaId').value);
  const vesselId = Number(document.getElementById('availVesselId').value);
  const startDate = document.getElementById('availStartDate').value;
  const endDate = document.getElementById('availEndDate').value;
  const blockStatuses = document.getElementById('availBlockStatuses').value;

  if (!base) return show('API Base URL is blank. Set it to http://localhost:3000');
  if (!Number.isFinite(marinaId) || marinaId <= 0) return show('Enter a valid Marina ID (e.g., 1).');
  if (!Number.isFinite(vesselId) || vesselId <= 0) return show('Select a valid Vessel.');
  if (!startDate || !endDate) return show('Start Date and End Date are required.');

  const url = `${base}/api/availability?marinaId=${marinaId}&vesselId=${vesselId}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&blockStatuses=${encodeURIComponent(blockStatuses)}`;

  show({ message: 'Searching availability…', url });

  const data = await fetchJson(url);
  renderAvailabilityResults(data);
}

// Wiring
document.getElementById('loadMooringsBtn').addEventListener('click', () => {
  loadMoorings({ silent: false, force: true }).catch(err => show({ error: 'Load moorings failed', err }));
});

document.getElementById('marinaId')?.addEventListener('change', () => {
  refreshComplianceStatus().catch(() => {});
  document.getElementById('mooringId').innerHTML = '<option value="">Click “Load Moorings” first…</option>';
});

document.getElementById('createBtn').addEventListener('click', () => {
  createBooking().catch(err => show({ error: 'Create booking failed', err }));
});

document.getElementById('availSearchBtn').addEventListener('click', () => {
  searchAvailability().catch(err => show({ error: 'Search availability failed', err }));
});

document.getElementById('reloadVesselsBtn').addEventListener('click', () => {
  loadVesselsForAvailability().catch(err => show({ error: 'Reload vessels failed', err }));
});

document.getElementById('availClearBtn').addEventListener('click', () => {
  clearAvailabilityResults({ clearPre: false, clearBannerToo: false });
});

// Application Pack button wiring
document.getElementById('loadPackBtn')?.addEventListener('click', () => {
    loadApplicationPack().catch(err => show({ error: 'Load application pack failed', err }));
  });
  
  // Keep packBookingId in sync with approveBookingId (helpful in demos)
  document.getElementById('approveBookingId')?.addEventListener('input', syncPackBookingIdFromApproveId);
  document.getElementById('approveBookingId')?.addEventListener('change', syncPackBookingIdFromApproveId);
  syncPackBookingIdFromApproveId();  

// Enable/disable Search Availability based on form validity
function updateAvailabilitySearchState() {
  const marinaId = Number(document.getElementById('availMarinaId').value);
  const vesselId = Number(document.getElementById('availVesselId').value);
  const startDate = document.getElementById('availStartDate').value;
  const endDate = document.getElementById('availEndDate').value;

  let valid = true;
  if (!Number.isFinite(marinaId) || marinaId <= 0) valid = false;
  if (!Number.isFinite(vesselId) || vesselId <= 0) valid = false;
  if (!startDate || !endDate) valid = false;
  if (startDate && endDate && endDate < startDate) valid = false;

  const btn = document.getElementById('availSearchBtn');
  btn.disabled = !valid;
  btn.style.opacity = valid ? '1' : '0.5';
  btn.style.cursor = valid ? 'pointer' : 'not-allowed';
}

function wireAvailabilityAutoClear() {
  const ids = ['availMarinaId', 'availVesselId', 'availStartDate', 'availEndDate', 'availBlockStatuses'];
  const handler = () => {
    clearAvailabilityResults({ clearPre: false, clearBannerToo: false });
    updateAvailabilitySearchState();
  };

  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener('input', handler);
    el.addEventListener('change', handler);
  }
}

wireAvailabilityAutoClear();

// Defaults for availability dates: +7 days start, +2 days duration
const t = new Date();
const s = new Date(t); s.setDate(s.getDate() + 7);
const e = new Date(s); e.setDate(e.getDate() + 2);
document.getElementById('availStartDate').value = ymd(s);
document.getElementById('availEndDate').value = ymd(e);

// Sync marina default from main marinaId
document.getElementById('availMarinaId').value = document.getElementById('marinaId').value;

// Load vessels for availability dropdown
loadVesselsForAvailability().catch(() => {});

// Auto-load moorings quietly
loadMoorings({ silent: true }).catch(() => {});

// Ensure Search Availability button state is correct on load
updateAvailabilitySearchState();

// NEW: Load profile + compliance on page load
loadStoredProfileAndVessel()
  .then(() => refreshComplianceStatus())
  .catch(() => {});

