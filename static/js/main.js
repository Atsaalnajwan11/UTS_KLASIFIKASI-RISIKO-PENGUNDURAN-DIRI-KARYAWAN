// Simpan referensi instans Chart.js untuk animasi dinamis
const chartInstances = {};

document.addEventListener("DOMContentLoaded", () => {
  const metaEl = document.getElementById("model-meta-json");
  const meta = metaEl ? JSON.parse(metaEl.textContent) : null;

  if (meta) {
    renderCharts(meta);
  }

  const form = document.getElementById("predictionForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await runPrediction();
    });
  }

  // Sidebar navigation click handler: aktifkan tombol dan animasikan diagram bergerak ke atas
  const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      navItems.forEach(nav => nav.classList.remove("active"));
      item.classList.add("active");

      const targetId = item.getAttribute("href");
      if (targetId && targetId.startsWith("#")) {
        const targetSection = document.querySelector(targetId);
        if (targetSection) {
          // Beri efek animasi bergerak ke atas (slide up) pada diagram & grafik di section tujuan
          const diagrams = targetSection.querySelectorAll(
            ".bento-box, .canvas-box-standard, .canvas-box-dual, .image-wrapper, .bubbles-showcase, .stats-chart-wrapper, .eval-card"
          );

          diagrams.forEach(diag => {
            diag.classList.remove("animate-diagram-up");
            void diag.offsetWidth; // Trigger reflow browser agar animasi CSS berjalan ulang
            diag.classList.add("animate-diagram-up");
          });

          // Jalankan ulang animasi batang grafik Chart.js agar tumbuh bergerak ke atas
          const canvases = targetSection.querySelectorAll("canvas");
          canvases.forEach(canvas => {
            const chart = chartInstances[canvas.id];
            if (chart) {
              chart.reset();
              chart.update({
                duration: 900,
                easing: "easeOutQuart"
              });
            }
          });
        }
      }
    });
  });

  // Interaktivitas 4 Kartu Metrik di atas: Warna hijau berpindah-pindah mengikuti kursor
  const metricCards = document.querySelectorAll(".metrics-row .metric-card");
  metricCards.forEach(card => {
    card.addEventListener("mouseenter", () => {
      metricCards.forEach(c => c.classList.remove("card-lime"));
      card.classList.add("card-lime");
    });
  });

  // Inisialisasi progress bar recall & akurasi
  const recallBar = document.getElementById("recallBar");
  if (recallBar && recallBar.dataset.width) {
    recallBar.style.width = recallBar.dataset.width;
  }
  const accuracyBar = document.getElementById("accuracyBar");
  if (accuracyBar && accuracyBar.dataset.width) {
    accuracyBar.style.width = accuracyBar.dataset.width;
  }

  // Jalankan prediksi awal dengan nilai bawaan form saat halaman selesai dimuat
  runPrediction();
});

const PRESETS = {
  high_risk: {
    OverTime: "Yes",
    MonthlyIncome: 2293,
    Department: "Sales",
    JobRole: "Sales Representative",
    JobLevel: 1,
    BusinessTravel: "Travel_Frequently",
    Age: 24,
    MaritalStatus: "Single",
    DistanceFromHome: 22,
    TotalWorkingYears: 2,
    YearsAtCompany: 1,
    YearsWithCurrManager: 0,
    YearsSinceLastPromotion: 0,
    NumCompaniesWorked: 1,
    StockOptionLevel: 0,
    JobSatisfaction: 1,
    EnvironmentSatisfaction: 1,
    WorkLifeBalance: 2,
    JobInvolvement: 2
  },
  medium_risk: {
    OverTime: "Yes",
    MonthlyIncome: 4650,
    Department: "Research & Development",
    JobRole: "Laboratory Technician",
    JobLevel: 2,
    BusinessTravel: "Travel_Rarely",
    Age: 31,
    MaritalStatus: "Single",
    DistanceFromHome: 14,
    TotalWorkingYears: 7,
    YearsAtCompany: 4,
    YearsWithCurrManager: 2,
    YearsSinceLastPromotion: 3,
    NumCompaniesWorked: 3,
    StockOptionLevel: 0,
    JobSatisfaction: 2,
    EnvironmentSatisfaction: 2,
    WorkLifeBalance: 2,
    JobInvolvement: 3
  },
  low_risk: {
    OverTime: "No",
    MonthlyIncome: 9850,
    Department: "Research & Development",
    JobRole: "Manufacturing Director",
    JobLevel: 3,
    BusinessTravel: "Travel_Rarely",
    Age: 42,
    MaritalStatus: "Married",
    DistanceFromHome: 4,
    TotalWorkingYears: 18,
    YearsAtCompany: 11,
    YearsWithCurrManager: 8,
    YearsSinceLastPromotion: 1,
    NumCompaniesWorked: 1,
    StockOptionLevel: 2,
    JobSatisfaction: 4,
    EnvironmentSatisfaction: 4,
    WorkLifeBalance: 3,
    JobInvolvement: 3
  }
};

