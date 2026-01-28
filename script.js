let currentView = "week";
let currentDate = new Date();
let chart;
let priceData;

// ---------- DATE HELPERS ----------
function todayString() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function startOf(view, date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  if (view === "day") return d;

  if (view === "week") {
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d;
  }

  if (view === "month") {
    d.setDate(1);
    return d;
  }

  if (view === "quarter") {
    const q = Math.floor(d.getMonth() / 3);
    d.setMonth(q * 3, 1);
    return d;
  }

  if (view === "year") {
    d.setMonth(0, 1);
    return d;
  }
}

function add(view, date, amount) {
  const d = new Date(date);

  if (view === "day") d.setDate(d.getDate() + amount);
  if (view === "week") d.setDate(d.getDate() + amount * 7);
  if (view === "month") d.setMonth(d.getMonth() + amount);
  if (view === "quarter") d.setMonth(d.getMonth() + amount * 3);
  if (view === "year") d.setFullYear(d.getFullYear() + amount);

  return d;
}

function filterData(data, view, date) {
  const start = startOf(view, date);
  const end = add(view, start, 1);

  return data.filter((entry) => {
    const d = new Date(entry.date);
    return d >= start && d < end;
  });
}

// ---------- CHART UPDATE ----------
function generateDatesForView(view, date) {
  const dates = [];

  if (view === "day") {
    const base = startOf("day", date);

    for (let i = -1; i <= 1; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);

      dates.push(
        d.getFullYear() +
          "-" +
          String(d.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(d.getDate()).padStart(2, "0"),
      );
    }

    return dates;
  }

  // rest blijft hetzelfde
  const start = startOf(view, date);
  const end = add(view, start, 1);
  let current = new Date(start);

  while (current < end) {
    dates.push(
      current.getFullYear() +
        "-" +
        String(current.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(current.getDate()).padStart(2, "0"),
    );
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function updateChart() {
  const tinq = filterData(
    priceData.stations.tinq_weesp_hogeweyselaan.fuel.e10,
    currentView,
    currentDate,
  );

  const tango = filterData(
    priceData.stations.tango_weesp_hogeweyselaan.fuel.e10,
    currentView,
    currentDate,
  );

  // 1. Alle datums verzamelen
  const allDates = generateDatesForView(currentView, currentDate);

  // 2. Helper om prijs per datum te vinden
  function priceFor(data, date) {
    const entry = data.find((e) => e.date === date);
    return entry ? entry.price : null;
  }

  // 3. Labels + datasets correct vullen
  chart.data.labels = allDates;

  chart.data.datasets[0].data = allDates.map((date) => priceFor(tinq, date));

  chart.data.datasets[1].data = allDates.map((date) => priceFor(tango, date));

  const isDayView = currentView === "day";

  chart.data.datasets.forEach((ds) => {
    ds.showLine = !isDayView;

    ds.pointRadius = isDayView ? 6 : 3;
    ds.pointHoverRadius = isDayView ? 8 : 4;
    ds.pointHitRadius = isDayView ? 10 : 5;
    ds.pointBackgroundColor = ds.borderColor || "#38bdf8";
  });

  chart.update();

  document.getElementById("rangeLabel").textContent =
    `${currentView.toUpperCase()} – ${startOf(currentView, currentDate).toLocaleDateString()}`;
}

function updateTodayPrices() {
  const today = todayString();

  const tinqToday = priceData.stations.tinq_weesp_hogeweyselaan.fuel.e10.find(
    (e) => e.date === today,
  );

  const tangoToday = priceData.stations.tango_weesp_hogeweyselaan.fuel.e10.find(
    (e) => e.date === today,
  );

  document.getElementById("tinqPrice").textContent =
    "TinQ vandaag: €" + (tinqToday?.price ?? "–");

  document.getElementById("tangoPrice").textContent =
    "Tango vandaag: €" + (tangoToday?.price ?? "–");
}

// ---------- INIT ----------

fetch("prices.json")
  .then((res) => res.json())
  .then((data) => {
    priceData = data;
    updateTodayPrices();

    document.getElementById("updated").textContent =
      "Laatste update: " + (data.lastUpdated ?? "onbekend");

    const ctx = document.getElementById("priceChart").getContext("2d");

    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "TinQ Weesp – Hogeweyselaan",
            data: [],
            tension: 0.3,
          },
          {
            label: "Tango Weesp – Hogeweyselaan",
            data: [],
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            min: 1.5,
            max: 2.5,
            ticks: {
              stepSize: 0.25,
              callback: (value) => "€" + value.toFixed(2),
            },
            title: {
              display: true,
              text: "Prijs (€ / liter)",
            },
          },
          x: {
            title: {
              display: true,
              text: "Datum",
            },
          },
        },
      },
    });

    updateChart();
  });

// ---------- CONTROLS ----------

document.querySelectorAll(".view-buttons button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".view-buttons button")
      .forEach((b) => b.classList.remove("active"));

    btn.classList.add("active");
    currentView = btn.dataset.view;
    updateChart();
  });
});

document.getElementById("prev").onclick = () => {
  currentDate = add(currentView, currentDate, -1);
  updateChart();
};

document.getElementById("next").onclick = () => {
  currentDate = add(currentView, currentDate, 1);
  updateChart();
};

document.getElementById("today").onclick = () => {
  currentDate = new Date();
  updateChart();
};
