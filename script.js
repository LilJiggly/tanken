const statusEl = document.getElementById("status");
const outputEl = document.getElementById("output");

fetch("prices.json")
  .then((res) => {
    if (!res.ok) {
      throw new Error("Kon prices.json niet laden");
    }
    return res.json();
  })
  .then((data) => {
    statusEl.textContent = "✅ prices.json geladen";

    outputEl.textContent = JSON.stringify(data, null, 2);

    // Extra check
    const tinq =
      data.stations?.tinq_weesp_hogeweyselaan?.fuel?.e10?.length ?? 0;
    const tango =
      data.stations?.tango_weesp_hogeweyselaan?.fuel?.e10?.length ?? 0;

    statusEl.textContent += ` — TinQ: ${tinq} dagen, Tango: ${tango} dagen`;
  })
  .catch((err) => {
    statusEl.textContent = "❌ Fout bij laden van data";
    outputEl.textContent = err.message;
  });
