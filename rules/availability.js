// rules/availability.js
// Availability + capacity rules (JSON-backed prototype)

function rangesOverlapInclusive(startA, endA, startB, endB) {
    return startA <= endB && endA >= startB;
  }
  
  function safeDate(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  
  /**
   * Suitability check (MVP):
   * - vessel.lengthMetres must fit within mooring.maxLengthMetres (if set)
   * - vessel.draftMetres must fit within mooring.maxDraftMetres (if set)
   * - mooring must be active (if status field exists)
   *
   * Returns:
   * { passed: boolean, reasons: string[] }
   */
  function checkSuitability({ vessel, mooring }) {
    const reasons = [];
  
    if (!vessel) reasons.push('Vessel not found');
    if (!mooring) reasons.push('Mooring not found');
  
    if (reasons.length > 0) return { passed: false, reasons };
  
    // Mooring status (optional field)
    if (mooring.status && String(mooring.status) !== 'active') {
      reasons.push('Mooring is not active');
    }
  
    // Length
    const vLen = Number(vessel.lengthMetres);
    const mMaxLen = mooring.maxLengthMetres != null ? Number(mooring.maxLengthMetres) : null;
    if (!Number.isNaN(vLen) && mMaxLen != null && !Number.isNaN(mMaxLen)) {
      if (vLen > mMaxLen) reasons.push(`Vessel length ${vLen}m exceeds mooring max length ${mMaxLen}m`);
    }
  
    // Draft
    const vDraft = Number(vessel.draftMetres);
    const mMaxDraft = mooring.maxDraftMetres != null ? Number(mooring.maxDraftMetres) : null;
    if (!Number.isNaN(vDraft) && mMaxDraft != null && !Number.isNaN(mMaxDraft)) {
      if (vDraft > mMaxDraft) reasons.push(`Vessel draft ${vDraft}m exceeds mooring max draft ${mMaxDraft}m`);
    }
  
    return { passed: reasons.length === 0, reasons };
  }
  
  /**
   * Approved conflict check used at approval time (hard gate).
   * Returns a list of conflicting APPROVED bookings.
   */
  function findApprovedConflicts({ bookings, mooringId, startDate, endDate, excludeBookingId }) {
    return (bookings || []).filter((b) => {
      if (excludeBookingId != null && Number(b.id) === Number(excludeBookingId)) return false;
      if (Number(b.mooringId) !== Number(mooringId)) return false;
      if (String(b.status) !== 'approved') return false;
  
      const existingStart = safeDate(b.startDate);
      const existingEnd = safeDate(b.endDate);
      if (!existingStart || !existingEnd) return true;
  
      return rangesOverlapInclusive(existingStart, existingEnd, startDate, endDate);
    });
  }
  
  /**
   * Alternatives finder:
   * - within same marina
   * - excludes current mooring (optional)
   * - must pass suitability
   * - must have no conflicts with blockStatuses (default approved-only)
   *
   * preferredMooringType: when provided, will score same-type higher (e.g., 'swing' vs 'berth')
   */
  function findAlternatives({
    moorings,
    bookings,
    vessel,
    marinaId,
    startDate,
    endDate,
    preferredMooringType,
    excludeMooringId,
    blockStatuses = ['approved'],
    limit = 10,
  }) {
    const results = [];
    if (!Array.isArray(moorings) || !Array.isArray(bookings) || !vessel || marinaId == null) return results;
  
    for (const m of moorings) {
      if (Number(m.marinaId) !== Number(marinaId)) continue;
      if (excludeMooringId != null && Number(m.id) === Number(excludeMooringId)) continue;
      if (m.status && String(m.status) !== 'active') continue;
  
      // Suitability
      const suitability = checkSuitability({ vessel, mooring: m });
      if (!suitability.passed) continue;
  
      // Availability conflicts
      const conflicts = bookings.filter((b) => {
        if (Number(b.mooringId) !== Number(m.id)) return false;
        if (!blockStatuses.includes(String(b.status))) return false;
  
        const existingStart = safeDate(b.startDate);
        const existingEnd = safeDate(b.endDate);
        if (!existingStart || !existingEnd) return true;
  
        return rangesOverlapInclusive(existingStart, existingEnd, startDate, endDate);
      });
  
      if (conflicts.length > 0) continue;
  
      // Simple scoring: prefer same type if a preference is given
      const sameType = preferredMooringType && String(m.type) === String(preferredMooringType);

const vLen = Number(vessel.lengthMetres);
const vDraft = Number(vessel.draftMetres);

const mMaxLen = m.maxLengthMetres != null ? Number(m.maxLengthMetres) : null;
const mMaxDraft = m.maxDraftMetres != null ? Number(m.maxDraftMetres) : null;

const lenHeadroom = (mMaxLen != null && !Number.isNaN(vLen) && !Number.isNaN(mMaxLen)) ? (mMaxLen - vLen) : 0;
const draftHeadroom = (mMaxDraft != null && !Number.isNaN(vDraft) && !Number.isNaN(mMaxDraft)) ? (mMaxDraft - vDraft) : 0;

// Base + headroom + type preference
const score = 9000 + Math.round(lenHeadroom * 50) + Math.round(draftHeadroom * 50) + (sameType ? 1000 : 0);

  
      results.push({
        mooringId: m.id,
        name: m.name,
        type: m.type || null,
        maxLengthMetres: m.maxLengthMetres ?? null,
        maxDraftMetres: m.maxDraftMetres ?? null,
        score,
        reason: 'Suitable and available',
      });
    }
  
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }
  
  module.exports = {
    checkSuitability,
    findApprovedConflicts,
    findAlternatives,
  };
  