// Ping test script using Cloudflare Workers.
// Reference https://developers.cloudflare.com/workers/examples/websockets/
// See server.js for the Worker code/

// In client-side JavaScript, connect to your Workers function using WebSockets:
//const websocket = new WebSocket('wss://ping-test.draggie.workers.dev');

//wsUrl = document.getElementById("websocketUrl").value;
const websocket = new WebSocket("wss://websocket.ping-test.draggie.games");

const elemt_display_statistics = document.getElementById('pingResults');
const last_result = document.getElementById("lastPingResult");

// The number of unique WebSocket pings to send.
const int_numberofpings = 10000;

// Start time.
var start = new Date().getTime();

var averageRTT = 0;
var totalRTT = 0;
var pingsSent = 0;
var chartValueLimit = 1000;
var rttValuesRaw = [];
var lowestRtt = null;
var highestRtt = null;
var p95Rtt = null;
var p99Rtt = null;
var stdDivRTT = null;
var lowestRTT = null;
var highestRTT = null;

websocket.addEventListener("message", (event) => {
    console.log(`Message from server: ${event.data}`);
});

websocket.addEventListener("open", async (event) => { 
    console.log("WebSocket connection opened.");
    //startPingTest();
});

websocket.addEventListener('message', async function (event) {
    const messageParts = event.data.split("_");
    if (messageParts[0] === "Pong") {
        const pingIndex = parseInt(messageParts[1]);
        let end = performance.now();

        // Calculate round trip time.
        let int_rtt = end - start;
        console.log(`Round trip time: ${int_rtt} ms`);

        // Async call the functions to display to the user.
        await display_latest_ping_rtt(int_rtt, messageParts[2]);
        await display_statistics(int_rtt, messageParts[2]);

        // Append the RTT value to the array.
        // Note this has been commented out as the chart update function just handles this.
        /*
        console.log(`[WSEvent] Pre-push array: ${rttValuesRaw}`);
        rttValuesRaw.push(int_rtt);
        console.log(`[WSEvent] RTT value pushed to array: ${int_rtt}`);
        console.log(`[WSEvent] Post-push array: ${rttValuesRaw}`);
        */

        // Proceed with the next ping after a delay.
        if (pingIndex < int_numberofpings - 1) {
            timeToWait = document.getElementById("pingInterval").value;
            await new Promise(r => setTimeout(r, timeToWait));
            sendPing(pingIndex + 1);
        } else {
            console.log("Ping test completed.");
        }
    } else {
        console.warn(`Unexpected message: ${event.data}`);
    }
});


function sendPing(i) {
    start = performance.now();
    websocket.send(`Ping_${i}`);
    console.log(`Ping_${i} sent`);
}

async function startPingTest() {
    console.log("Function startPingTest() called.");

    var timeToWait = document.getElementById("pingInterval").value;
    console.log(`Time to wait: ${timeToWait}`);


    sendPing(0); // Start the first ping.
    document.getElementById("startButton").disabled = true;
    document.getElementById("startButton").innerHTML = "Test in progress...";
    document.getElementById("pingInterval").disabled = true;
}

const xValues = [];

async function update_chart(newRTTValue) {
    const myChart = new Chart("pingChart", {
        type: "line",
        data: {
            labels: xValues,
            datasets: [{
                label: "RTT",
                data: rttValuesRaw,
                fill: false,
                borderColor: "rgb(75, 192, 192)",
                tension: 0.1
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom'
                }
            },
            animation: {
                duration: 0
            }
        }
    });

    function addData(chart, label, data) {
        chart.data.labels.push(label);
        chart.data.datasets.forEach((dataset) => {
            dataset.data.push(data);
        });
    }
    /*
    setInterval(() => {
        const newXValue = xValues.length;
        //const newRTTValue = newRTTValue;
        addData(myChart, newXValue, newRTTValue);
    }, 1000);
    */
   addData(myChart, xValues.length, newRTTValue);


    /*
        Function to trim the amount of data samples in the chart by removing the oldest data points.
        This is defined by the user via an input.
    */

    function trimData(chart, trimAmount) {
        for (let i = 0; i < trimAmount; i++) {
            xValues.shift();
            chart.data.labels.shift();
        }
    }
    trimData(myChart, getChartValuesLimit());

    myChart.update(); 
}
addEventListener("DOMContentLoaded", update_chart);


async function getChartValuesLimit() {
    chartValuesLimit = document.getElementById("chartValues").value;
    console.log(`Chart values limit: ${chartValuesLimit}`);

    return chartValuesLimit;
}

async function display_latest_ping_rtt(latestPingResult, procTime) {
    console.log("Function display_latest_ping_rtt() called.");

    // Display latest ping RTT.
    document.getElementById("lastPingResult").innerHTML = `Latest ping RTT: ${latestPingResult} ms`;
    //last_result.innerHTML = `Latest ping RTT: ${latestPingResult} ms`;
    update_chart(latestPingResult);
}

async function display_statistics(latestPingResult, procTime) {
    console.log("Function display_statistics() called.");

    // Overhead calculations
    var int_server_proc_time = procTime;

    // Compute mean, median, mode, range and std div.
    // Mean
    pingsSent++;
    totalRTT += latestPingResult;
    var meanRTT = totalRTT / pingsSent;
    console.log(`Mean RTT: ${meanRTT} ms`);


    // Median
    var medianRTT = median(rttValuesRaw);
    console.log(`Median RTT: ${medianRTT} ms`);

    // Std div
    // console.log(`RTT values: ${rttValuesRaw}`);
    var stdDivRTT = getStandardDeviation(rttValuesRaw);
    console.log(`Standard deviation RTT: ${stdDivRTT} ms`);


    // Display statistics.
    document.getElementById("pingResults").innerHTML = `Mean RTT: ${meanRTT} ms<br>Median RTT: ${medianRTT} ms<br>5th percentile: ${percentile(0.05, rttValuesRaw)}<br>95th percentile: ${percentile(0.95, rttValuesRaw)}<br>99th percentile: ${percentile(0.99, rttValuesRaw)}<br>Lowest RTT: ${lowest(rttValuesRaw)} ms<br>Highest RTT: ${highest(rttValuesRaw)} ms<br>Standard deviation RTT: ${stdDivRTT} ms<br>Avg server processing time: ${int_server_proc_time} ms<br>Total measurements: ${pingsSent}`;
}


function median(values) {
    // Credit where it is due: https://stackoverflow.com/a/45309555
    if (values.length === 0) {
      throw new Error('Input array is empty');
    }
  
    // Sorting values, preventing original array
    // from being mutated.
    values = [...values].sort((a, b) => a - b);
  
    const half = Math.floor(values.length / 2);
  
    return (values.length % 2
      ? values[half]
      : (values[half - 1] + values[half]) / 2
    );
  
}

function getStandardDeviation (array) {
    // https://stackoverflow.com/a/53577159
    var newArray = array.filter(value => typeof value === 'number');

    const n = newArray.length
    const mean = newArray.reduce((a, b) => a + b) / n
    return Math.sqrt(newArray.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
}