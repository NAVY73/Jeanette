/**
 * Normalize demo data to only marinaId 1 and 2.
 * Any records with marinaId=3 are moved to marinaId=2.
 *
 * Updates:
 * - data/moorings.json
 * - data/bookings.json
 * - data/demo-baseline/bookings.json
 *
 * Writes timestamped .bak backups.
 */
const fs = require("fs");
const path = require("path");

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function read(p){ return JSON.parse(fs.readFileSync(p,"utf8")); }
function write(p,obj){ fs.writeFileSync(p, JSON.stringify(obj,null,2)+"\n", "utf8"); }
function backup(p){
  const b = `${p}.bak-${stamp()}`;
  fs.copyFileSync(p,b);
  return b;
}

function main(){
  const root = path.resolve(__dirname,"..");
  const mooringsPath = path.join(root,"data","moorings.json");
  const bookingsPath = path.join(root,"data","bookings.json");
  const baselinePath = path.join(root,"data","demo-baseline","bookings.json");

  const moorings = read(mooringsPath);
  const bookings = read(bookingsPath);
  const baseline = read(baselinePath);

  const FROM = 3;
  const TO = 2;

  let mChanged=0, bChanged=0, bbChanged=0;

  for (const m of moorings){
    if (Number(m.marinaId) === FROM){ m.marinaId = TO; mChanged++; }
  }
  for (const b of bookings){
    if (Number(b.marinaId) === FROM){ b.marinaId = TO; bChanged++; }
  }
  for (const b of baseline){
    if (Number(b.marinaId) === FROM){ b.marinaId = TO; bbChanged++; }
  }

  console.log(`Will move marinaId ${FROM} -> ${TO}`);
  console.log(`Moorings changed: ${mChanged}`);
  console.log(`Bookings changed: ${bChanged}`);
  console.log(`Baseline bookings changed: ${bbChanged}`);

  console.log("Backups:");
  console.log(" ", backup(mooringsPath));
  console.log(" ", backup(bookingsPath));
  console.log(" ", backup(baselinePath));

  write(mooringsPath, moorings);
  write(bookingsPath, bookings);
  write(baselinePath, baseline);

  console.log("DONE");
}

main();
