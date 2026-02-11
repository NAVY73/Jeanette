/**
 * Curate demo dataset so RESET restores an operator-ready inbox:
 * - Keep all approved + declined bookings (realism)
 * - Keep ONLY a small set of pending bookings (approve-ready)
 *
 * Target pending booking IDs:
 *  - 19 (swing, marina 1)
 *  - 26 (berth, marina 1)
 *  - 101 (berth, marina 2)
 *
 * Updates:
 *  - data/bookings.json
 *  - data/demo-baseline/bookings.json
 *
 * Writes timestamped .bak backups.
 */
const fs = require("fs");
const path = require("path");

const KEEP_PENDING_IDS = new Set([19, 26, 101]);

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
function read(p){ return JSON.parse(fs.readFileSync(p,"utf8")); }
function write(p,obj){ fs.writeFileSync(p, JSON.stringify(obj,null,2)+"\n","utf8"); }
function backup(p){
  const b = `${p}.bak-${stamp()}`;
  fs.copyFileSync(p,b);
  return b;
}

function curate(list){
  const out = [];
  let keptPending=0, droppedPending=0;
  for (const b of list){
    const status = String(b.status||"").toLowerCase();
    if (status === "pending"){
      if (KEEP_PENDING_IDS.has(Number(b.id))){
        out.push(b); keptPending++;
      } else {
        droppedPending++;
      }
    } else {
      // keep approved/declined/anything else
      out.push(b);
    }
  }
  return { out, keptPending, droppedPending };
}

function main(){
  const root = path.resolve(__dirname,"..");
  const livePath = path.join(root,"data","bookings.json");
  const basePath = path.join(root,"data","demo-baseline","bookings.json");

  const live = read(livePath);
  const base = read(basePath);

  const liveRes = curate(live);
  const baseRes = curate(base);

  console.log("Will keep pending booking IDs:", Array.from(KEEP_PENDING_IDS).sort((a,b)=>a-b).join(", "));
  console.log(`LIVE: keptPending=${liveRes.keptPending}, droppedPending=${liveRes.droppedPending}, total=${live.length} -> ${liveRes.out.length}`);
  console.log(`BASE: keptPending=${baseRes.keptPending}, droppedPending=${baseRes.droppedPending}, total=${base.length} -> ${baseRes.out.length}`);

  // Sanity: ensure the 3 IDs exist in both datasets
  function check(list, label){
    const ids = new Set(list.map(b=>Number(b.id)));
    const missing = Array.from(KEEP_PENDING_IDS).filter(id=>!ids.has(id));
    if (missing.length) {
      console.log(`${label}: MISSING required booking IDs: ${missing.join(", ")}`);
      process.exit(1);
    }
  }
  check(live, "LIVE before");
  check(base, "BASE before");

  console.log("Backups:");
  console.log(" ", backup(livePath));
  console.log(" ", backup(basePath));

  write(livePath, liveRes.out);
  write(basePath, baseRes.out);

  console.log("DONE");
}

main();
