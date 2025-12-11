const MEASUREMENT_INTERVAL = 10 * 60 * 1000; // 10 minuter
const HISTORY_DURATION = 8 * 60 * 60 * 1000; // 8 timmar
const dataPoints = [];
const colorData = [];
const timestamps = [];
const alerts = [];

let lastMeasurementTime = 0;
let latestHumidity = null;
let lastAlertValue = null;

// Formatera tid i svensk tidszon
function formatSwedishTime(date) {
    return date.toLocaleTimeString('sv-SE', { 
        timeZone: 'Europe/Stockholm',
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
}

function formatSwedishTimeShort(date) {
    return date.toLocaleTimeString('sv-SE', { 
        timeZone: 'Europe/Stockholm',
        hour: '2-digit', 
        minute: '2-digit'
    });
}

// Funktion för att bestämma färg baserat på fuktnivå
function getColor(humidity) {
    if (humidity >= 20 && humidity <= 50) {
        return 'rgba(75, 192, 75, 0.8)';
    } else {
        return 'rgba(255, 99, 99, 0.8)';
    }
}

// Lägg till avvikelse i loggen
function addAlert(humidity, timestamp) {
    const alert = {
        humidity: humidity,
        time: timestamp,
        id: Date.now()
    };
    
    alerts.unshift(alert);
    
    // Behåll max 50 avvikelser
    if (alerts.length > 50) {
        alerts.pop();
    }
    
    updateAlertLog();
}

// Uppdatera avvikelseloggen
function updateAlertLog() {
    const alertLog = document.getElementById('alertLog');
    
    if (alerts.length === 0) {
        alertLog.innerHTML = '<div class="no-alerts">Inga avvikelser ännu</div>';
    } else {
        alertLog.innerHTML = alerts.map(alert => `
            <div class="alert-item">
                <span class="time">${formatSwedishTime(new Date(alert.time))}</span>
                - RH: <span class="value">${alert.humidity.toFixed(1)}%</span>
            </div>
        `).join('');
    }
}

// Rensa gammal data
function cleanOldData() {
    const now = Date.now();
    const cutoffTime = now - HISTORY_DURATION;
    
    while (timestamps.length > 0 && timestamps[0] < cutoffTime) {
        timestamps.shift();
        dataPoints.shift();
        colorData.shift();
    }
}

// Lägg till ny mätning
function addMeasurement(humidity) {
    const now = Date.now();
    const date = new Date(now);
    
    // Konvertera till svensk tid
    const swedishTime = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' }));
    const hours = swedishTime.getHours();
    const minutes = swedishTime.getMinutes();
    const timeValue = hours + minutes / 60; // Decimalvärde för tid (t.ex. 14.5 för 14:30)

    timestamps.push(now);
    dataPoints.push({ x: timeValue, y: humidity });
    colorData.push(getColor(humidity));
    
    // Kontrollera om RH går över 50%
    if (humidity > 50) {
        addAlert(humidity, now);
    }
    
    cleanOldData();
    
    // Uppdatera punktfärger
    chart.data.datasets[0].pointBackgroundColor = [...colorData];
    chart.data.datasets[0].pointBorderColor = [...colorData];
    chart.update();
}

// Skapa diagrammet
const ctx = document.getElementById('humidityChart').getContext('2d');
const chart = new Chart(ctx, {
    type: 'scatter',
    data: {
        datasets: [{
            label: 'Luftfuktighet (RH%)',
            data: dataPoints,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            showLine: true,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: colorData,
            pointBorderColor: colorData,
            pointRadius: (context) => {
                const value = context.raw?.y;
                return value > 50 ? 8 : 5;
            },
            pointHoverRadius: 10,
            segment: {
                borderColor: (ctx) => {
                    const value = ctx.p1.parsed.y;
                    return value >= 20 && value <= 50 ? 'rgb(75, 192, 75)' : 'rgb(255, 99, 99)';
                }
            }
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                title: {
                    display: true,
                    text: 'RH%'
                }
            },
            x: {
                type: 'linear',
                min: 0,
                max: 24,
                ticks: {
                    stepSize: 1,
                    callback: function(value) {
                        return Math.floor(value) + ':00';
                    }
                },
                title: {
                    display: true,
                    text: 'Tid (timmar, svensk tid)'
                }
            }
        },
        plugins: {
            legend: {
                display: true
            },
            tooltip: {
                callbacks: {
                    title: function(context) {
                        const xValue = context[0].parsed.x;
                        const hours = Math.floor(xValue);
                        const minutes = Math.round((xValue - hours) * 60);
                        return `Tid: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    },
                    afterLabel: function(context) {
                        const value = context.parsed.y;
                        if (value > 50) {
                            return '⚠️ AVVIKELSE: Över 50%';
                        } else if (value >= 20 && value <= 50) {
                            return 'Status: Optimalt';
                        } else {
                            return 'Status: Under optimalt område';
                        }
                    }
                }
            }
        }
    },
    plugins: [{
        id: 'optimalZone',
        beforeDatasetsDraw: (chart) => {
            const ctx = chart.ctx;
            const yAxis = chart.scales.y;
            const xAxis = chart.scales.x;
            
            ctx.save();
            ctx.fillStyle = 'rgba(75, 192, 75, 0.1)';
            ctx.fillRect(
                xAxis.left,
                yAxis.getPixelForValue(50),
                xAxis.right - xAxis.left,
                yAxis.getPixelForValue(20) - yAxis.getPixelForValue(50)
            );
            ctx.restore();
        }
    }]
});

// MQTT Setup
const client = new Paho.MQTT.Client(
    "test.mosquitto.org", 
    8080,
    "clientId_" + parseInt(Math.random() * 100000)
);

client.onConnectionLost = (responseObject) => {
    if (responseObject.errorCode !== 0) {
        console.log("Anslutning förlorad: " + responseObject.errorMessage);
        document.getElementById('status').className = 'status disconnected';
        document.getElementById('status').textContent = 'Frånkopplad: ' + responseObject.errorMessage;
    }
};

client.onMessageArrived = (message) => {
    console.log("Meddelande mottaget: " + message.payloadString);
    const humidity = parseFloat(message.payloadString);
    
    if (!isNaN(humidity)) {
        latestHumidity = humidity;
        const now = Date.now();
        const currentDate = new Date(now);

        // Uppdatera nuvarande värde med färgkodning
        const valueElement = document.getElementById('currentValue');
        valueElement.textContent = humidity.toFixed(1) + '%';
        
        if (humidity >= 20 && humidity <= 50) {
            valueElement.style.color = '#ffffff';
            document.querySelector('.current-value-box').style.background = 
                'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        } else if (humidity > 50) {
            valueElement.style.color = '#ffffff';
            document.querySelector('.current-value-box').style.background = 
                'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
        } else {
            valueElement.style.color = '#ffffff';
            document.querySelector('.current-value-box').style.background = 
                'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)';
        }

        // Uppdatera klockslag
        document.getElementById('currentTime').textContent = formatSwedishTime(currentDate);

        // Lägg till mätning endast var 10:e minut
        if (now - lastMeasurementTime >= MEASUREMENT_INTERVAL) {
            addMeasurement(humidity);
            lastMeasurementTime = now;
            console.log("Ny mätning sparad: " + humidity + "% vid " + formatSwedishTime(currentDate));
        }
    }
};

// Anslut till MQTT på port 1883 (TCP)
console.log("Försöker ansluta till test.mosquitto.org:1883...");
client.connect({
    timeout: 10,
    keepAliveInterval: 30,
    useSSL: false, // Ingen SSL på port 1883
    onSuccess: () => {
        console.log("Ansluten till MQTT broker");
        document.getElementById('status').className = 'status connected';
        document.getElementById('status').textContent = 'Ansluten - Mäter var 10:e minut (svensk tid)';
        
        client.subscribe("Gsson/RH");
        console.log("Prenumererar på Gsson/RH");
    },
    onFailure: (error) => {
        console.error("Anslutning misslyckades:", error);
        document.getElementById('status').className = 'status disconnected';
        document.getElementById('status').textContent = 'Anslutning misslyckades: ' + (error.errorMessage || 'Okänt fel');
    }
});


// Rensa gammal data varje minut
setInterval(cleanOldData, 60000);

// Uppdatera klockan varje sekund
setInterval(() => {
    if (latestHumidity !== null) {
        document.getElementById('currentTime').textContent = formatSwedishTime(new Date());
    }
}, 1000);
