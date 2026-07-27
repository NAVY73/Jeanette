(function () {
  "use strict";

  const marinaContext = document.getElementById("marinaContext");
  const briefDate = document.getElementById("briefDate");

  const selectedOperator =
    localStorage.getItem("bmOperatorEmail") ||
    localStorage.getItem("operatorEmail") ||
    "";

  const marinaName =
    selectedOperator.indexOf("westhaven") !== -1
      ? "Westhaven Marina"
      : "Gulf Harbour Marina";

  marinaContext.textContent = marinaName;

  const now = new Date();
  briefDate.textContent =
    new Intl.DateTimeFormat("en-NZ", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(now) +
    " · Demonstration briefing";
})();
