const puppeteer = require('puppeteer');
const logger = require('./logger'); // Assuming logger.js is in the same directory

const DEFAULT_OPTIONS = {
    waitUntil: "domcontentloaded",
    timeout: 30000,
    debug: false,
    headers: {},
    maxRetries: 3,
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
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        try {
            await page.setExtraHTTPHeaders(headers);

            bypassedUrl = await new Promise((resolve, reject) => {
                let timeoutId;

                page.on("response", async (response) => {
                    const bypassed = await handleResponse(response, page);
                    if (bypassed) {
                        clearTimeout(timeoutId);
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
                await new Promise(resolve => setTimeout(resolve, 1000));
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

module.exports = bypass;
