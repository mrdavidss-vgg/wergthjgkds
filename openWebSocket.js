import WebSocket from "ws";
import decodeURI from "./decodeURI.js";
import logger from "./logger.js"; // Assuming there's a logger module

// Retry algorithm
const retry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i < retries - 1) {
        logger.warn(`Retrying... (${i + 1}/${retries})`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        throw error;
      }
    }
  }
};

const openWebSocket = (urid, task_id, extracted, INCENTIVE_SERVER_DOMAIN) => {
  return new Promise((resolve, reject) => {
    try {
      // Validate inputs
      if (typeof urid !== 'string' || typeof task_id !== 'string' || typeof INCENTIVE_SERVER_DOMAIN !== 'string') {
        throw new TypeError("Invalid input types.");
      }

      if (!urid || !task_id || !extracted || !extracted.KEY || !INCENTIVE_SERVER_DOMAIN) {
        throw new Error("Missing required parameters.");
      }

      // Generate WebSocket URL
      const wsUrl = `wss://${urid.substr(-5) % 3}.${INCENTIVE_SERVER_DOMAIN}/c?uid=${urid}&cat=${task_id}&key=${encodeURIComponent(extracted.KEY)}`;

      // WebSocket connection with retry
      retry(() => {
        const ws = new WebSocket(wsUrl);

        // Heartbeat mechanism
        let interval;
        ws.on("open", () => {
          logger.info("WebSocket connection opened.");
          interval = setInterval(() => ws.send("0"), 1000);

          ws.on("close", () => {
            clearInterval(interval);
            logger.info("WebSocket connection closed.");
          });
        });

        ws.on("message", (event) => {
          const text = event.toString("utf-8");

          if (text.includes("r:")) {
            const PUBLISHER_LINK = text.replace("r:", "");
            const bypassed = decodeURIComponent(decodeURI(PUBLISHER_LINK));

            // Validate decoded URL
            try {
              new URL(bypassed);
              ws.close();
              resolve(bypassed);
            } catch (e) {
              reject(new Error("Invalid URL decoded."));
            }
          }
        });

        ws.on("error", (error) => {
          logger.error(`WebSocket error: ${error.message}`);
          reject(error);
        });

        return ws;
      }).catch(reject);

    } catch (error) {
      logger.error(`Initialization error: ${error.message}`);
      reject(error);
    }
  });
};

export default openWebSocket;
