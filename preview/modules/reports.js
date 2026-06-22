export function generateWeeklyReport(transactions) {
  const days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  const today = new Date();
  const weekData = { entrate: Array(7).fill(0), uscite: Array(7).fill(0) };
  
  transactions.forEach(t => {
    const date = new Date(t.created_at);
    const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
    
    if (t.tipo === 'entrata') {
      weekData.entrate[dayIndex] += t.importo;
    } else {
      weekData.uscite[dayIndex] += t.importo;
    }
  });
  
  return { days, weekData };
}

export function generateMonthlyReport(transactions, month) {
  const monthlyData = {};
  
  transactions
    .filter(t => t.mese === month)
    .forEach(t => {
      if (!monthlyData[t.cat]) {
        monthlyData[t.cat] = { entrate: 0, uscite: 0 };
      }
      if (t.tipo === 'entrata') {
        monthlyData[t.cat].entrate += t.importo;
      } else {
        monthlyData[t.cat].uscite += t.importo;
      }
    });
  
  return monthlyData;
}

export function renderChart(canvasId, labels, data, label, color) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  
  new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: data,
        backgroundColor: color,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}