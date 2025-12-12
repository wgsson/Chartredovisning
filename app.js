/* script.js - behåller din MQTT + Chart-logik, uppdaterad för den nya designen */

/* --- Konfiguration --- */
const HISTORY_DURATION = 24 * 60 * 60 * 1000; // 24 timmar
const OPT_MIN = 20;
const OPT_MAX = 50;
const TIME_LOCALE = 'sv-SE';

/* --- State arrays --- */
const timestamps = [];
const dataPoints = [];
const pointColors = [];

/* --- Element referenser --- */
const currentValueEl = document.getElementById('currentValue');
const currentTimeEl = document.getElementById('currentTime');
const statusEl = document.getElementById('status');

/* --- Klocka (uppdatera tid i UI) --- */
function tickClock(){
  const now = new Date();
  currentTimeEl.textContent = now.toLocaleTimeString(TIME_LOCALE, { hour: '2-digit', minute: '2-digit' });
}
tickClock();
setInterval(tickClock, 1000);

/* --- Färghjälpare --- */
function isOptimal(v){ return v >= OPT_MIN && v <= OPT_MAX; }
function colorFor(v){
  return isOptimal(v) ? getComputedStyle(document.documentElement).getPropertyValue('--good').trim() || '#00b25a'
                      : getComputedStyle(document.documentElement).getPropertyValue('--bad').trim() || '#ff4d4f';
}

/* --- Rensa gamla datapunkter --- */
function cleanOldData(){
  const cutoff = Date.now() - HISTORY_DURATION;
  while(timestamps.length && timestamps[0] < cutoff){
    timestamps.shift();
    dataPoints.shift();
    pointColors.shift();
  }
}

/* --- Lägg till mätning --- */
function addMeasurement(h){
  const now = Date.now();
  timestamps.push(now);
  dataPoints.push(h);
  pointColors.push(colorFor(h));
  cleanOldData();
  chart.update();
}

/* --- Responsiv punktstorlek --- */
function pointRadius(){
  return window.innerWidth <= 360 ? 2.5 : 4;
}

/* --- Responsiv fontstorlek --- */
function getFontSize(){
  return window.innerWidth <= 360 ? 10 : 11;
}

/* --- Chart.js plugin för optimal zon --- */
const optimalZonePlugin = {
  id: 'optimalZone',
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea: { left, right, top, bottom }, scales: { y } } = chart;
    
    if (!y) return;
    
    // Beräkna Y-koordinater för 20 och 50
    const yTop = y.getPixelForValue(OPT_MAX);
    const yBottom = y.getPixelForValue(OPT_MIN);
    
    // Rita grön bakgrund
    ctx.save();
    ctx.fillStyle = 'rgba(0, 178, 90, 0.08)';
    ctx.fillRect(left, yTop, right - left, yBottom - yTop);
    
    // Rita gränslinje överst (vid 50)
    ctx.strokeStyle = 'rgba(0, 178, 90, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(left, yTop);
    ctx.lineTo(right, yTop);
    ctx.stroke();
    
    // Rita gränslinje nederst (vid 20)
    ctx.beginPath();
    ctx.moveTo(left, yBottom);
    ctx.lineTo(right, yBottom);
    ctx.stroke();
    
    ctx.restore();
  }
};

/* --- Förbättra Canvas-upplösning för mobil --- */
function setupHighDPICanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
}

/* --- Chart.js setup --- */
const canvas = document.getElementById('humidityChart');
const ctx = canvas.getContext('2d');

// Sätt upp high-DPI canvas för skarp rendering
setupHighDPICanvas(canvas);

