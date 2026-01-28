import fs from "fs";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

const FILE = "./prices.json";
const TODAY = new Date().toISOString().slice(0, 10);

const TINQ = {
  id: "tinq_weesp_hogeweyselaan",
  url: "https://www.tinq.nl/tankstations/weesp-hogeweyselaan",
  selector: ".field--name-field-prices-price-pump",
};

async function fetchTinQPrice() {
  const res = await fetch(TINQ.url);
  const html = await res.text();

  const dom = new JSDOM(html);
  const el = dom.window.document.querySelector(TINQ.selector);

  if (!el) {
    throw new Error("TinQ prijs-element niet gevonden");
  }

  const raw = el.getAttribute("content") || el.textContent;

  const price = Number(raw.replace(",", ".").replace(/[^0-9.]/g, ""));

  if (Number.isNaN(price)) {
    throw new Error("TinQ prijs is geen geldig nummer");
  }

  return price;
}

async function run() {
  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));

  const price = await fetchTinQPrice();
  const history = data.stations[TINQ.id].fuel.e10;

  const exists = history.some((entry) => entry.date === TODAY);

  if (!exists) {
    history.push({ date: TODAY, price });
    console.log(`✅ TinQ prijs toegevoegd: €${price}`);
  } else {
    console.log("ℹ️ TinQ prijs voor vandaag bestaat al");
  }

  data.lastUpdated = TODAY;
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

run().catch((err) => {
  console.error("❌ Fout:", err.message);
  process.exit(1);
});
