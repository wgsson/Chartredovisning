# EpoxMonitor – Visualisera data med Chart.js

Chart.js används i EpoxMonitor för att visualisera luftfuktighet (RH %) i realtid. Chart.js är ett JavaScript-bibliotek som gör det enkelt att skapa dynamiska diagram.

---

## För att skapa grafen har vi använt:

* HTML där vi lagt in Canvas-element (fungerar ungefär som ett ritområde för JavaScript) samt CDN-länk till Chart.js + tid.
* CSS för layout och utseende för hemsidan och grafen
* JavaScript-kod som uppdaterar grafen vid nya mätvärden

---

## Steg 1 – Canvas (HTML)

Skapa ett `<canvas>`-element i HTML där Chart.js ska rita grafen:

```html
<canvas id="humidityChart"></canvas>
```

---

## Steg 2 – Ladda Chart.js (HTML)

Chart.js och en adapter för datum/tid behövs även i HTML:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns"></script>
```

---

## Steg 3 – Skapa graf (JavaScript)

Lägg in följande kod i ditt JavaScript-dokument för att skapa en linjegraf för RH% över tid:

```javascript
const ctx = document.getElementById('humidityChart').getContext('2d');

const chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],           // Tidpunkter (Date-objekt)
        datasets: [{
            label: 'RH %',
            data: [],         // Fuktvärden
            fill: true,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.3
        }]
    },
    options: {
        responsive: true,
        animation: false,
        scales: {
            x: {
                type: 'time',
                time: {
                    displayFormats: { hour: 'HH:mm' }
                },
                title: { display: true, text: 'Tid' }
            },
            y: {
                min: 0,
                max: 100,
                title: { display: true, text: 'RH %' }
            }
        }
    }
});
```

---

## Uppdatera grafen i realtid

När ett nytt RH-värde kommer in (t.ex. via MQTT) uppdateras grafen så här:

```javascript
chart.data.labels.push(new Date());
chart.data.datasets[0].data.push(humidityValue);
chart.update();
```

---

## Resultat

En realtidsuppdaterad graf över luftfuktighet (RH %) som visar:

* Fuktförändringar över tid
* Tidsaxel med automatiska datumformat
* Mjuka linjer och responsiv design

<img width="430" height="401" alt="image" src="https://github.com/user-attachments/assets/8ea80430-67f0-4a70-bbc4-d413ee472f50" />



**Tips:** Du kan även lägga till färgkodning vid optimala värden och varningar för att göra grafen mer informativ.
