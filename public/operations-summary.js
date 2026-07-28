(function (global) {
  "use strict";

  function localYmd(date) {
    const value = date instanceof Date ? date : new Date(date);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`${url} returned HTTP ${response.status}`);
    }

    return response.json();
  }

  function resolveSelectedMarina() {
    const selectedOperator = (
      localStorage.getItem("lastOperatorEmail") ||
      localStorage.getItem("bmOperatorEmail") ||
      localStorage.getItem("operatorEmail") ||
      ""
    ).toLowerCase();

    return selectedOperator.includes("westhaven")
      ? { id: 3, name: "Westhaven Marina" }
      : { id: 2, name: "Gulf Harbour Marina" };
  }

  function calculateSummary(options) {
    const marina = options.marina;
    const bookings = Array.isArray(options.bookings)
      ? options.bookings
      : [];
    const moorings = Array.isArray(options.moorings)
      ? options.moorings
      : [];
    const generatedAt = options.generatedAt instanceof Date
      ? options.generatedAt
      : new Date(options.generatedAt || Date.now());
    const today = localYmd(generatedAt);

    const marinaBookings = bookings.filter(
      booking => Number(booking.marinaId) === Number(marina.id)
    );

    const currentPendingBookings = marinaBookings.filter(
      booking =>
        String(booking.status || "").toLowerCase() === "pending" &&
        String(booking.endDate || "") >= today
    );

    const approvedBookings = marinaBookings.filter(
      booking =>
        String(booking.status || "").toLowerCase() === "approved"
    );

    const arrivalsToday = approvedBookings.filter(
      booking => String(booking.startDate || "") === today
    );

    const departuresToday = approvedBookings.filter(
      booking => String(booking.endDate || "") === today
    );

    const occupiedBookingsToday = approvedBookings.filter(
      booking =>
        String(booking.startDate || "") <= today &&
        String(booking.endDate || "") >= today
    );

    const occupiedMooringIds = new Set(
      occupiedBookingsToday
        .map(booking => Number(booking.mooringId))
        .filter(Number.isFinite)
    );

    const totalMoorings = moorings.length;
    const occupiedMoorings = occupiedMooringIds.size;
    const availableMoorings = Math.max(
      totalMoorings - occupiedMoorings,
      0
    );
    const occupancyPercent = totalMoorings > 0
      ? Math.round((occupiedMoorings / totalMoorings) * 100)
      : 0;

    const readiness =
      currentPendingBookings.length > 0
        ? {
            code: "attention",
            label: "Attention Required",
            reason:
              `${currentPendingBookings.length} current booking ` +
              `${currentPendingBookings.length === 1 ? "decision remains" : "decisions remain"} unresolved.`
          }
        : {
            code: "healthy",
            label: "Healthy",
            reason:
              "No current booking approvals are outstanding."
          };

    return {
      marina: {
        id: Number(marina.id),
        name: marina.name
      },
      date: today,
      generatedAt: generatedAt.toISOString(),

      bookings: {
        totalForMarina: marinaBookings.length,
        approved: approvedBookings.length,
        currentPending: currentPendingBookings.length,
        currentPendingRecords: currentPendingBookings
      },

      movements: {
        arrivalsToday: arrivalsToday.length,
        arrivalRecords: arrivalsToday,
        departuresToday: departuresToday.length,
        departureRecords: departuresToday
      },

      occupancy: {
        totalMoorings,
        occupiedMoorings,
        occupiedMooringIds: Array.from(occupiedMooringIds),
        availableMoorings,
        percent: occupancyPercent
      },

      readiness
    };
  }

  async function buildOperationsSummary(marinaInput) {
    const marina = marinaInput || resolveSelectedMarina();

    if (!marina || !Number(marina.id)) {
      throw new Error("A valid marina is required.");
    }

    const [bookingData, mooringData] = await Promise.all([
      fetchJson("/api/bookings"),
      fetchJson(`/api/moorings?marinaId=${Number(marina.id)}`)
    ]);

    return calculateSummary({
      marina,
      bookings: bookingData.bookings,
      moorings: mooringData.moorings,
      generatedAt: new Date()
    });
  }

  global.BoatiesMateOperationsSummary = Object.freeze({
    buildOperationsSummary,
    calculateSummary,
    resolveSelectedMarina,
    localYmd
  });
})(window);
