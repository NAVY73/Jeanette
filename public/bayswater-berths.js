(function () {
  const fingers = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const capacities = [10.5, 12, 14, 16, 20];

  const statuses = [
    "available", "occupied", "available", "occupied",
    "available", "arrival", "available", "departure"
  ];

  const map = document.getElementById("marinaMap");
  const vesselLength = document.getElementById("vesselLength");
  const matchSummary = document.getElementById("matchSummary");
  const detailsPanel = document.getElementById("detailsPanel");

  function makeBerths() {
    const records = [];

    fingers.forEach(function (finger, fingerIndex) {
      for (let i = 1; i <= 8; i += 1) {
        const number = fingerIndex * 8 + i;
        const capacity = capacities[(fingerIndex + i - 1) % capacities.length];
        const status = statuses[(fingerIndex * 3 + i - 1) % statuses.length];

        records.push({
          finger: finger,
          berth: finger + number,
          capacity: capacity,
          status: status
        });
      }
    });

    return records;
  }

  const berthData = makeBerths();

  function classification(record, selectedLength) {
    if (record.status !== "available") {
      return "unavailable";
    }

    if (record.capacity < selectedLength) {
      return "too-small";
    }

    return "suitable";
  }

  function renderDetails(record, selectedLength) {
    detailsPanel.innerHTML = `
      <h2>${record.berth}</h2>

      <div class="detail-row">
        <span>Finger</span>
        <strong>${record.finger}</strong>
      </div>

      <div class="detail-row">
        <span>Maximum vessel length</span>
        <strong>${record.capacity}m</strong>
      </div>

      <div class="detail-row">
        <span>Your vessel</span>
        <strong>${selectedLength}m</strong>
      </div>

      <div class="detail-row">
        <span>Availability</span>
        <strong>Available</strong>
      </div>

      <div class="suitable-banner">
        Suitable capacity identified for your vessel.
      </div>

      <a class="request-btn" href="/boatie-demo.html">
        Request This Berth
      </a>

      <div class="request-note">
        A booking request remains subject to marina business rules,
        vessel suitability, compliance requirements and operator approval.
      </div>
    `;
  }

  function render() {
    const selectedLength = Number(vesselLength.value);
    map.innerHTML = "";

    let suitableCount = 0;

    fingers.forEach(function (finger) {
      const row = document.createElement("div");
      row.className = "finger-row";

      const label = document.createElement("div");
      label.className = "finger-label";
      label.textContent = finger;

      const berthContainer = document.createElement("div");
      berthContainer.className = "berths";

      berthData
        .filter(function (record) {
          return record.finger === finger;
        })
        .forEach(function (record) {
          const state = classification(record, selectedLength);

          if (state === "suitable") {
            suitableCount += 1;
          }

          const berth = document.createElement("div");
          berth.className = "berth " + state;
          berth.innerHTML =
            `<span>${record.berth}</span><small>${record.capacity}m</small>`;

          if (state === "suitable") {
            berth.addEventListener("click", function () {
              renderDetails(record, selectedLength);
            });
          }

          berthContainer.appendChild(berth);
        });

      row.appendChild(label);
      row.appendChild(berthContainer);
      map.appendChild(row);
    });

    matchSummary.innerHTML =
      `<strong>${suitableCount} demonstration berth${suitableCount === 1 ? "" : "s"}</strong> ` +
      `currently match a ${selectedLength}m vessel.`;

    detailsPanel.innerHTML = `
      <h2>Berth Details</h2>
      <div class="empty">
        Select a suitable green berth from the marina view to see its capacity and start a booking request.
      </div>
    `;
  }

  vesselLength.addEventListener("change", render);
  render();
})();
