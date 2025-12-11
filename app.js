const MAX_DATA_POINTS = 50;
const dataPoints = [];
const timeLabels = [];
const colorData = [];

// Funktion för att bestämma färg baserat på fuktnivå
function getColor(humidity) {
    if (humidity >= 20 && humidity <= 50) {
        return 'rgba(75, 192, 75, 0.8)'; // Grön - optimalt
    } else {
        return 'rgba(255, 99, 99, 0.8)'; // Röd - över optimalt
    }
}

function getBorderColor(humidity) {
    if (humidity >= 20 && humidity <= 50) {
        return 'rgb(75, 192, 75)'; // Grön kant
    } else {
        return 'rgb(255, 99, 99)'; // Röd kant
    }
}

// Skapa diagrammet
const ctx = document.getElementById('humidityChart').getContext('2d');
const chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: timeLabels,
        datasets: [{
            label: 'Luftfuktighet (RH%)',
            data: dataPoints,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: colorData,
            pointBorderColor: colorData,
            pointRadius: 5,
            pointHoverRadius: 7,
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
                title: {
                    display: true,
                    text: 'Tid'
                }
            }
        },
        plugins: {
            legend: {
                display: true
            },
            annotation: {
                annotations: {
                    optimalZone: {
                        type: 'box',
                        yMin: 20,
                        yMax: 50,
                        backgroundColor: 'rgba(75, 192, 75, 0.1)',
                        borderColor: 'rgba(75, 192, 75, 0.3)',
                        borderWidth: 2,
                        label: {
                            display: true,
                            content: 'Optimalt område (20-50%)',
                            position: 'start'
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

// MQTT Setup med WSS (säker WebSocket)
const client = new Paho.MQTT.Client(
    "test.mosquitto.org", 
    8081,
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
        const now = new Date();
        const timeString = now.toLocaleTimeString('sv-SE');

        // Uppdatera nuvarande värde med färgkodning
        const valueElement = document.getElementById('currentValue');
        valueElement.textContent = humidity.toFixed(1) + '%';
        
        if (humidity >= 20 && humidity <= 50) {
            valueElement.style.color = '#28a745'; // Grön
        } else {
            valueElement.style.color = '#dc3545'; // Röd
        }

        // Lägg till datapunkt
        dataPoints.push(humidity);
        timeLabels.push(timeString);
        colorData.push(getColor(humidity));

        // Begränsa antal datapunkter
        if (dataPoints.length > MAX_DATA_POINTS) {
            dataPoints.shift();
            timeLabels.shift();
            colorData.shift();
        }

        // Uppdatera diagrammet
        chart.update();
    }
};

// Anslut till MQTT med SSL
console.log("Försöker ansluta till test.mosquitto.org:8081 (WSS)...");
client.connect({
    timeout: 10,
    keepAliveInterval: 30,
    useSSL: true,
    onSuccess: () => {
        console.log("Ansluten till MQTT broker");
        document.getElementById('status').className = 'status connected';
        document.getElementById('status').textContent = 'Ansluten till test.mosquitto.org (WSS)';
        
        client.subscribe("Gsson/RH");
        console.log("Prenumererar på Gsson/RH");
    },
    onFailure: (error) => {
        console.error("Anslutning misslyckades:", error);
        document.getElementById('status').className = 'status disconnected';
        document.getElementById('status').textContent = 'Anslutning misslyckades: ' + (error.errorMessage || 'Okänt fel');
        
        console.log("Tips: Kontrollera att din enhet skickar data till Gsson/RH");
        console.log("Du kan också testa med en lokal HTTP-server istället för att öppna filen direkt");
    }
});