const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: timestamps,
    datasets: [{
      label: 'RH%',
      data: dataPoints,
      borderWidth: 2.5,
      borderColor: '#c8cdd6',
      backgroundColor: 'rgba(11,110,246,0.06)',
      pointBackgroundColor: pointColors,
      pointBorderColor: pointColors,
      pointRadius: pointRadius(),
      pointHoverRadius: pointRadius()+2,
      pointBorderWidth: 2,
      tension: 0.3,
      fill: true,
      fill: 'origin'
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: window.devicePixelRatio || 1,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 13 },
        padding: 10,
        cornerRadius: 6,
        displayColors: false,
        callbacks: {
          label: ctx => `${ctx.parsed.y.toFixed(1)} %`,
          title: items => {
            if(!items.length) return '';
            const ts = items[0].label || items[0].parsed.x;
            return new Date(ts).toLocaleTimeString(TIME_LOCALE, { hour:'2-digit', minute:'2-digit' });
          }
        }
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
          modifierKey: null,
          onPanComplete: ({chart}) => {
            // Uppdatera chart efter pan
            chart.update('none');
          }
        },
        zoom: {
          wheel: {
            enabled: false
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
          onZoomComplete: ({chart}) => {
            // Uppdatera chart efter zoom
            chart.update('none');
          }
        },
        limits: {
          x: {
            min: 'original',
            max: 'original'
          }
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { 
          stepSize: 10, 
          color: getComputedStyle(document.documentElement).getPropertyValue('--muted-text').trim(),
          font: { size: getFontSize(), weight: '600' },
          padding: 8
        },
        grid: { 
          color: 'rgba(16,24,40,0.06)',
          lineWidth: 1
        },
        title: { 
          display: true, 
          text: 'RH %', 
          color: getComputedStyle(document.documentElement).getPropertyValue('--muted-text').trim(),
          font: { size: 12, weight: 'bold' },
          padding: { top: 0, bottom: 10 }
        }
      },
      x: {
        type: 'time',
        time: { 
          tooltipFormat: 'HH:mm', 
          displayFormats: { minute:'HH:mm', hour:'HH:mm' } 
        },
        ticks: { 
          maxRotation: 0, 
          autoSkip: true, 
          maxTicksLimit: 6,
          color: getComputedStyle(document.documentElement).getPropertyValue('--muted-text').trim(),
          font: { size: getFontSize(), weight: '600' },
          padding: 8
        },
        grid: { 
          color: 'rgba(16,24,40,0.04)',
          lineWidth: 1
        }
      }
    },
    elements: {
      line: {
        segment: {
          borderColor: ctx => {
            try {
              const v = ctx.p1.parsed.y;
              return isOptimal(v) ? getComputedStyle(document.documentElement).getPropertyValue('--good').trim()
                                  : getComputedStyle(document.documentElement).getPropertyValue('--bad').trim();
            } catch(e) { return '#c8cdd6'; }
          },
          borderWidth: 2.5
        }
      }
    }
  },
  plugins: [optimalZonePlugin]
});

/* Anpassa vid resize */
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    setupHighDPICanvas(canvas);
    chart.data.datasets[0].pointRadius = pointRadius();
    chart.data.datasets[0].pointHoverRadius = pointRadius()+2;
    chart.options.scales.y.ticks.font.size = getFontSize();
    chart.options.scales.x.ticks.font.size = getFontSize();
    chart.resize();
    chart.update();
  }, 250);
});

/* --- MQTT --- */
const client = new Paho.MQTT.Client("test.mosquitto.org", 8081, "clientId_" + Math.floor(Math.random() * 100000));

client.onConnectionLost = (responseObject) => {
  console.warn("Anslutning förlorad:", responseObject);
  statusEl.className = 'status disconnected';
  statusEl.textContent = 'Mäter ej...';
};

client.onMessageArrived = (message) => {
  const payload = message.payloadString.trim();
  const humidity = parseFloat(payload);
  if (!isNaN(humidity)){
    // uppdatera live-display
    currentValueEl.innerHTML = `${humidity.toFixed(1)}<span class="percent">%</span>`;
    currentValueEl.style.color = isOptimal(humidity) ? getComputedStyle(document.documentElement).getPropertyValue('--good').trim() : getComputedStyle(document.documentElement).getPropertyValue('--bad').trim();

    // spara i tidsserie
    addMeasurement(humidity);
  } else {
    console.warn("Ogiltigt meddelande:", payload);
  }
};

client.connect({
  onSuccess: () => {
    console.log("Ansluten till MQTT");
    statusEl.className = 'status connected';
    statusEl.textContent = 'Mäter...';
    client.subscribe("Gsson/RH");
  },
  onFailure: (err) => {
    console.error("Anslutning misslyckades:", err);
    statusEl.className = 'status disconnected';
    statusEl.textContent = 'Anslutning misslyckades';
  },
  useSSL: true
});

/* Touch: litet feedback vid tryck */
document.querySelector('.app').addEventListener('click', () => {
  const el = statusEl;
  el.style.transition = 'transform 0.12s';
  el.style.transform = 'scale(0.98)';
  setTimeout(()=> el.style.transform = '', 120);
});