function loadPreset(type) {
  const preset = PRESETS[type];
  if (!preset) return;
  Object.entries(preset).forEach(([key, val]) => {
    const field = document.getElementById(key);
    if (field) {
      field.value = val;
    }
  });
  runPrediction();
}

async function runPrediction() {
  const form = document.getElementById("predictionForm");
  const submitBtn = document.getElementById("submitBtn");
  if (!form || !submitBtn) return;

  const formData = new FormData(form);
  const payload = {};

  formData.forEach((value, key) => {
    payload[key] = value;
  });

  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <span>Menganalisis Profil Karyawan...</span>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  `;

  try {
    const response = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (data.status === "success") {
      updateResultUI(data);
    } else {
      alert("Terjadi kesalahan kalkulasi: " + (data.message || "Unknown error"));
    }
  } catch (err) {
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <span>Jalankan Prediksi Risiko Sekarang</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
      </svg>
    `;
  }
}

function updateResultUI(data) {
  const res = data.result;
  const badge = document.getElementById("riskBadge");
  const probDisplay = document.getElementById("probDisplay");
  const probStayDisplay = document.getElementById("probStayDisplay");
  const targetRiskPct = document.getElementById("targetRiskPct");
  const probBar = document.getElementById("probBar");
  const predTitle = document.getElementById("predictionTitle");
  const predSummary = document.getElementById("predictionSummary");
  const reasonsList = document.getElementById("reasonsList");
  const actionsList = document.getElementById("actionsList");
  const bubbleMain = document.getElementById("bubbleMain");

  // Badge Status
  if (badge) {
    badge.textContent = res.level;
    badge.className = "status-badge-chip " + res.badge;
  }

  // Values
  const probPct = res.probability_pct;
  const stayPct = Math.max(0, +(100 - probPct).toFixed(1));

  if (probDisplay) probDisplay.textContent = probPct + "%";
  if (probStayDisplay) probStayDisplay.textContent = stayPct + "%";
  if (targetRiskPct) targetRiskPct.textContent = probPct + "%";

  if (probBar) {
    probBar.style.width = Math.min(probPct, 100) + "%";
    if (res.badge === "danger") {
      probBar.style.backgroundColor = "#ef4444";
    } else if (res.badge === "warning") {
      probBar.style.backgroundColor = "#f59e0b";
    } else {
      probBar.style.backgroundColor = "#84cc16";
    }
  }

  // Bubble styling (Lime vs Coral Red vs Amber)
  if (bubbleMain) {
    bubbleMain.classList.remove("is-danger", "is-warning", "is-success");
    if (res.badge === "danger") {
      bubbleMain.classList.add("is-danger");
    } else if (res.badge === "warning") {
      bubbleMain.classList.add("is-warning");
    } else {
      bubbleMain.classList.add("is-success");
    }
  }

  // Text
  if (predTitle) predTitle.textContent = res.prediction_label;
  if (predSummary) predSummary.textContent = res.summary;

  if (reasonsList && data.reasons) {
    reasonsList.innerHTML = data.reasons.map(r => `<li>${r}</li>`).join("");
  }
  if (actionsList && data.actions) {
    actionsList.innerHTML = data.actions.map(a => `<li>${a}</li>`).join("");
  }
}

