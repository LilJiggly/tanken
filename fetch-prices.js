import fs from "fs";
import fetch from "node-fetch";
import { load } from "cheerio";

const DATA_FILE = "./prices.json";

// lokale datum (geen UTC-bug)
const d = new Date();
const TODAY =
  d.getFullYear() +
  "-" +
  String(d.getMonth() + 1).padStart(2, "0") +
  "-" +
  String(d.getDate()).padStart(2, "0");

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
  {
    id: "bp_weesp",
    name: "BP Weesp",
    url: "https://tankstation.nl/tankstation/bp-weesp/",
    type: "tankstation_nl",
    selector: ".price",
  },
  {
    id: "esso_express_weesp",
    name: "ESSO Express Weesp",
    url: "https://tankstation.nl/tankstation/esso-express-weesp/",
    type: "tankstation_nl",
    selector: ".price",
  },
];

// ---------- helpers ----------

function parseTankstationNlPrice($price) {
  const euros = $price.clone().children().remove().end().text();
  const cents = $price.find("small").eq(0).text();
  const mills = $price.find("small").eq(1).text();

  return parseFloat(`${euros.replace("€", "").trim()}${cents}${mills}`);
}

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { lastUpdated: null, stations: {} };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ---------- fetchers ----------

async function fetchTinQPrice(station) {
  const res = await fetch(station.url);
  const html = await res.text();

  const $ = load(html);
  const elements = $(station.selector);

  if (!elements.length) {
    throw new Error("Geen TinQ prijzen gevonden");
  }

  const prices = [];
  elements.each((_, el) => {
    const value = Number($(el).attr("content"));
    if (!Number.isNaN(value)) prices.push(value);
  });

  if (!prices.length) {
    throw new Error("Geen geldige TinQ prijzen");
  }

  return Math.max(...prices);
}

async function fetchTangoPrice(station) {
  const res = await fetch(station.url);
  const html = await res.text();
  const $ = load(html);

  const dt = $("dt")
    .filter((_, el) => $(el).text().includes("Pompprijs"))
    .first();

  const dd = dt.next("dd");
  const raw = dd.text();

  const price = Number(raw.replace(",", ".").replace(/[^0-9.]/g, ""));
  if (Number.isNaN(price)) {
    throw new Error("Tango prijs ongeldig");
  }

  return price;
}

async function fetchTankstationNlPrice(station) {
  const res = await fetch(station.url);
  const html = await res.text();

  const $ = load(html);
  const el = $(station.selector).first();

  if (!el.length) {
    throw new Error(`${station.name}: prijs niet gevonden`);
  }

  const price = parseTankstationNlPrice(el);
  if (Number.isNaN(price)) {
    throw new Error(`${station.name}: prijs ongeldig`);
  }

  return price;
}

// ---------- main ----------

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
    const exists = history.some((e) => e.date === TODAY);

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
    } else if (station.type === "tankstation_nl") {
      price = await fetchTankstationNlPrice(station);
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
