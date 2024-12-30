import initializeBrowser from "./initializeBrowser.js";
import handleResponse from "./handleResponse.js";
import logger from "./logger.js"; // Added logging

const DEFAULT_OPTIONS = {
  waitUntil: "domcontentloaded", // Default wait until DOM content loaded
  timeout: 30000, // Default timeout of 30 seconds
  debug: false, // Enable debug logging
  headers: {}, // Custom headers
  maxRetries: 3, // Maximum retries for navigation
};

const bypass = async (urlToBypass, options = {}) => {
  const { waitUntil, timeout, debug, headers, maxRetries } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  if (debug) {
    logger.level = "debug";
  }

  let retries = 0;
  let bypassedUrl;

  while (retries < maxRetries && !bypassedUrl) {
    const { browser, page } = await initializeBrowser();

    try {
      await page.setExtraHTTPHeaders(headers); // Set custom headers

      bypassedUrl = await new Promise((resolve, reject) => {
        let timeoutId;

        page.on("response", async (response) => {
          const bypassed = await handleResponse(response, page);
          if (bypassed) {
            clearTimeout(timeoutId); // Clear timeout if bypassed URL is found
            resolve(bypassed);
          }
        });

        page.goto(urlToBypass, { waitUntil, timeout })
          .then(() => {
            if (!bypassedUrl) {
              logger.warn("No bypass found after navigation.");
              resolve(null);
            }
          })
          .catch((error) => {
            logger.error(`Navigation error: ${error.message}`);
            reject(error);
          });


        timeoutId = setTimeout(() => {
          logger.warn("Bypass timed out.");
          resolve(null);
        }, timeout);

      });


      await browser.close();
    } catch (error) {
      logger.error(`Error during bypass: ${error.message}`);
      await browser.close();
      if (retries < maxRetries - 1) {
        logger.info(`Retrying... (${retries + 1}/${maxRetries})`);
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
      }
    }
  }
  

  if (!bypassedUrl) {
    logger.error(`Failed to bypass URL after ${maxRetries} retries.`);
    return null;
  }

  logger.info(`Bypassed URL: ${bypassedUrl}`);
  return bypassedUrl;
};


export default bypass;