function renderCharts(meta) {
  // 1. Dual Bar Comparison Chart (May, Jun, Jul, Aug, Sep style bar chart in Bento box)
  const dualBarCtx = document.getElementById("barStatsChart");
  if (dualBarCtx) {
    chartInstances['barStatsChart'] = new Chart(dualBarCtx, {
      type: "bar",
      data: {
        labels: ["Sales", "R&D", "Human Res", "Lembur: Yes", "Lembur: No"],
        datasets: [
          {
            label: "Tingkat Resign (%)",
            data: [20.6, 13.8, 19.0, 30.5, 10.4],
            backgroundColor: "#b8f700", // Vibrant Lime Green
            borderRadius: 8,
            barPercentage: 0.7,
            categoryPercentage: 0.6
          },
          {
            label: "Tingkat Bertahan (%)",
            data: [79.4, 86.2, 81.0, 69.5, 89.6],
            backgroundColor: "#8da9fc", // Soft Periwinkle Blue
            borderRadius: 8,
            barPercentage: 0.7,
            categoryPercentage: 0.6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 900,
          easing: "easeOutQuart"
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
            align: "end",
            labels: {
              boxWidth: 12,
              font: { family: "'Plus Jakarta Sans', sans-serif", weight: "600", size: 11 }
            }
          },
          tooltip: {
            backgroundColor: "#111317",
            titleFont: { family: "'Plus Jakarta Sans', sans-serif", weight: "700" },
            bodyFont: { family: "'Plus Jakarta Sans', sans-serif" },
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", weight: "600", size: 11 } }
          },
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: "rgba(226, 232, 240, 0.6)" },
            ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 } }
          }
        }
      }
    });
  }

  // 2. Feature Importance Horizontal Bar Chart
  const featCtx = document.getElementById("featureChart");
  if (featCtx && meta.top_features) {
    const labels = meta.top_features.map(item => item.feature);
    const values = meta.top_features.map(item => item.importance);

    chartInstances['featureChart'] = new Chart(featCtx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Bobot Pengaruh (%)",
          data: values,
          backgroundColor: labels.map((_, i) => i < 2 ? "#b8f700" : (i < 5 ? "#8da9fc" : "#111317")),
          borderRadius: 8
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 900,
          easing: "easeOutQuart"
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#111317",
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: "rgba(226, 232, 240, 0.6)" },
            title: { display: true, text: "Kontribusi Fitur (%)" }
          },
          y: {
            grid: { display: false },
            ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", weight: "600" } }
          }
        }
      }
    });
  }

  // 3. Segment Chart (Department & OverTime Attrition)
  const segCtx = document.getElementById("segmentChart");
  if (segCtx && meta.eda_summary) {
    const dept = meta.eda_summary.department_attrition_pct;
    const ot = meta.eda_summary.overtime_attrition_pct;

    const segLabels = [
      "Dept: Sales",
      "Dept: HR",
      "Dept: R&D",
      "Lembur: Yes",
      "Lembur: No"
    ];
    const segValues = [
      dept["Sales"] || 0,
      dept["Human Resources"] || 0,
      dept["Research & Development"] || 0,
      ot["Yes"] || 0,
      ot["No"] || 0
    ];

    chartInstances['segmentChart'] = new Chart(segCtx, {
      type: "bar",
      data: {
        labels: segLabels,
        datasets: [{
          label: "Persentase Resign (%)",
          data: segValues,
          backgroundColor: ["#8da9fc", "#8da9fc", "#8da9fc", "#b8f700", "#111317"],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 900,
          easing: "easeOutQuart"
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#111317",
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 40,
            grid: { color: "rgba(226, 232, 240, 0.6)" },
            title: { display: true, text: "Tingkat Resign (%)" }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", weight: "600" } }
          }
        }
      }
    });
  }
}
