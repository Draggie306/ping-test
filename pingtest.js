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
    } else if (messageParts[0] === "ack") {
        document.getElementById("status").innerHTML = `Connected successfully.`
        document.getElementById("status").style.color = "green";

        document.getElementById("startButton").disabled = false
    } else if (messageParts[0] === "colodata") {
        const statSection = document.getElementById("test-information");

        statSection.append(`Server location: ${messageParts[1]} (${edge_locs[messageParts[1]]})`)
    }

    else {
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

function lowest(values) {
    return Math.min(values);
}

function highest(values) {
    return Math.max(values);
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
    return Math.sqrt(newArray.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
}


// https://github.com/stephenjjbrown/percentile/blob/master/src/main.js
function percentile(p, values) {
    if (p < 0 || p > 1) {
        throw new Error("p must be between 0 and 1");
    }
    var i = p * (values.length - 1);
    var floored = Math.floor(i);
    if (floored === i) {
        return values[i];
    }
    var decimal = i - floored;
    var difference = values[floored + 1] - values[floored];
    return values[floored] + difference * decimal;
}


// From https://github.com/LufsX/Cloudflare-Data-Center-IATA-Code-list
var edge_locs = {
  "AAE": "Annaba, Algeria",
  "ABJ": "Abidjan, Ivory Coast",
  "ABQ": "Albuquerque, United States",
  "ACC": "Accra, Ghana",
  "ACX": "Xingyi, China",
  "ADB": "Izmir, Turkey",
  "ADD": "Addis Ababa, Ethiopia",
  "ADL": "Adelaide, Australia",
  "AGR": "Agra, India",
  "AKL": "Auckland, New Zealand",
  "AKX": "Aktobe, Kazakhstan",
  "ALA": "Almaty, Kazakhstan",
  "ALG": "Algiers, Algeria",
  "AMD": "Ahmedabad, India",
  "AMM": "Amman, Jordan",
  "AMS": "Amsterdam, Netherlands",
  "ANC": "Anchorage, United States",
  "ARI": "Arica, Chile",
  "ARN": "Stockholm, Sweden",
  "ARU": "Aracatuba, Brazil",
  "ASK": "Yamoussoukro, Ivory Coast",
  "ASU": "Asunción, Paraguay",
  "ATH": "Athens, Greece",
  "ATL": "Atlanta, United States",
  "AUS": "Austin, United States",
  "BAH": "Manama, Bahrain",
  "BAQ": "Barranquilla, Colombia",
  "BBI": "Bhubaneswar, India",
  "BCN": "Barcelona, Spain",
  "BEG": "Belgrade, Serbia",
  "BEL": "Belém, Brazil",
  "BEY": "Beirut, Lebanon",
  "BGI": "Bridgetown, Barbados",
  "BGR": "Bangor, United States",
  "BGW": "Baghdad, Iraq",
  "BHY": "Beihai, China",
  "BKK": "Bangkok, Thailand",
  "BLR": "Bangalore, India",
  "BNA": "Nashville, United States",
  "BNE": "Brisbane, Australia",
  "BNU": "Blumenau, Brazil",
  "BOD": "Bordeaux, France",
  "BOG": "Bogotá, Colombia",
  "BOM": "Mumbai, India",
  "BOS": "Boston, United States",
  "BRU": "Brussels, Belgium",
  "BSB": "Brasilia, Brazil",
  "BSR": "Basra, Iraq",
  "BTS": "Bratislava, Slovakia",
  "BUD": "Budapest, Hungary",
  "BUF": "Buffalo, United States",
  "BWN": "Bandar Seri Begawan, Brunei",
  "CAI": "Cairo, Egypt",
  "CAN": "Guangzhou, China",
  "CAW": "Campos dos Goytacazes, Brazil",
  "CBR": "Canberra, Australia",
  "CCP": "Concepción, Chile",
  "CCU": "Kolkata, India",
  "CDG": "Paris, France",
  "CEB": "Cebu, Philippines",
  "CFC": "Caçador, Brazil",
  "CGB": "Cuiaba, Brazil",
  "CGD": "Changde, China",
  "CGK": "Jakarta, Indonesia",
  "CGO": "Zhengzhou, China",
  "CGP": "Chittagong, Bangladesh",
  "CGY": "Cagayan de Oro, Philippines",
  "CHC": "Christchurch, New Zealand",
  "CJB": "Coimbatore, India",
  "CKG": "Chongqing, China",
  "CLE": "Cleveland, United States",
  "CLO": "Cali, Colombia",
  "CLT": "Charlotte, United States",
  "CMB": "Colombo, Sri Lanka",
  "CMH": "Columbus, United States",
  "CNF": "Belo Horizonte, Brazil",
  "CNN": "Kannur, India",
  "CNX": "Chiang Mai, Thailand",
  "COK": "Kochi, India",
  "COR": "Córdoba, Argentina",
  "CPH": "Copenhagen, Denmark",
  "CPT": "Cape Town, South Africa",
  "CRK": "Tarlac City, Philippines",
  "CSX": "Changsha, China",
  "CTU": "Chengdu, China",
  "CWB": "Curitiba, Brazil",
  "CZL": "Constantine, Algeria",
  "CZX": "Changzhou, China",
  "DAC": "Dhaka, Bangladesh",
  "DAD": "Da Nang, Vietnam",
  "DAR": "Dar Es Salaam, Tanzania",
  "DEL": "New Delhi, India",
  "DEN": "Denver, United States",
  "DFW": "Dallas, United States",
  "DKR": "Dakar, Senegal",
  "DLC": "Dalian, China",
  "DME": "Moscow, Russia",
  "DMM": "Dammam, Saudi Arabia",
  "DOH": "Doha, Qatar",
  "DPS": "Denpasar, Indonesia",
  "DTW": "Detroit, United States",
  "DUB": "Dublin, Ireland",
  "DUR": "Durban, South Africa",
  "DUS": "Düsseldorf, Germany",
  "DXB": "Dubai, United Arab Emirates",
  "EBB": "Kampala, Uganda",
  "EBL": "Erbil, Iraq",
  "EDI": "Edinburgh, United Kingdom",
  "EVN": "Yerevan, Armenia",
  "EWR": "Newark, United States",
  "EZE": "Buenos Aires, Argentina",
  "FCO": "Rome, Italy",
  "FIH": "Kinshasa, DR Congo",
  "FLN": "Florianopolis, Brazil",
  "FOC": "Fuzhou, China",
  "FOR": "Fortaleza, Brazil",
  "FRA": "Frankfurt, Germany",
  "FRU": "Bishkek, Kyrgyzstan",
  "FSD": "Sioux Falls, United States",
  "FUK": "Fukuoka, Japan",
  "FUO": "Foshan, China",
  "GBE": "Gaborone, Botswana",
  "GDL": "Guadalajara, Mexico",
  "GEO": "Georgetown, Guyana",
  "GIG": "Rio de Janeiro, Brazil",
  "GND": "St. George's, Grenada",
  "GOT": "Gothenburg, Sweden",
  "GRU": "São Paulo, Brazil",
  "GUA": "Guatemala City, Guatemala",
  "GUM": "Hagatna, Guam",
  "GVA": "Geneva, Switzerland",
  "GYD": "Baku, Azerbaijan",
  "GYE": "Guayaquil, Ecuador",
  "GYN": "Goiânia, Brazil",
  "HAK": "Haikou, China",
  "HAM": "Hamburg, Germany",
  "HAN": "Hanoi, Vietnam",
  "HBA": "Hobart, Australia",
  "HEL": "Helsinki, Finland",
  "HFA": "Haifa, Israel",
  "HFE": "Huainan, China",
  "HGH": "Shaoxing, China",
  "HKG": "Hong Kong",
  "HNL": "Honolulu, United States",
  "HRE": "Harare, Zimbabwe",
  "HYD": "Hyderabad, India",
  "HYN": "Taizhou, China",
  "IAD": "Ashburn, United States",
  "IAH": "Houston, United States",
  "ICN": "Seoul, South Korea",
  "IND": "Indianapolis, United States",
  "ISB": "Islamabad, Pakistan",
  "IST": "Istanbul, Turkey",
  "ISU": "Sulaymaniyah, Iraq",
  "ITJ": "Itajai, Brazil",
  "IXC": "Chandigarh, India",
  "JAX": "Jacksonville, United States",
  "JDO": "Juazeiro do Norte, Brazil",
  "JED": "Jeddah, Saudi Arabia",
  "JHB": "Johor Bahru, Malaysia",
  "JIB": "Djibouti City",
  "JNB": "Johannesburg, South Africa",
  "JOG": "Yogyakarta, Indonesia",
  "JOI": "Joinville, Brazil",
  "JRG": "Sambalpur, India",
  "JSR": "Jashore, Bangladesh",
  "JXG": "Jiaxing, China",
  "KBP": "Kyiv, Ukraine",
  "KCH": "Kuching, Malaysia",
  "KEF": "Reykjavík, Iceland",
  "KGL": "Kigali, Rwanda",
  "KHH": "Kaohsiung City, Taiwan",
  "KHI": "Karachi, Pakistan",
  "KHN": "Xinyu, China",
  "KIN": "Kingston, Jamaica",
  "KIV": "Chișinău, Moldova",
  "KIX": "Osaka, Japan",
  "KJA": "Krasnoyarsk, Russia",
  "KMG": "Kunming, China",
  "KNU": "Kanpur, India",
  "KTM": "Kathmandu, Nepal",
  "KUL": "Kuala Lumpur, Malaysia",
  "KWE": "Guiyang, China",
  "KWI": "Kuwait City, Kuwait",
  "LAD": "Luanda, Angola",
  "LAS": "Las Vegas, United States",
  "LAX": "Los Angeles, United States",
  "LCA": "Nicosia, Cyprus",
  "LED": "Saint Petersburg, Russia",
  "LHE": "Lahore, Pakistan",
  "LHR": "London, United Kingdom",
  "LHW": "Lanzhou, China",
  "LIM": "Lima, Peru",
  "LIS": "Lisbon, Portugal",
  "LJU": "Ljubljana, Slovenia",
  "LLK": "Astara, Azerbaijan",
  "LLW": "Lilongwe, Malawi",
  "LOCAL": "LOCAL",
  "LOS": "Lagos, Nigeria",
  "LPB": "La Paz, Bolivia",
  "LUN": "Lusaka, Zambia",
  "LUX": "Luxembourg City, Luxembourg",
  "LYA": "Luoyang, China",
  "LYS": "Lyon, France",
  "MAA": "Chennai, India",
  "MAD": "Madrid, Spain",
  "MAN": "Manchester, United Kingdom",
  "MAO": "Manaus, Brazil",
  "MBA": "Mombasa, Kenya",
  "MCI": "Kansas City, United States",
  "MCT": "Muscat, Oman",
  "MDE": "Medellín, Colombia",
  "MEL": "Melbourne, Australia",
  "MEM": "Memphis, United States",
  "MEX": "Mexico City, Mexico",
  "MFE": "McAllen, United States",
  "MFM": "Macau",
  "MIA": "Miami, United States",
  "MLA": "Santa Venera, Malta",
  "MLE": "Malé, Maldives",
  "MLG": "Malang, Indonesia",
  "MNL": "Manila, Philippines",
  "MPM": "Maputo, Mozambique",
  "MRS": "Marseille, France",
  "MRU": "Port Louis, Mauritius",
  "MSP": "Minneapolis, United States",
  "MSQ": "Minsk, Belarus",
  "MUC": "Munich, Germany",
  "MXP": "Milan, Italy",
  "NAG": "Nagpur, India",
  "NBO": "Nairobi, Kenya",
  "NJF": "Najaf, Iraq",
  "NNG": "Nanning, China",
  "NOU": "Noumea, New Caledonia",
  "NQN": "Neuquén, Argentina",
  "NQZ": "Astana, Kazakhstan",
  "NRT": "Tokyo, Japan",
  "NVT": "Timbó, Brazil",
  "OKA": "Naha, Japan",
  "OKC": "Oklahoma City, United States",
  "OMA": "Omaha, United States",
  "ORD": "Chicago, United States",
  "ORF": "Norfolk, United States",
  "ORK": "Cork, Ireland",
  "ORN": "Oran, Algeria",
  "OSL": "Oslo, Norway",
  "OTP": "Bucharest, Romania",
  "OUA": "Ouagadougou, Burkina Faso",
  "PAT": "Patna, India",
  "PBH": "Thimphu, Bhutan",
  "PBM": "Paramaribo, Suriname",
  "PDX": "Portland, United States",
  "PER": "Perth, Australia",
  "PHL": "Philadelphia, United States",
  "PHX": "Phoenix, United States",
  "PIT": "Pittsburgh, United States",
  "PKX": "Langfang, China",
  "PMO": "Palermo, Italy",
  "PMW": "Palmas, Brazil",
  "PNH": "Phnom Penh, Cambodia",
  "PNQ": "Pune, India",
  "POA": "Porto Alegre, Brazil",
  "POS": "Port of Spain, Trinidad and Tobago",
  "PPT": "Tahiti, French Polynesia",
  "PRG": "Prague, Czech Republic",
  "PTY": "Panama City, Panama",
  "QRO": "Queretaro, Mexico",
  "QWJ": "Americana, Brazil",
  "RAO": "Ribeirao Preto, Brazil",
  "RDU": "Durham, United States",
  "REC": "Recife, Brazil",
  "RIC": "Richmond, United States",
  "RIX": "Riga, Latvia",
  "RUH": "Riyadh, Saudi Arabia",
  "RUN": "Réunion, France",
  "SAN": "San Diego, United States",
  "SAP": "San Pedro Sula, Honduras",
  "SAT": "San Antonio, United States",
  "SCL": "Santiago, Chile",
  "SDQ": "Santo Domingo, Dominican Republic",
  "SEA": "Seattle, United States",
  "SFO": "San Francisco, United States",
  "SGN": "Ho Chi Minh City, Vietnam",
  "SHA": "Shanghai, China",
  "SIN": "Singapore",
  "SJC": "San Jose, United States",
  "SJK": "São José dos Campos, Brazil",
  "SJO": "San José, Costa Rica",
  "SJP": "São José do Rio Preto, Brazil",
  "SJU": "San Juan, Puerto Rico",
  "SJW": "Hengshui, China",
  "SKG": "Thessaloniki, Greece",
  "SKP": "Skopje, North Macedonia",
  "SLC": "Salt Lake City, United States",
  "SMF": "Sacramento, United States",
  "SOD": "Sorocaba, Brazil",
  "SOF": "Sofia, Bulgaria",
  "SSA": "Salvador, Brazil",
  "STI": "Santiago de los Caballeros, Dominican Republic",
  "STL": "St. Louis, United States",
  "STR": "Stuttgart, Germany",
  "SUV": "Suva, Fiji",
  "SVX": "Yekaterinburg, Russia",
  "SYD": "Sydney, Australia",
  "SZX": "Shenzhen, China",
  "TAO": "Qingdao, China",
  "TAS": "Tashkent, Uzbekistan",
  "TBS": "Tbilisi, Georgia",
  "TEN": "Tongren, China",
  "TGU": "Tegucigalpa, Honduras",
  "TIA": "Tirana, Albania",
  "TLH": "Tallahassee, United States",
  "TLL": "Tallinn, Estonia",
  "TLV": "Tel Aviv, Israel",
  "TNA": "Jinan, China",
  "TNR": "Antananarivo, Madagascar",
  "TPA": "Tampa, United States",
  "TPE": "Taipei",
  "TSN": "Tianjin, China",
  "TUN": "Tunis, Tunisia",
  "TXL": "Berlin, Germany",
  "TYN": "Yangquan, China",
  "UDI": "Uberlândia, Brazil",
  "UIO": "Quito, Ecuador",
  "ULN": "Ulaanbaatar, Mongolia",
  "URT": "Surat Thani, Thailand",
  "VCP": "Campinas, Brazil",
  "VIE": "Vienna, Austria",
  "VIX": "Vitoria, Brazil",
  "VNO": "Vilnius, Lithuania",
  "VTE": "Vientiane, Laos",
  "WAW": "Warsaw, Poland",
  "WDH": "Windhoek, Namibia",
  "WHU": "Wuhu, China",
  "WLG": "Wellington, New Zealand",
  "WRO": "Wroclaw, Poland",
  "XAP": "Chapeco, Brazil",
  "XFN": "Xiangyang, China",
  "XIY": "Baoji, China",
  "XNH": "Nasiriyah, Iraq",
  "XNN": "Xining, China",
  "YHZ": "Halifax, Canada",
  "YOW": "Ottawa, Canada",
  "YUL": "Montréal, Canada",
  "YVR": "Vancouver, Canada",
  "YWG": "Winnipeg, Canada",
  "YXE": "Saskatoon, Canada",
  "YYC": "Calgary, Canada",
  "YYZ": "Toronto, Canada",
  "ZAG": "Zagreb, Croatia",
  "ZDM": "Ramallah",
  "ZGN": "Zhongshan, China",
  "ZRH": "Zurich, Switzerland"
}