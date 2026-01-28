import fs from "fs";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

const MAX_DAYS = 365; // zet op null voor onbeperkt

const FILE = "./prices.json";
const TODAY = new Date().toISOString().slice(0, 10);

const STATIONS = {
  tinq_weesp_hogeweyselaan: {
    url: "https://www.tinq.nl/tankstations/weesp-hogeweyselaan",
    selector: ".price, .fuel-price",
  },
  tango_weesp_hogeweyselaan: {
    url: "https://www.tango.nl/stations/tango-weesp",
    selector: ".price, .fuel-price",
  },
};

// -----------------------------

function cleanPrice(text) {
  return Number(
    text
      .replace("€", "")
      .replace(",", ".")
      .replace(/[^0-9.]/g, ""),
  );
}

function limitDays(array) {
  if (!MAX_DAYS) return array;
  return array.slice(-MAX_DAYS);
}

async function fetchPrice(url, selector) {
  const res = await fetch(url);
  const html = await res.text();
  const dom = new JSDOM(html);
  const el = dom.window.document.querySelector(selector);

  if (!el) {
    throw new Error(`Prijs niet gevonden op ${url}`);
  }

  return cleanPrice(el.textContent);
}

async function run() {
  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));

  for (const [id, station] of Object.entries(STATIONS)) {
    const price = await fetchPrice(station.url, station.selector);
    const history = data.stations[id].fuel.e10;

    const exists = history.some((d) => d.date === TODAY);
    if (!exists) {
      history.push({ date: TODAY, price });
      data.stations[id].fuel.e10 = limitDays(history);
      console.log(`${id}: €${price}`);
    } else {
      console.log(`${id}: vandaag al aanwezig`);
    }
  }

  data.lastUpdated = TODAY;
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
