(function () {
  "use strict";

  const elements = {
    marinaContext: document.getElementById("marinaContext"),
    briefDate: document.getElementById("briefDate"),
    briefKnow: document.getElementById("briefKnow"),
    briefDo: document.getElementById("briefDo"),
    briefThink: document.getElementById("briefThink"),
    briefPriority: document.getElementById("briefPriority"),
    readinessState: document.getElementById("readinessState"),
    readinessText: document.getElementById("readinessText"),
    actionList: document.getElementById("actionList"),
    bookingHealthState: document.getElementById("bookingHealthState"),
    bookingHealthText: document.getElementById("bookingHealthText"),
    occupancyHealthState: document.getElementById("occupancyHealthState"),
    occupancyHealthText: document.getElementById("occupancyHealthText")
  };

  function plural(count, singular, pluralWord) {
    return count === 1 ? singular : (pluralWord || `${singular}s`);
  }

  function setLabelledText(element, label, text) {
    if (!element) return;

    element.replaceChildren();

    const strong = document.createElement("b");
    strong.textContent = label;

    element.appendChild(strong);
    element.appendChild(document.createTextNode(` ${text}`));
  }

  function updateBriefDate(generatedAt) {
    if (!elements.briefDate) return;

    const date = new Date(generatedAt);

    const formattedDate = new Intl.DateTimeFormat("en-NZ", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);

    const formattedTime = new Intl.DateTimeFormat("en-NZ", {
      hour: "numeric",
      minute: "2-digit"
    }).format(date);

    elements.briefDate.textContent =
      `${formattedDate} · Live operational briefing updated ${formattedTime}`;
  }

  function setHealthState(element, stateClass, label) {
    if (!element) return;

    element.classList.remove(
      "health-green",
      "health-amber",
      "health-red"
    );

    element.classList.add(stateClass);
    element.textContent = label;
  }

  function createActionCard(action) {
    const article = document.createElement("article");
    article.className = "action-card";

    const impactWrap = document.createElement("div");
    const impact = document.createElement("span");
    impact.className = `impact ${action.impactClass}`;
    impact.textContent = action.impactLabel;
    impactWrap.appendChild(impact);

    const main = document.createElement("div");
    main.className = "action-main";

    const title = document.createElement("h3");
    title.textContent = action.title;

    const why = document.createElement("p");
    const whyLabel = document.createElement("b");
    whyLabel.textContent = "Why this matters:";
    why.appendChild(whyLabel);
    why.appendChild(document.createTextNode(` ${action.why}`));

    const recommendation = document.createElement("p");
    const recommendationLabel = document.createElement("b");
    recommendationLabel.textContent = "Recommended action:";
    recommendation.appendChild(recommendationLabel);
    recommendation.appendChild(
      document.createTextNode(` ${action.recommendation}`)
    );

    const consequence = document.createElement("p");
    const consequenceLabel = document.createElement("b");
    consequenceLabel.textContent = "Consequence if ignored:";
    consequence.appendChild(consequenceLabel);
    consequence.appendChild(
      document.createTextNode(` ${action.consequence}`)
    );

    main.appendChild(title);
    main.appendChild(why);
    main.appendChild(recommendation);
    main.appendChild(consequence);

    const value = document.createElement("div");
    value.className = "action-value";

    const valueLabel = document.createElement("div");
    valueLabel.className = "action-value-label";
    valueLabel.textContent = "Value Created";

    const valuePill = document.createElement("span");
    valuePill.className = "value-pill";
    valuePill.textContent = action.value;

    value.appendChild(valueLabel);
    value.appendChild(valuePill);

    article.appendChild(impactWrap);
    article.appendChild(main);
    article.appendChild(value);

    return article;
  }

  function renderActionCentre(summary) {
    if (!elements.actionList) return;

    const actions = [];
    const pending = summary.bookings.currentPending;
    const arrivals = summary.movements.arrivalsToday;
    const departures = summary.movements.departuresToday;
    const occupancyPercent = summary.occupancy.percent;
    const available = summary.occupancy.availableMoorings;

    if (pending > 0) {
      actions.push({
        impactClass: "impact-high",
        impactLabel: "High Impact",
        title: `Review ${pending} current ${plural(pending, "pending booking request")}`,
        why:
          "Unresolved booking decisions delay berth allocation and leave customers without certainty.",
        recommendation:
          "Open the Operator Inbox and complete the pending booking reviews.",
        consequence:
          "Capacity may remain unnecessarily idle and future allocations may be delayed.",
        value: "Increases Capacity"
      });
    }

    if (arrivals > 0) {
      actions.push({
        impactClass: "impact-medium",
        impactLabel: "Medium Impact",
        title: `Confirm readiness for ${arrivals} approved ${plural(arrivals, "arrival")} today`,
        why:
          "Arrival readiness supports efficient berth occupation and a reliable customer experience.",
        recommendation:
          "Confirm berth availability and review the approved arrival details.",
        consequence:
          "An unprepared arrival may create avoidable operational disruption.",
        value: "Prevents Loss"
      });
    }

    if (departures > 0) {
      actions.push({
        impactClass: "impact-medium",
        impactLabel: "Medium Impact",
        title: `Confirm ${departures} approved ${plural(departures, "departure")} today`,
        why:
          "Confirmed departures improve the accuracy of current capacity and berth-turnaround planning.",
        recommendation:
          "Confirm departure timing and update the berth position when the vessel leaves.",
        consequence:
          "Available capacity may be understated or the next allocation may be delayed.",
        value: "Increases Capacity"
      });
    }

    if (available === 0 && summary.occupancy.totalMoorings > 0) {
      actions.push({
        impactClass: "impact-high",
        impactLabel: "High Impact",
        title: "Review full marina occupancy",
        why:
          "All listed moorings are currently occupied, leaving no immediate operational capacity.",
        recommendation:
          "Review today's departures and future booking requests before confirming further allocations.",
        consequence:
          "A new allocation could create a berth conflict or require an alternative arrangement.",
        value: "Prevents Loss"
      });
    } else if (occupancyPercent >= 80) {
      actions.push({
        impactClass: "impact-medium",
        impactLabel: "Medium Impact",
        title: "Monitor high current occupancy",
        why:
          `Current occupancy is ${occupancyPercent}%, reducing flexibility for new or changed allocations.`,
        recommendation:
          "Review upcoming movements before approving additional bookings.",
        consequence:
          "Reduced capacity flexibility may create avoidable allocation pressure.",
        value: "Increases Capacity"
      });
    }

    if (actions.length === 0) {
      actions.push({
        impactClass: "impact-medium",
        impactLabel: "Routine",
        title: "Maintain routine operational oversight",
        why:
          "No current booking, arrival, departure or capacity issue requires priority intervention.",
        recommendation:
          "Continue routine monitoring and process new operational activity as it arises.",
        consequence:
          "No immediate material consequence has been identified.",
        value: "Reduces Cost"
      });
    }

    elements.actionList.replaceChildren(
      ...actions.slice(0, 4).map(createActionCard)
    );
  }

  function renderMarinaHealth(summary) {
    const pending = summary.bookings.currentPending;
    const occupancyPercent = summary.occupancy.percent;
    const totalMoorings = summary.occupancy.totalMoorings;

    if (pending === 0) {
      setHealthState(
        elements.bookingHealthState,
        "health-green",
        "Healthy"
      );

      if (elements.bookingHealthText) {
        elements.bookingHealthText.textContent =
          "No current booking approvals are outstanding.";
      }
    } else if (pending <= 2) {
      setHealthState(
        elements.bookingHealthState,
        "health-amber",
        "Attention"
      );

      if (elements.bookingHealthText) {
        elements.bookingHealthText.textContent =
          `${pending} current ${plural(pending, "booking request")} require an approval decision.`;
      }
    } else {
      setHealthState(
        elements.bookingHealthState,
        "health-red",
        "Priority"
      );

      if (elements.bookingHealthText) {
        elements.bookingHealthText.textContent =
          `${pending} current booking requests are awaiting decisions and may delay allocation.`;
      }
    }

    if (totalMoorings === 0) {
      setHealthState(
        elements.occupancyHealthState,
        "health-red",
        "Unavailable"
      );

      if (elements.occupancyHealthText) {
        elements.occupancyHealthText.textContent =
          "No marina mooring inventory was available for the occupancy calculation.";
      }
    } else if (occupancyPercent >= 100) {
      setHealthState(
        elements.occupancyHealthState,
        "health-red",
        "Full"
      );

      if (elements.occupancyHealthText) {
        elements.occupancyHealthText.textContent =
          "All listed moorings are currently occupied.";
      }
    } else if (occupancyPercent >= 80) {
      setHealthState(
        elements.occupancyHealthState,
        "health-amber",
        "High"
      );

      if (elements.occupancyHealthText) {
        elements.occupancyHealthText.textContent =
          `Current occupancy is ${occupancyPercent}%, leaving limited allocation flexibility.`;
      }
    } else {
      setHealthState(
        elements.occupancyHealthState,
        "health-green",
        "Available"
      );

      if (elements.occupancyHealthText) {
        elements.occupancyHealthText.textContent =
          `Current occupancy is ${occupancyPercent}%, with ${summary.occupancy.availableMoorings} listed ${plural(summary.occupancy.availableMoorings, "mooring")} available.`;
      }
    }
  }

  function renderOperationsBrief(summary) {
    const pending = summary.bookings.currentPending;
    const arrivals = summary.movements.arrivalsToday;
    const departures = summary.movements.departuresToday;
    const occupied = summary.occupancy.occupiedMoorings;
    const total = summary.occupancy.totalMoorings;
    const available = summary.occupancy.availableMoorings;
    const occupancyPercent = summary.occupancy.percent;

    if (elements.marinaContext) {
      elements.marinaContext.textContent = summary.marina.name;
    }

    updateBriefDate(summary.generatedAt);

    setLabelledText(
      elements.briefKnow,
      "What do I need to know?",
      `${summary.marina.name} has ${arrivals} ${plural(arrivals, "approved arrival")} and ` +
      `${departures} ${plural(departures, "approved departure")} scheduled today. ` +
      `${occupied} of ${total} listed ${plural(total, "mooring")} are currently occupied.`
    );

    if (pending > 0) {
      setLabelledText(
        elements.briefDo,
        "What do I need to do?",
        `Review ${pending} current ${plural(pending, "pending booking request")}. ` +
        "Completing these decisions will clarify future berth allocation and customer readiness."
      );
    } else {
      setLabelledText(
        elements.briefDo,
        "What do I need to do?",
        "There are no current pending booking requests requiring an approval decision."
      );
    }

    setLabelledText(
      elements.briefThink,
      "What should I be thinking about?",
      `Current occupancy is ${occupancyPercent}%, leaving ${available} listed ` +
      `${plural(available, "mooring")} available today. ` +
      "This is a current operational measure and does not yet include historical demand trends."
    );

    if (pending > 0) {
      setLabelledText(
        elements.briefPriority,
        "Recommended priority:",
        `Complete the ${pending} pending ${plural(pending, "booking review")} ` +
        "before routine administration so capacity decisions are not unnecessarily delayed."
      );

      if (elements.readinessText) {
        elements.readinessText.textContent =
          `${summary.readiness.reason} Today's approved arrivals and departures are otherwise visible and manageable.`;
      }
    } else {
      setLabelledText(
        elements.briefPriority,
        "Recommended priority:",
        arrivals > 0
          ? `Confirm readiness for today's ${arrivals} approved ${plural(arrivals, "arrival")}.`
          : "Maintain routine operational oversight; no current booking approvals require attention."
      );

      if (elements.readinessText) {
        elements.readinessText.textContent =
          `${summary.readiness.reason} Today's approved movement and capacity position appear manageable.`;
      }
    }

    if (elements.readinessState) {
      elements.readinessState.textContent = summary.readiness.label;
    }
  }

  function renderLoadFailure(error) {
    console.error("Operations Centre live briefing failed:", error);

    setLabelledText(
      elements.briefKnow,
      "What do I need to know?",
      "Live operational data could not be loaded."
    );

    setLabelledText(
      elements.briefDo,
      "What do I need to do?",
      "Confirm that the BoatiesMate server is available, then refresh this page."
    );

    setLabelledText(
      elements.briefThink,
      "What should I be thinking about?",
      "The briefing should not be relied upon until its live data connection has been restored."
    );

    setLabelledText(
      elements.briefPriority,
      "Recommended priority:",
      "Restore the live operational data connection before making capacity decisions."
    );

    if (elements.readinessState) {
      elements.readinessState.textContent = "Data Unavailable";
    }

    if (elements.readinessText) {
      elements.readinessText.textContent =
        "The Operations Centre could not verify the marina's current booking position.";
    }
  }

  async function initialise() {
    const engine = window.BoatiesMateOperationsSummary;

    if (!engine || typeof engine.buildOperationsSummary !== "function") {
      renderLoadFailure(
        new Error("Operations Summary Engine is unavailable.")
      );
      return;
    }

    try {
      const summary = await engine.buildOperationsSummary();
      renderOperationsBrief(summary);
      renderActionCentre(summary);
      renderMarinaHealth(summary);
    } catch (error) {
      renderLoadFailure(error);
    }
  }

  initialise();
})();
