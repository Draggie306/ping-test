/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// Ping test Worker application
// Reference: https://developers.cloudflare.com/workers/examples/websockets/


async function handleRequest(request) {
  const upgradeHeader = request.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 });
  }

  const webSocketPair = new WebSocketPair();
  const client = webSocketPair[0],
        server = webSocketPair[1];

  // Accept the WebSocket connection
  server.accept();
  console.log("WebSocket connection accepted.");

  server.send(`ack`);

  server.addEventListener('message', event => {
    var start = performance.now();
    //console.log(`Message received! Event data: ${event.data}`);

    // Parse data from client
    var data = event.data;
    if (data.toString().startsWith("Ping_")) {
      //console.log("Confirmed: event data starts with Ping_");
      // Process the number of the integer that has been pinged
      var intNum = data.toString().split("_")[1];

      // Return the pong of the responded message
      server.send(`Pong_${intNum}_${performance.now() - start}`);
      console.log(`Sent response: "Pong_${intNum}"`);
      //return new Response("ok");
    } else {
      console.log("Unknown message, sending unknown response");
      server.send("unknown?");
    }
  });

  // Handle errors
  server.addEventListener('error', event => {
    console.error("WebSocket error:", event);
  });

  // Handle WebSocket close event
  server.addEventListener('close', event => {
    console.log("WebSocket connection closed.");
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}


export default {
  async fetch(request, env, ctx) {
    return handleRequest(request);
  },
};