import fetch from "node-fetch";
import logger from "./logger.js"; // Assuming there's a logger module

const sendFetchRequests = async (urid, task_id, action_pixel_url, INCENTIVE_SERVER_DOMAIN, INCENTIVE_SYNCER_DOMAIN) => {
  // Helper function for retry mechanism
  const retryFetch = async (url, options = {}, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`Fetch failed with status: ${response.status}`);
        }
        return response;
      } catch (error) {
        if (i < retries - 1) {
          logger.warn(`Retrying fetch... (${i + 1}/${retries}) for URL: ${url}`);
          await new Promise(res => setTimeout(res, delay));
        } else {
          logger.error(`Fetch failed after ${retries} retries for URL: ${url}`);
          throw error;
        }
      }
    }
  };

  try {
    // Validate inputs
    if (typeof urid !== 'string' || typeof task_id !== 'string' || typeof action_pixel_url !== 'string' ||
        typeof INCENTIVE_SERVER_DOMAIN !== 'string' || typeof INCENTIVE_SYNCER_DOMAIN !== 'string') {
      throw new TypeError("Invalid input types.");
    }

    // Define URLs
    const stUrl = `https://${urid.substr(-5) % 3}.${INCENTIVE_SERVER_DOMAIN}/st?uid=${urid}&cat=${task_id}`;
    const pixelUrl = `https://${action_pixel_url}`;
    const syncerUrl = `https://${INCENTIVE_SYNCER_DOMAIN}/td?ac=1&urid=${urid}&cat=${task_id}&tid=${task_id}`;

    // Send fetch requests with retry mechanism
    await retryFetch(stUrl, { method: "POST" });
    await retryFetch(pixelUrl);
    await retryFetch(syncerUrl);

    logger.info("All fetch requests completed successfully.");
  } catch (error) {
    logger.error(`Error in sendFetchRequests: ${error.message}`);
  }
};

export default sendFetchRequests;
