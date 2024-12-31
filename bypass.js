import puppeteer from "puppeteer";
import extractValuesFromHTML from "./extractValuesFromHTML.js";
import openWebSocket from "./openWebSocket.js";
import sendFetchRequests from "./sendFetchRequests.js";
import logger from "./logger.js"; // Ensure to create this module

const DEFAULT_OPTIONS = {
  waitUntil: "domcontentloaded", // Default wait until DOM content loaded
  timeout: 30000, // Default timeout of 30 seconds
  debug: false, // Enable debug logging
  headers: {}, // Custom headers
  maxRetries: 3, // Maximum retries for navigation
};

// Function to initialize the browser and set up the page
const initializeBrowser = async (options = {}) => {
  const defaultOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't work in Windows
      '--disable-gpu'
    ],
    ...options
  };

  const browser = await puppeteer.launch(defaultOptions);
  const page = await browser.newPage();

  await page.setRequestInterception(true);
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
  );

  page.on("request", (request) => {
    if (request.resourceType() === 'image' || request.resourceType() === 'stylesheet') {
      request.abort(); // Block images and stylesheets for faster loading
    } else {
      request.continue();
    }
  });

  page.on('console', (msg) => {
    for (let i = 0; i < msg.args().length; ++i)
      console.log(`${i}: ${msg.args()[i]}`);
  });

  page.on('error', (err) => {
    console.error(`Error on page: ${err}`);
  });

  page.on('pageerror', (pageErr) => {
    console.error(`Page error: ${pageErr}`);
  });

  page.on('response', response => {
    if (!response.ok()) {
      console.error(`Response error: ${response.status()} ${response.statusText()} on ${response.url()}`);
    }
  });

  return { browser, page };
};

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
export {
  initializeBrowser,
  closeBrowser,
  navigateToUrl,
  evaluateScript,
  takeScreenshot,
  generatePDF
};
