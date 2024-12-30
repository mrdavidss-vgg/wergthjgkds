import extractValuesFromHTML from "./extractValuesFromHTML.js";
import openWebSocket from "./openWebSocket.js";
import sendFetchRequests from "./sendFetchRequests.js";
import logger from "./logger.js"; // Ensure to create this module

const handleResponse = async (response, page) => {
  try {
    const url = response.url();
    const request = response.request();

    if (url.includes("/tc") && request.method() === 'POST') {
      const data = await response.json();
      console.log(data);

      let userId = "";
      let actionPixelURL = "";
      const taskId = "54";

      data.forEach((item) => {
        userId = item.urid;
        actionPixelURL = item.action_pixel_url;
      });

      const extractedValues = extractValuesFromHTML(await page.content());
      const incentiveServerDomain = await page.evaluate(() => INCENTIVE_SERVER_DOMAIN);
      const incentiveSyncerDomain = await page.evaluate(() => INCENTIVE_SYNCER_DOMAIN);

      await sendFetchRequests(userId, taskId, actionPixelURL, incentiveServerDomain, incentiveSyncerDomain);

      const bypassed = await openWebSocket(userId, taskId, extractedValues, incentiveServerDomain);

      return bypassed;
    }
  } catch (error) {
    handleError(error);
  }
};

// Advanced error handling
const handleError = (error) => {
  logger.error("Detailed Error Information: ", {
    message: error.message,
    stack: error.stack,
    response: error.response,
  });
};

// Retry mechanism
const retryRequest = async (fn, retries = 3, delay = 1000) => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

// Example usage with retry
const fetchDataWithRetry = async (url, options) => {
  return retryRequest(() => fetch(url, options));
};

export default handleResponse;
