const HISTORY_DURATION = 8 * 60 * 60 * 1000;
const dataPoints = [];
const timeLabels = [];
const colorData = [];
const timestamps = [];

let latestHumidity = null;

function getColor(humidity) {
    return (humidity >= 20 && humidity <= 50)
        ? 'rgba(75, 192, 75, 0.8)'
        : 'rgba(255, 99, 99, 0.8)';
}

function cleanOldData() {
    const now = Date.now();
    const cutoff = now - HISTORY_DURATION;

    while (timestamps.length > 0 && timestamps[0] < cutoff) {
        timestamps.shift();
        dataPoints.shift();
        timeLabels.shift();
        colorData.shift();
    }
}

function addMeasurement(humidity) {
    const now = Date.now();

    timestamps.push(now);
    dataPoints.push(humidity);
    timeLabels.push(new Date(now));
    colorData.push(getColor(humidity));

    cleanOldData();
    chart.update();
}

function getResponsiveFontSize() {
    const width = window.innerWidth;
    return width < 600 ? 12 : width < 900 ? 16 : 24;
}

function getResponsivePointRadius() {
    return window.innerWidth < 600 ? 3 : 5;
}

const ctx = document.getElementById('humidityChart').getContext('2d');
const fontSize = getResponsiveFontSize();

const chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: timeLabels,
        datasets: [{
            label: 'Optimal RH% (20-50)',
            data: dataPoints,
            borderColor: '#25a5439c',
            backgroundColor: 'rgba(230, 234, 230, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: colorData,
            pointBorderColor: colorData,
            pointRadius: getResponsivePointRadius(),
            pointHoverRadius: getResponsivePointRadius() + 2,
            segment: {
                borderColor: ctx => {
                    const v = ctx.p1.parsed.y;
                    return v >= 20 && v <= 50 ? 'rgb(75, 192, 75)' : 'rgb(255, 99, 99)';
                }
            }
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: window.innerWidth < 600 ? 1 : 2,
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                title: { display: true, text: 'RH%', font: { size: fontSize }},
                ticks: { font: { size: fontSize - 2 }}
            },
            x: {
                type: 'time',
                time: {
                    tooltipFormat: 'HH:mm',
                    displayFormats: { minute: 'HH:mm', hour: 'HH:mm' }
                },
                ticks: {
                    autoSkip: true,
                    maxTicksLimit: window.innerWidth < 600 ? 6 : 12,
                    font: { size: fontSize - 2 }
                },
                title: { display: true, text: 'Tid', font: { size: fontSize }}
            }
        }
    },
    plugins: [{
        id: 'optimalZone',
        beforeDatasetsDraw: chart => {
            const ctx = chart.ctx;
            const y = chart.scales.y;
            const x = chart.scales.x;

            ctx.save();
            ctx.fillStyle = 'rgba(30, 206, 42, 0.35)';
            ctx.fillRect(
                x.left,
                y.getPixelForValue(50),
                x.right - x.left,
                y.getPixelForValue(20) - y.getPixelForValue(50)
            );
            ctx.restore();
        }
    }]
});

window.addEventListener('resize', () => {
    const newSize = getResponsiveFontSize();

    chart.options.scales.y.title.font.size = newSize;
    chart.options.scales.x.title.font.size = newSize;

    chart.data.datasets[0].pointRadius = getResponsivePointRadius();
    chart.data.datasets[0].pointHoverRadius = getResponsivePointRadius() + 2;

    chart.update();
});

// MQTT-kod
const client = new Paho.MQTT.Client(
    "test.mosquitto.org",
    8081,
    "clientId_" + Math.floor(Math.random() * 100000)
);

client.onConnectionLost = res => {
    document.getElementById("status").className = "status disconnected";
    document.getElementById("status").textContent = "Frånkopplad";
};

client.onMessageArrived = msg => {
    const humidity = parseFloat(msg.payloadString);

    if (!isNaN(humidity)) {
        latestHumidity = humidity;

        const valueEl = document.getElementById("currentValue");
        valueEl.textContent = humidity.toFixed(1) + "%";
        valueEl.style.color = (humidity >= 20 && humidity <= 50) ? "#28a745" : "#dc3545";

        addMeasurement(humidity);
    }
};

client.connect({
    onSuccess: () => {
        document.getElementById("status").className = "status connected";
        document.getElementById("status").textContent = "Ansluten till test.mosquitto.org";
        client.subscribe("Gsson/RH");
    },
    useSSL: true
});
