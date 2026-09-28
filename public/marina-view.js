(function () {
  "use strict";

  const fingerNames = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const sizes = [10.5, 12, 14, 16, 20];
  const statuses = ["occupied", "available", "occupied", "available", "occupied", "occupied"];

  const special = {
    A03: { status: "departing", vessel: "Sea Change", time: "09:00", booking: "BW-1008" },
    A06: { status: "available" },
    B02: { status: "arriving", vessel: "Southern Star", time: "10:30", booking: "BW-1021" },
    B05: { status: "pending", vessel: "Koru Dream", time: "Pending review", booking: "BW-1030" },
    C04: { status: "departing", vessel: "Blue Horizon", time: "11:30", booking: "BW-1012" },
    C07: { status: "available" },
    D03: { status: "arriving", vessel: "Pacific Dawn", time: "12:00", booking: "BW-1025" },
    D06: { status: "available" },
    E02: { status: "unavailable", vessel: "Maintenance", time: "Service hold", booking: "–" },
    E05: { status: "arriving", vessel: "Tui", time: "14:30", booking: "BW-1034" },
    F04: { status: "departing", vessel: "Wanderer", time: "15:00", booking: "BW-1018" },
    F07: { status: "available" },
    G03: { status: "arriving", vessel: "Aroha", time: "16:00", booking: "BW-1038" },
    G06: { status: "available" },
    H02: { status: "pending", vessel: "Coastal Dream", time: "Compliance review", booking: "BW-1040" },
    H05: { status: "departing", vessel: "Mariner", time: "16:30", booking: "BW-1020" }
  };

  const berths = [];

  fingerNames.forEach(function (finger, fingerIndex) {
    for (let i = 1; i <= 8; i += 1) {
      const id = `${finger}${String(i).padStart(2, "0")}`;
      const size = sizes[(fingerIndex + i) % sizes.length];
      const baseStatus = statuses[(fingerIndex * 2 + i) % statuses.length];

      berths.push({
        id,
        finger,
        size,
        status: baseStatus,
        vessel: baseStatus === "occupied" ? `Resident Vessel ${finger}${i}` : "–",
        time: "–",
        booking: baseStatus === "occupied" ? `PERM-${finger}${i}` : "–",
        ...(special[id] || {})
      });
    }
  });

  function titleCase(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function renderFingers() {
    const container = document.getElementById("fingers");

    fingerNames.forEach(function (finger) {
      const column = document.createElement("div");
      column.className = "finger";

      const label = document.createElement("div");
      label.className = "finger-label";
      label.textContent = finger;

      const pontoon = document.createElement("div");
      pontoon.className = "pontoon";

      berths
        .filter(function (berth) { return berth.finger === finger; })
        .forEach(function (berth) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = `berth ${berth.status}`;
          button.textContent = `${berth.id} · ${berth.size}m`;
          button.title = `${berth.id}: ${titleCase(berth.status)}`;
          button.addEventListener("click", function () {
            renderDetail(berth);
          });
          pontoon.appendChild(button);
        });

      column.appendChild(label);
      column.appendChild(pontoon);
      container.appendChild(column);
    });
  }

  function renderMetrics() {
    const count = function (status) {
      return berths.filter(function (berth) { return berth.status === status; }).length;
    };

    document.getElementById("metricAvailable").textContent = count("available");
    document.getElementById("metricArriving").textContent = count("arriving");
    document.getElementById("metricDeparting").textContent = count("departing");
    document.getElementById("metricAttention").textContent =
      count("pending") + count("unavailable");
  }

  function renderSizes() {
    const available = berths.filter(function (berth) {
      return berth.status === "available";
    });

    const list = document.getElementById("sizeList");

    sizes.forEach(function (size) {
      const count = available.filter(function (berth) {
        return berth.size === size;
      }).length;

      const row = document.createElement("div");
      row.className = "size-row";
      row.innerHTML = `<span>Up to ${size} m</span><strong>${count}</strong>`;
      list.appendChild(row);
    });
  }

  function renderMovements() {
    const list = document.getElementById("movementList");
    const movements = berths.filter(function (berth) {
      return berth.status === "arriving" || berth.status === "departing";
    });

    movements.forEach(function (berth) {
      const row = document.createElement("div");
      row.className = "movement-row";

      const movement = berth.status === "arriving" ? "Arrival" : "Departure";

      row.innerHTML =
        `<span><b>${berth.time}</b><br>${movement} · ${berth.id}</span>` +
        `<span>${berth.vessel}</span>`;

      list.appendChild(row);
    });
  }

  function renderDetail(berth) {
    const detail = document.getElementById("berthDetail");

    detail.className = "detail-card";
    detail.innerHTML = `
      <h3>${berth.id}</h3>
      <span class="detail-status ${berth.status}" style="background:${statusColour(berth.status)}">
        ${titleCase(berth.status)}
      </span>

      <div class="detail-grid">
        <div class="detail-item">
          <span>Berth Size</span>
          <strong>${berth.size} m</strong>
        </div>
        <div class="detail-item">
          <span>Finger</span>
          <strong>${berth.finger}</strong>
        </div>
        <div class="detail-item">
          <span>Vessel</span>
          <strong>${berth.vessel}</strong>
        </div>
        <div class="detail-item">
          <span>Movement</span>
          <strong>${berth.time}</strong>
        </div>
        <div class="detail-item">
          <span>Booking</span>
          <strong>${berth.booking}</strong>
        </div>
        <div class="detail-item">
          <span>Operational State</span>
          <strong>${titleCase(berth.status)}</strong>
        </div>
      </div>

      ${berth.status === "available" ? `
        <div class="opportunity">
          <strong>Capacity Opportunity</strong>
          <p>This berth is currently available and could potentially be offered for an appropriate short-term booking.</p>
          <button type="button">Make Available for Visitors</button>
        </div>
      ` : ""}
    `;
  }

  function statusColour(status) {
    return {
      available: "#2e9d64",
      occupied: "#1479b8",
      arriving: "#ee9b38",
      departing: "#7b61a8",
      pending: "#d6a326",
      unavailable: "#8897a2"
    }[status] || "#607582";
  }

  renderFingers();
  renderMetrics();
  renderSizes();
  renderMovements();
})();
