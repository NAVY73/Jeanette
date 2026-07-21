(function () {
  "use strict";

  const loading = document.getElementById("loading");
  const error = document.getElementById("error");
  const noIdentity = document.getElementById("noIdentity");
  const empty = document.getElementById("empty");
  const bookingSummary = document.getElementById("bookingSummary");
  const upcomingCount = document.getElementById("upcomingCount");
  const pastCount = document.getElementById("pastCount");
  const upcomingHeadingCount = document.getElementById("upcomingHeadingCount");
  const pastHeadingCount = document.getElementById("pastHeadingCount");
  const upcomingSection = document.getElementById("upcomingSection");
  const pastSection = document.getElementById("pastSection");
  const upcomingToggle = document.getElementById("upcomingToggle");
  const pastToggle = document.getElementById("pastToggle");
  const upcomingBookings = document.getElementById("upcomingBookings");
  const pastBookings = document.getElementById("pastBookings");
  const viewSwitch = document.getElementById("viewSwitch");
  const agendaViewButton = document.getElementById("agendaViewButton");
  const calendarViewButton = document.getElementById("calendarViewButton");
  const agendaView = document.getElementById("agendaView");
  const calendarView = document.getElementById("calendarView");
  const calendarTitle = document.getElementById("calendarTitle");
  const calendarGrid = document.getElementById("calendarGrid");
  const previousMonth = document.getElementById("previousMonth");
  const nextMonth = document.getElementById("nextMonth");
  const compliancePanel = document.getElementById("compliancePanel");
  const complianceReminderList = document.getElementById("complianceReminderList");

  let allBookings = [];
  let allComplianceDocuments = [];
  let currentMarinaMap = new Map();
  let currentMooringMap = new Map();
  let calendarMonth = new Date();
  calendarMonth.setDate(1);
  calendarMonth.setHours(0, 0, 0, 0);

  const ownerId = Number(localStorage.getItem("bmOwnerId") || 0) || null;
  const vesselId = Number(localStorage.getItem("bmVesselId") || 0) || null;

  function hideLoading() {
    loading.hidden = true;
  }

  function formatDate(value) {
    if (!value) return "Date not available";

    const date = new Date(value + "T00:00:00");
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("en-NZ", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function setSectionExpanded(button, content, expanded) {
    button.setAttribute("aria-expanded", expanded ? "true" : "false");
    content.hidden = !expanded;
  }

  function bookingCountLabel(count) {
    return count + (count === 1 ? " booking" : " bookings");
  }

  upcomingToggle.addEventListener("click", function () {
    const expanded = upcomingToggle.getAttribute("aria-expanded") === "true";
    setSectionExpanded(upcomingToggle, upcomingBookings, !expanded);
  });

  pastToggle.addEventListener("click", function () {
    const expanded = pastToggle.getAttribute("aria-expanded") === "true";
    setSectionExpanded(pastToggle, pastBookings, !expanded);
  });

  function statusLabel(status) {
    const value = String(status || "").toLowerCase();

    if (value === "approved") return "Approved";
    if (value === "pending") return "Pending Review";
    if (value === "declined") return "Declined";

    return status || "Unknown";
  }

  function statusClass(status) {
    const value = String(status || "").toLowerCase();

    if (value === "approved") return "status-approved";
    if (value === "pending") return "status-pending";
    if (value === "declined") return "status-declined";

    return "status-other";
  }

  function complianceTypeLabel(type) {
    const labels = {
      EWoF: "Electrical Warrant of Fitness",
      INSURANCE: "Marine Insurance",
      SHORE_POWER_LEAD_TEST: "Shore Power Lead Test",
      BIOFOULING_INSPECTION: "Biofouling Inspection"
    };

    return labels[type] || String(type || "Compliance record")
      .replace(/_/g, " ")
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  function complianceDate(value) {
    if (!value) return null;

    const date = new Date(value + "T00:00:00");
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function addCalendarDays(date, days) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + days
    );
  }

  function daysFromToday(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    return Math.round((target - today) / 86400000);
  }

  function complianceState(record) {
    const expiry = complianceDate(record.expiryDate);
    if (!expiry) return "current";

    const days = daysFromToday(expiry);

    if (days < 0) return "expired";
    if (days <= 30) return "due";

    return "current";
  }

  function renderComplianceReminders() {
    complianceReminderList.innerHTML = "";

    const records = allComplianceDocuments
      .filter(function (record) {
        return Boolean(record.expiryDate);
      })
      .sort(function (a, b) {
        return new Date(a.expiryDate).getTime() -
          new Date(b.expiryDate).getTime();
      });

    if (!records.length) {
      compliancePanel.hidden = true;
      return;
    }

    compliancePanel.hidden = false;

    records.forEach(function (record) {
      const expiry = complianceDate(record.expiryDate);
      const state = complianceState(record);

      const card = document.createElement("article");
      card.className = "compliance-reminder-card";

      const details = document.createElement("div");

      const title = document.createElement("div");
      title.className = "compliance-reminder-title";
      title.textContent = complianceTypeLabel(record.type);

      const date = document.createElement("div");
      date.className = "compliance-reminder-date";

      if (state === "expired") {
        date.textContent = "Expired " + formatDate(record.expiryDate);
      } else if (state === "due") {
        date.textContent = "Expires " + formatDate(record.expiryDate);
      } else {
        const reminderDate = addCalendarDays(expiry, -30);
        date.textContent =
          "Renewal reminder " +
          formatDate(reminderDate.toISOString().slice(0, 10)) +
          " · Expires " +
          formatDate(record.expiryDate);
      }

      const badge = document.createElement("span");
      badge.className = "compliance-badge compliance-badge-" + state;
      badge.textContent =
        state === "expired"
          ? "Expired"
          : state === "due"
            ? "Renew soon"
            : "Current";

      details.appendChild(title);
      details.appendChild(date);

      card.appendChild(details);
      card.appendChild(badge);

      complianceReminderList.appendChild(card);
    });
  }

  function sameCalendarDay(date, value) {
    if (!value) return false;
    const bookingDate = new Date(value + "T00:00:00");

    return !Number.isNaN(bookingDate.getTime()) &&
      bookingDate.getFullYear() === date.getFullYear() &&
      bookingDate.getMonth() === date.getMonth() &&
      bookingDate.getDate() === date.getDate();
  }

  function bookingCoversDay(booking, date) {
    const start = new Date(booking.startDate + "T00:00:00");
    const end = new Date(booking.endDate + "T00:00:00");

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return false;
    }

    const day = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    return day >= start && day <= end;
  }

  function calendarBookingClass(status) {
    const value = String(status || "").toLowerCase();

    if (value === "approved") return "approved";
    if (value === "pending") return "pending";
    if (value === "declined") return "declined";

    return "other";
  }

  function renderCalendar() {
    calendarGrid.innerHTML = "";

    calendarTitle.textContent = new Intl.DateTimeFormat("en-NZ", {
      month: "long",
      year: "numeric"
    }).format(calendarMonth);

    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((label) => {
      const weekday = document.createElement("div");
      weekday.className = "calendar-weekday";
      weekday.textContent = label;
      calendarGrid.appendChild(weekday);
    });

    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);

    // Convert Sunday-based JS day to Monday-based calendar position.
    const daysBefore = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - daysBefore);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let index = 0; index < 42; index += 1) {
      const date = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index
      );

      const day = document.createElement("div");
      day.className = "calendar-day";

      if (date.getMonth() !== month) {
        day.classList.add("other-month");
      }

      if (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      ) {
        day.classList.add("today");
      }

      const dateLabel = document.createElement("span");
      dateLabel.className = "calendar-date";
      dateLabel.textContent = String(date.getDate());
      day.appendChild(dateLabel);

      allBookings
        .filter((booking) => bookingCoversDay(booking, date))
        .forEach((booking) => {
          const marina = currentMarinaMap.get(Number(booking.marinaId));
          const mooring = currentMooringMap.get(Number(booking.mooringId));

          const item = document.createElement("span");
          item.className =
            "calendar-booking " + calendarBookingClass(booking.status);

          const location =
            mooring?.name ||
            marina?.name ||
            "Marina booking";

          item.textContent =
            location + " · " + statusLabel(booking.status);

          item.title =
            (marina?.name || "Marina") +
            " — " +
            (mooring?.name || "Berth or mooring") +
            " — " +
            formatDate(booking.startDate) +
            " to " +
            formatDate(booking.endDate);

          day.appendChild(item);
        });

      allComplianceDocuments.forEach(function (record) {
        const expiry = complianceDate(record.expiryDate);
        if (!expiry) return;

        const reminderDate = addCalendarDays(expiry, -30);
        const label = complianceTypeLabel(record.type);
        const state = complianceState(record);

        const isReminderDay =
          date.getFullYear() === reminderDate.getFullYear() &&
          date.getMonth() === reminderDate.getMonth() &&
          date.getDate() === reminderDate.getDate();

        const isExpiryDay =
          date.getFullYear() === expiry.getFullYear() &&
          date.getMonth() === expiry.getMonth() &&
          date.getDate() === expiry.getDate();

        if (isReminderDay) {
          const reminder = document.createElement("span");
          reminder.className =
            "calendar-booking " +
            (state === "expired"
              ? "compliance-expired"
              : "compliance-reminder");
          reminder.textContent = label + " · renew within 30 days";
          day.appendChild(reminder);
        }

        if (isExpiryDay) {
          const expiryItem = document.createElement("span");
          expiryItem.className =
            "calendar-booking " +
            (state === "expired"
              ? "compliance-expired"
              : "compliance-expiry");
          expiryItem.textContent =
            label +
            (state === "expired" ? " · expired" : " · expires today");
          day.appendChild(expiryItem);
        }
      });

      calendarGrid.appendChild(day);
    }
  }

  function showAgendaView() {
    agendaView.hidden = false;
    calendarView.hidden = true;
    agendaViewButton.classList.add("active");
    calendarViewButton.classList.remove("active");
  }

  function showCalendarView() {
    agendaView.hidden = true;
    calendarView.hidden = false;
    agendaViewButton.classList.remove("active");
    calendarViewButton.classList.add("active");
    renderCalendar();
  }

  agendaViewButton.addEventListener("click", showAgendaView);
  calendarViewButton.addEventListener("click", showCalendarView);

  previousMonth.addEventListener("click", function () {
    calendarMonth = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() - 1,
      1
    );
    renderCalendar();
  });

  nextMonth.addEventListener("click", function () {
    calendarMonth = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + 1,
      1
    );
    renderCalendar();
  });

  function bookingCard(booking, marinaMap, mooringMap) {
    const marina = marinaMap.get(Number(booking.marinaId));
    const mooring = mooringMap.get(Number(booking.mooringId));

    const card = document.createElement("article");
    card.className = "booking-card";

    const top = document.createElement("div");
    top.className = "booking-top";

    const details = document.createElement("div");

    const marinaName = document.createElement("div");
    marinaName.className = "marina";
    marinaName.textContent = marina ? marina.name : "Marina";

    const mooringName = document.createElement("div");
    mooringName.className = "mooring";
    mooringName.textContent = mooring ? mooring.name : "Berth or mooring";

    details.appendChild(marinaName);
    details.appendChild(mooringName);

    const status = document.createElement("span");
    status.className = "status " + statusClass(booking.status);
    status.textContent = statusLabel(booking.status);

    top.appendChild(details);
    top.appendChild(status);

    const dates = document.createElement("div");
    dates.className = "dates";
    dates.textContent =
      formatDate(booking.startDate) + " – " + formatDate(booking.endDate);

    const reference = document.createElement("div");
    reference.className = "reference";
    reference.textContent = "Booking reference: " + booking.id;

    card.appendChild(top);
    card.appendChild(dates);
    card.appendChild(reference);

    return card;
  }

  async function fetchJson(url) {
    const response = await fetch(url);
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error("The server returned an unreadable response.");
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || "Request failed.");
    }

    return data;
  }

  async function load() {
    if (!ownerId || !vesselId) {
      hideLoading();
      noIdentity.hidden = false;
      return;
    }

    try {
      const results = await Promise.all([
        fetchJson(
          "/api/bookings/mine?ownerId=" +
          encodeURIComponent(ownerId) +
          "&vesselId=" +
          encodeURIComponent(vesselId)
        ),
        fetchJson("/api/marinas"),
        fetchJson("/api/moorings"),
        fetchJson(
          "/api/vessel-documents?vesselId=" +
          encodeURIComponent(vesselId)
        )
      ]);

      const bookingData = results[0];
      const marinaData = results[1];
      const mooringData = results[2];
      const complianceData = results[3];

      const bookings = Array.isArray(bookingData.results)
        ? bookingData.results
        : [];

      allBookings = bookings;
      allComplianceDocuments = Array.isArray(complianceData)
        ? complianceData
        : [];

      const marinas = Array.isArray(marinaData)
        ? marinaData
        : (marinaData.marinas || []);

      const moorings = Array.isArray(mooringData)
        ? mooringData
        : (mooringData.moorings || []);

      const marinaMap = new Map(
        marinas.map((marina) => [Number(marina.id), marina])
      );

      const mooringMap = new Map(
        moorings.map((mooring) => [Number(mooring.id), mooring])
      );

      currentMarinaMap = marinaMap;
      currentMooringMap = mooringMap;

      hideLoading();
      renderComplianceReminders();

      if (!bookings.length) {
        empty.hidden = false;
        viewSwitch.hidden = true;
        bookingSummary.hidden = true;
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcoming = [];
      const past = [];

      bookings.forEach((booking) => {
        const endDate = new Date(booking.endDate + "T00:00:00");

        if (!Number.isNaN(endDate.getTime()) && endDate >= today) {
          upcoming.push(booking);
        } else {
          past.push(booking);
        }
      });

      viewSwitch.hidden = false;
      bookingSummary.hidden = false;
      upcomingCount.textContent = String(upcoming.length);
      pastCount.textContent = String(past.length);
      upcomingHeadingCount.textContent = bookingCountLabel(upcoming.length);
      pastHeadingCount.textContent = bookingCountLabel(past.length);

      if (upcoming.length) {
        upcomingSection.hidden = false;
        setSectionExpanded(upcomingToggle, upcomingBookings, true);

        upcoming.forEach((booking) => {
          upcomingBookings.appendChild(
            bookingCard(booking, marinaMap, mooringMap)
          );
        });
      }

      if (past.length) {
        pastSection.hidden = false;
        setSectionExpanded(pastToggle, pastBookings, false);

        past
          .sort((a, b) =>
            new Date(b.startDate).getTime() -
            new Date(a.startDate).getTime()
          )
          .forEach((booking) => {
            pastBookings.appendChild(
              bookingCard(booking, marinaMap, mooringMap)
            );
          });
      }
    } catch (err) {
      hideLoading();
      error.textContent = "My Bookings could not be loaded: " + err.message;
      error.hidden = false;
    }
  }

  load();
})();
