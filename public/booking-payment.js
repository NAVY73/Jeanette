(function () {
  "use strict";

  const payButton = document.getElementById("payButton");
  const payButtonText = document.getElementById("payButtonText");
  const paymentResult = document.getElementById("paymentResult");

  const bookingReference = document.getElementById("bookingReference");
  const bookingStatus = document.getElementById("bookingStatus");
  const marinaName = document.getElementById("marinaName");
  const mooringName = document.getElementById("mooringName");
  const arrivalDate = document.getElementById("arrivalDate");
  const departureDate = document.getElementById("departureDate");

  const berthHireAmount = document.getElementById("berthHireAmount");
  const utilitiesAmount = document.getElementById("utilitiesAmount");
  const gstAmount = document.getElementById("gstAmount");
  const totalAmount = document.getElementById("totalAmount");

  const params = new URLSearchParams(window.location.search);
  const bookingId = Number(params.get("bookingId") || 0) || null;

  function clearPaymentFields() {
    [
      "cardholder",
      "cardNumber",
      "expiry",
      "securityCode",
      "postcode"
    ].forEach(function (id) {
      const field = document.getElementById(id);
      if (field) field.value = "";
    });
  }

  function formatDate(value) {
    if (!value) return "Date unavailable";

    const date = new Date(value + "T00:00:00");
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("en-NZ", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: "NZD"
    }).format(value);
  }

  function calculateNights(startValue, endValue) {
    const start = new Date(startValue + "T00:00:00");
    const end = new Date(endValue + "T00:00:00");

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return 1;
    }

    const nights = Math.round((end - start) / 86400000);
    return Math.max(1, nights);
  }

  function statusLabel(status) {
    const value = String(status || "").toLowerCase();

    if (value === "approved") return "Approved – Payment Required";
    if (value === "pending") return "Pending Marina Approval";
    if (value === "declined") return "Declined";

    return status || "Booking";
  }

  async function fetchJson(url) {
    const response = await fetch(url);
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error("The server returned an unreadable response.");
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        "The booking could not be loaded."
      );
    }

    return data;
  }

  function populateBooking(booking, marinas, moorings) {
    const marina = marinas.find(function (item) {
      return Number(item.id) === Number(booking.marinaId);
    });

    const mooring = moorings.find(function (item) {
      return Number(item.id) === Number(booking.mooringId);
    });

    bookingReference.textContent = "#" + booking.id;
    bookingStatus.textContent = statusLabel(booking.status);
    marinaName.textContent = marina ? marina.name : "Marina";
    mooringName.textContent =
      mooring ? mooring.name : "Berth or mooring";
    arrivalDate.textContent = formatDate(booking.startDate);
    departureDate.textContent = formatDate(booking.endDate);

    const nights = calculateNights(
      booking.startDate,
      booking.endDate
    );

    // Demonstration pricing only.
    const nightlyRate = 85;
    const utilities = 40;
    const berthHire = nights * nightlyRate;
    const subtotal = berthHire + utilities;
    const gst = subtotal * 0.15;
    const total = subtotal + gst;

    berthHireAmount.textContent =
      formatCurrency(berthHire) +
      " (" +
      nights +
      (nights === 1 ? " night" : " nights") +
      " × " +
      formatCurrency(nightlyRate) +
      ")";

    utilitiesAmount.textContent = formatCurrency(utilities);
    gstAmount.textContent = formatCurrency(gst);
    totalAmount.textContent = formatCurrency(total);
    payButtonText.textContent =
      "🔒 Pay " + formatCurrency(total) + " Securely";

    if (String(booking.status || "").toLowerCase() !== "approved") {
      payButton.disabled = true;
      payButton.style.opacity = "0.55";
      payButton.style.cursor = "not-allowed";
      paymentResult.textContent =
        "Payment becomes available after marina approval.";
      paymentResult.hidden = false;
    }
  }

  async function loadBooking() {
    if (!bookingId) {
      paymentResult.textContent =
        "Demonstration booking values are shown. Open this page from an approved booking to load its live details.";
      paymentResult.hidden = false;
      return;
    }

    try {
      const results = await Promise.all([
        fetchJson("/api/bookings/" + encodeURIComponent(bookingId)),
        fetchJson("/api/marinas"),
        fetchJson("/api/moorings")
      ]);

      const bookingData = results[0];
      const marinaData = results[1];
      const mooringData = results[2];

      const booking = bookingData.booking;
      const marinas = Array.isArray(marinaData)
        ? marinaData
        : (marinaData.marinas || []);
      const moorings = Array.isArray(mooringData)
        ? mooringData
        : (mooringData.moorings || []);

      if (!booking) {
        throw new Error("Booking details were not returned.");
      }

      populateBooking(booking, marinas, moorings);
    } catch (error) {
      paymentResult.textContent =
        "Booking payment details could not be loaded: " +
        error.message;
      paymentResult.hidden = false;
      payButton.disabled = true;
      payButton.style.opacity = "0.55";
      payButton.style.cursor = "not-allowed";
    }
  }

  payButton.addEventListener("click", function () {
    if (payButton.disabled) return;

    clearPaymentFields();
    paymentResult.textContent =
      "Prototype demonstration only. No payment has been processed.";
    paymentResult.hidden = false;
    paymentResult.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  });

  loadBooking();
})();
