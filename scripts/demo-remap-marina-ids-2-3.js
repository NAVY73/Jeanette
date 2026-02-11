/**
 * Remap demo data marina IDs to align with live Render marinas:
 *  - 1 -> 2 (Gulf Harbour)
 *  - 2 -> 3 (Westhaven)
 *
 * Applies to:
 *  - data/moorings.json
 *  - data/bookings.json
 *  - data/demo-baseline/bookings.json
 *  - data/marinas.json (if present)
 *
 * Writes timestamped .bak backups.
 */
const fs = require("fs");
const path = require("path");

const MAP = new Map([[1,2],[2,3]]);

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
function remapId(x){
  const n = Number(x);
  if (!Number.isFinite(n)) return x;
  return MAP.has(n) ? MAP.get(n) : n;
}
function remapArray(arr){
  let changed = 0;
  for (const o of arr){
    if (o && Object.prototype.hasOwnProperty.call(o, "marinaId")){
      const before = Number(o.marinaId);
      const after = remapId(o.marinaId);
      if (before !== after){
        o.marinaId = after;
        changed++;
      }
    }
  }
  return changed;
}

function main(){
  const root = path.resolve(__dirname,"..");

  const files = [
    path.join(root,"data","moorings.json"),
    path.join(root,"data","bookings.json"),
    path.join(root,"data","demo-baseline","bookings.json"),
  ];

  // marinas.json is optional
  const marinasPath = path.join(root,"data","marinas.json");
  const hasMarinas = fs.existsSync(marinasPath);

  for (const p of files){
    if (!fs.existsSync(p)) throw new Error("Missing file: " + p);
  }

  console.log("Mapping marinaId:", Object.fromEntries(MAP));
  console.log("Backups:");

  for (const p of files){
    console.log(" ", backup(p));
  }
  if (hasMarinas) console.log(" ", backup(marinasPath));

  const moorings = read(files[0]);
  const bookings = read(files[1]);
  const baseline = read(files[2]);

  const m1 = remapArray(moorings);
  const b1 = remapArray(bookings);
  const bb1 = remapArray(baseline);

  write(files[0], moorings);
  write(files[1], bookings);
  write(files[2], baseline);

  console.log(`Updated marinaId counts: moorings=${m1}, bookings=${b1}, baseline=${bb1}`);

  if (hasMarinas){
    // Make marinas.json contain IDs 2 and 3 with correct names (demo-friendly)
    let marinas = read(marinasPath);

    // Try to find any existing entries; otherwise create minimal list
    const byId = new Map(marinas.map(m => [Number(m.id), m]));
    const gulf = byId.get(2) || { id: 2, name: "Gulf Harbour Marina" };
    gulf.id = 2; gulf.name = "Gulf Harbour Marina";
    const west = byId.get(3) || { id: 3, name: "Westhaven Marina" };
    west.id = 3; west.name = "Westhaven Marina";

    marinas = [gulf, west];
    write(marinasPath, marinas);
    console.log("Updated data/marinas.json to demo list [2,3].");
  }

  console.log("DONE");
}

main();
