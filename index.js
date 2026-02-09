const express = require('express');
const cors = require('cors');

const bookingsRouter = require('./routes/booking');
console.log('BOOKINGS ROUTER LOADED FROM:', require.resolve('./routes/booking'));
const mooringsRouter = require('./routes/moorings');
const ownersRouter = require('./routes/owners');
const vesselsRouter = require('./routes/vessels');
const authRouter = require('./routes/auth');
const availabilityRouter = require('./routes/availability');
const crypto = require('crypto');
const { errorMiddleware } = require('./middleware/errorMiddleware');
const ownerProfileRouter = require('./routes/ownerProfile');
const vesselProfileRouter = require('./routes/vesselProfile');
const vesselDocumentsRouter = require('./routes/vesselDocuments');
const marinaRequirementsRouter = require('./routes/marinaRequirements');
const applicationPackRouter = require('./routes/applicationPack');
const complianceRouter = require('./routes/compliance');
const marinasRouter = require("./routes/marinas");
const decisionIntelRoutes = require("./routes/decisionIntel");

function requestIdMiddleware(req, res, next) {
  req.requestId = crypto.randomBytes(6).toString('hex'); // 12 chars
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

const app = express();
const PORT = process.env.PORT || 3000;

const path = require("path");

app.use(express.json());
app.use(requestIdMiddleware);
app.use(cors());

// Serve the Demo Home (public/index.html) at "/"
app.use(express.static(path.join(__dirname, "public")));

// Keep API / logic routes AFTER static so "/" isn't hijacked
app.use(decisionIntelRoutes);

app.use('/api/bookings', bookingsRouter);
app.use('/api/moorings', mooringsRouter);
app.use('/api/owners', ownersRouter);
app.use('/api/vessels', vesselsRouter);
app.use('/api/auth', authRouter);
app.use('/api/availability', availabilityRouter);
app.use(errorMiddleware);
app.use('/api/owner', ownerProfileRouter);
app.use('/api/vessel', vesselProfileRouter);
app.use('/api/vessel-documents', vesselDocumentsRouter);
app.use('/api/marinas', marinaRequirementsRouter);
app.use('/api/application-pack', applicationPackRouter);
app.use('/api/compliance', complianceRouter);
app.use("/api/marinas", marinasRouter);

// --- Server bootstrap (hold a real server reference so Node stays alive) ---
const http = require("http");

const server = http.createServer(app);

server.on("error", (err) => {
  console.error("SERVER ERROR:", err);
});

server.on("close", () => {
  console.error("SERVER CLOSED (unexpected)");
});


// ===== Phase 12: Demo Reset Endpoint =====
const fs = require("fs");

  // ===== Phase 13: Protect demo admin endpoints in production =====
  const isProd = process.env.NODE_ENV === "production";
  const DEMO_ADMIN_KEY = process.env.DEMO_ADMIN_KEY || "";

  function requireDemoAdminKey(req, res) {
    if (!isProd) return true; // local/dev: allow

    // In production, require a configured key + matching header
    if (!DEMO_ADMIN_KEY) {
      res.status(500).json({ message: "Server misconfigured: DEMO_ADMIN_KEY not set." });
      return false;
    }

    const provided = req.get("X-Demo-Admin-Key") || "";
    if (provided !== DEMO_ADMIN_KEY) {
      res.status(403).json({ message: "Forbidden (missing or invalid demo admin key)." });
      return false;
    }

    return true;
  }
  // ===== End Phase 13 =====


app.post("/api/demo/reset", (req, res) => {
    if (!requireDemoAdminKey(req, res)) return;
    try {
    const baseline = path.join(__dirname, "data", "demo-baseline", "bookings.json");
    const live = path.join(__dirname, "data", "bookings.json");

    if (!fs.existsSync(baseline)) {
      return res.status(400).json({ message: "No baseline found. Create it first: data/demo-baseline/bookings.json" });
    }

    const raw = fs.readFileSync(baseline, "utf8");
    JSON.parse(raw); // validity check
    fs.writeFileSync(live, raw, "utf8");

    return res.json({ message: "Demo reset complete (bookings restored from baseline)." });
  } catch (e) {
    return res.status(500).json({ message: "Reset failed.", error: String(e && e.message ? e.message : e) });
  }
});

app.post("/api/demo/baseline", (req, res) => {
    if (!requireDemoAdminKey(req, res)) return;
    try {
    const baseline = path.join(__dirname, "data", "demo-baseline", "bookings.json");
    const live = path.join(__dirname, "data", "bookings.json");

    if (!fs.existsSync(live)) {
      return res.status(400).json({ message: "Live bookings not found: data/bookings.json" });
    }

    const raw = fs.readFileSync(live, "utf8");
    JSON.parse(raw); // validity check
    fs.writeFileSync(baseline, raw, "utf8");

    return res.json({ message: "Baseline refreshed (baseline updated from current bookings)." });
  } catch (e) {
    return res.status(500).json({ message: "Baseline refresh failed.", error: String(e && e.message ? e.message : e) });
  }
});

// ===== End Phase 12 =====


// ===== Phase 12: Root entrypoint (Investor-friendly) =====
app.get("/", (req, res) => res.redirect("/demo-home.html"));

  // Phase 13: simple health check endpoint
  app.get("/healthz", (req, res) => res.status(200).send("ok"));
// ===== End Phase 12 =====

server.listen(PORT, "0.0.0.0", () => {
  const host = process.env.RENDER_EXTERNAL_URL || `http://127.0.0.1:`;
  console.log("\n===================================================");
  console.log("BoatiesMate Prototype — Demo URLs (Phase 12)");
  console.log("===================================================");
  console.log("Demo Control Panel : " + host + "/demo-home.html");
  console.log("Boatie Demo         : " + host + "/boatie-demo.html");
  console.log("Operator Inbox      : " + host + "/operator-inbox.html");
  console.log("Operator Review     : " + host + "/operator-review.html?bookingId=101");
  console.log("Reset Demo Data     : POST " + host + "/api/demo/reset");
  console.log("===================================================\n");
  console.log(`Server is live at http://127.0.0.1:${PORT}`);
});

// Keep export for any future tests/tools that import the app
module.exports = { app, server };

