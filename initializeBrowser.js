import puppeteer from "puppeteer";

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

// Utility function to close the browser gracefully
const closeBrowser = async (browser) => {
  try {
    await browser.close();
  } catch (error) {
    console.error("Failed to close browser:", error);
  }
};

// Utility function to navigate to a URL and wait for a selector
const navigateToUrl = async (page, url, selector) => {
  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.waitForSelector(selector);
  } catch (error) {
    console.error(`Failed to navigate to ${url}:`, error);
  }
};

// Function to evaluate a script on the page
const evaluateScript = async (page, script) => {
  try {
    return await page.evaluate(script);
  } catch (error) {
    console.error("Failed to evaluate script:", error);
    return null;
  }
};

// Function to take a screenshot
const takeScreenshot = async (page, path) => {
  try {
    await page.screenshot({ path });
  } catch (error) {
    console.error("Failed to take screenshot:", error);
  }
};

// Function to generate a PDF
const generatePDF = async (page, path) => {
  try {
    await page.pdf({ path, format: 'A4' });
  } catch (error) {
    console.error("Failed to generate PDF:", error);
  }
};

export {
  initializeBrowser,
  closeBrowser,
  navigateToUrl,
  evaluateScript,
  takeScreenshot,
  generatePDF
};
