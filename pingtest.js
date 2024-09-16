// Ping test script using Cloudflare Workers.
// Reference https://developers.cloudflare.com/workers/examples/websockets/
// See server.js for the Worker code/

// In client-side JavaScript, connect to your Workers function using WebSockets:
const websocket = new WebSocket('wss://ping-test.draggie.workers.dev');

const elemt_display_statistics = document.getElementById('pingResults');
const last_result = document.getElementById("lastPingResult");

// The number of unique WebSocket pings to send.
const int_numberofpings = 1000;

// Start time.
var start = new Date().getTime();

var averageRTT = 0;

async function startPingTest() {
    console.log("Function startPingTest() called.");
    for (var i = 0; i < int_numberofpings; i++) {
        console.log(`Ping test ${i} started.`);

        // Set success flag to false, we only ever want to continue if there is a server.
        var success = false;

        console.log(`Websocket: ${websocket}`);

        // Add event listener for the websocket.
        websocket.addEventListener('message', async function (event) {
            // Now, begin the test.
            var end = performance.now();
            
            if (event.data === `Pong_${i}`) {
                // Calculate round trip time.
                var int_rtt = end - start;
                console.log(`Round trip time: ${int_rtt} ms`);

                // Async call the functions to display to the user.
                await display_latest_ping_rtt(int_rtt);
                await display_statistics(int_rtt);

                // Set success flag to true.
                success = true;

                // Wait for 1 second.
                if (success) {
                    await new Promise(r => setTimeout(r, 1000));
                } else {
                    console.warn("No response from server.");
                    last_result.innerHTML = "No websocket message received back :(";
                }
            } else {
                console.warn(`Unexpected message: ${event.data}`);
            }
        });

        // Get start time.
        var start = performance.now();

        // Send ping.
        websocket.send(`Ping_${i}`);
        console.log(`Ping_${i} sent`);
        

        if (success) {
            console.log(`Ping test ${i} completed.`);
            continue;
        }
    }
}


async function display_latest_ping_rtt(latestPingResult) {
    console.log("Function display_latest_ping_rtt() called.");

    // Display latest ping RTT.
    last_result.innerHTML = `Latest ping RTT: ${latestPingResult} ms`;
}

async function display_statistics(latestPingResult) {
    console.log("Function display_statistics() called.");

    // Compute mean, median, mode, range and std div.
    // Mean
    totalRTT += latestPingResult;
    var meanRTT = averageRTT / int_numberofpings;
    console.log(`Mean RTT: ${meanRTT} ms`);


    // AI generated code below

    // Median
    var medianRTT = 0;
    var arrRTT = [];
    arrRTT.push(latestPingResult);
    arrRTT.sort();
    if (arrRTT.length % 2 === 0) {
        medianRTT = (arrRTT[arrRTT.length / 2 - 1] + arrRTT[arrRTT.length / 2]) / 2;
    } else {
        medianRTT = arrRTT[(arrRTT.length - 1) / 2];
    }

    console.log(`Median RTT: ${medianRTT} ms`);

    // Mode
    var modeRTT = 0;
    var modeMap = {};
    var maxCount = 0;
    for (var i = 0; i < arrRTT.length; i++) {
        var num = arrRTT[i];
        modeMap[num] = (modeMap[num] || 0) + 1;
        if (modeMap[num] > maxCount) {
            maxCount = modeMap[num];
            modeRTT = num;
        }
    }

    console.log(`Mode RTT: ${modeRTT} ms`);

    // Range
    var rangeRTT = Math.max(...arrRTT) - Math.min(...arrRTT);
    console.log(`Range RTT: ${rangeRTT} ms`);

    // Standard deviation
    var stdDivRTT = 0;
    var sum = 0;
    for (var i = 0; i < arrRTT.length; i++) {
        sum += Math.pow(arrRTT[i] - meanRTT, 2);
    }
    stdDivRTT = Math.sqrt(sum / arrRTT.length);
    console.log(`Standard deviation RTT: ${stdDivRTT} ms`);

    // Display statistics.
    elemt_display_statistics.innerHTML = `Mean RTT: ${meanRTT} ms<br>Median RTT: ${medianRTT} ms<br>Mode RTT: ${modeRTT} ms<br>Range RTT: ${rangeRTT} ms<br>Standard deviation RTT: ${stdDivRTT} ms`;
}