// import fs from "fs";
// import fetch from "node-fetch";
// import { load } from "cheerio";

// const DATA_FILE = "./prices.json";
// const TODAY = new Date().toISOString().slice(0, 10);

// const TINQ = {
//   id: "tinq_weesp_hogeweyselaan",
//   name: "TinQ Weesp – Hogeweyselaan",
//   url: "https://www.tinq.nl/tankstations/weesp-hogeweyselaan",
//   selector: ".field--name-field-prices-price-pump",
// };

// console.log("🌍 Pagina ophalen…");

// async function fetchTinQPrice() {
//   const res = await fetch(TINQ.url);
//   const html = await res.text();

//   console.log("📄 HTML lengte:", html.length);

//   const $ = load(html);
//   const elements = $(TINQ.selector);

//   console.log("🔍 Aantal matches:", elements.length);

//   if (elements.length === 0) {
//     throw new Error("Geen prijzen gevonden op TinQ-pagina");
//   }

//   const prices = [];

//   elements.each((i, el) => {
//     const raw = $(el).attr("content");
//     const value = Number(raw);
//     if (!Number.isNaN(value)) {
//       prices.push(value);
//     }
//   });

//   if (prices.length === 0) {
//     throw new Error("Geen geldige prijswaarden gevonden");
//   }

//   const price = Math.max(...prices);

//   console.log("✅ Gekozen TinQ E10 prijs:", price);

//   return price;
// }

// function loadData() {
//   if (!fs.existsSync(DATA_FILE)) {
//     return {
//       lastUpdated: null,
//       stations: {
//         [TINQ.id]: {
//           name: TINQ.name,
//           fuel: { e10: [] },
//         },
//       },
//     };
//   }
//   return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
// }

// function saveData(data) {
//   fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
// }

// async function run() {
//   const data = loadData();

//   const history = data.stations[TINQ.id].fuel.e10;
//   const exists = history.some((entry) => entry.date === TODAY);

//   if (exists) {
//     console.log("ℹ️ TinQ prijs voor vandaag bestaat al — overslaan");
//     return;
//   }

//   const price = await fetchTinQPrice();

//   history.push({
//     date: TODAY,
//     price,
//   });

//   data.lastUpdated = TODAY;
//   saveData(data);

//   console.log("💾 Price opgeslagen in prices.json");
// }

// run().catch((err) => {
//   console.error("❌ Fout:", err.message);
//   process.exit(1);
// });

import fs from "fs";
import fetch from "node-fetch";
import { load } from "cheerio";

const DATA_FILE = "./prices.json";
const TODAY = new Date().toISOString().slice(0, 10);

const STATIONS = [
  {
    id: "tinq_weesp_hogeweyselaan",
    name: "TinQ Weesp – Hogeweyselaan",
    url: "https://www.tinq.nl/tankstations/weesp-hogeweyselaan",
    type: "tinq",
    selector: ".field--name-field-prices-price-pump",
  },
  {
    id: "tango_weesp_hogeweyselaan",
    name: "Tango Weesp – Hogeweyselaan",
    url: "https://www.tango.nl/stations/tango-weesp",
    type: "tango",
  },
];

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { lastUpdated: null, stations: {} };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

async function fetchTinQPrice(station) {
  const res = await fetch(station.url);
  const html = await res.text();

  const $ = load(html);
  const elements = $(station.selector);

  if (elements.length === 0) {
    throw new Error("Geen TinQ prijzen gevonden");
  }

  const prices = [];

  elements.each((_, el) => {
    const raw = $(el).attr("content");
    const value = Number(raw);
    if (!Number.isNaN(value)) {
      prices.push(value);
    }
  });

  if (prices.length === 0) {
    throw new Error("Geen geldige TinQ prijzen");
  }

  return Math.max(...prices); // E10
}

async function fetchTangoPrice(station) {
  const res = await fetch(station.url);
  const html = await res.text();

  const $ = load(html);

  const dt = $("dt")
    .filter((_, el) => $(el).text().includes("Pompprijs"))
    .first();

  if (!dt.length) {
    throw new Error("Tango dt 'Pompprijs' niet gevonden");
  }

  const dd = dt.next("dd");

  if (!dd.length) {
    throw new Error("Tango dd bij Pompprijs niet gevonden");
  }

  const raw = dd.text();

  const price = Number(raw.replace(",", ".").replace(/[^0-9.]/g, ""));

  if (Number.isNaN(price)) {
    throw new Error("Tango prijs is geen geldig nummer");
  }

  return price;
}

async function run() {
  const data = loadData();

  for (const station of STATIONS) {
    if (!data.stations[station.id]) {
      data.stations[station.id] = {
        name: station.name,
        fuel: { e10: [] },
      };
    }

    const history = data.stations[station.id].fuel.e10;
    const exists = history.some((entry) => entry.date === TODAY);

    if (exists) {
      console.log(`ℹ️ ${station.name}: vandaag al aanwezig`);
      continue;
    }

    console.log(`🌍 ${station.name} ophalen…`);

    let price;
    if (station.type === "tinq") {
      price = await fetchTinQPrice(station);
    } else if (station.type === "tango") {
      price = await fetchTangoPrice(station);
    }

    console.log(`✅ ${station.name} E10 prijs: €${price}`);

    history.push({ date: TODAY, price });
  }

  data.lastUpdated = TODAY;
  saveData(data);

  console.log("💾 Alle prijzen opgeslagen in prices.json");
}

run().catch((err) => {
  console.error("❌ Fout:", err.message);
  process.exit(1);
});
