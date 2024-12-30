import * as cheerio from 'cheerio';
import logger from './logger.js';

const KEY_VALUE_REGEX = /p\[(?:'([^']+)'|`([^`]+)`|"([^"]+)")\]\s*=\s*(?:'([^']+)'|`([^`]+)`|"([^"]+)"|(\d+)|([^;]+));/g;

// Utility function to validate HTML input
function validateHTML(html) {
  if (typeof html !== 'string' || !html.trim()) {
    throw new Error('Invalid HTML input provided.');
  }
}

// Utility function to extract values from script content
function extractFromScriptContent(scriptContent) {
  const extractedValues = new Map();
  for (const match of scriptContent.matchAll(KEY_VALUE_REGEX)) {
    const key = match[1] || match[2] || match[3];
    const value = match[4] || match[5] || match[6] || match[7] || match[8];
    if (key) extractedValues.set(key, value?.trim());
  }
  return extractedValues;
}

// Main function to extract values from HTML
async function extractValuesFromHTML(html) {
  try {
    validateHTML(html);
    const $ = cheerio.load(html);
    const extractedValues = new Map();

    $('script').each((_, script) => {
      const scriptContent = $(script).html()?.trim();
      if (scriptContent) {
        const scriptValues = extractFromScriptContent(scriptContent);
        scriptValues.forEach((value, key) => {
          extractedValues.set(key, value);
        });
      }
    });

    logger.debug(`Extracted values: ${JSON.stringify(Object.fromEntries(extractedValues))}`);
    return Object.fromEntries(extractedValues);

  } catch (error) {
    logger.error(`Extraction error: ${error.message}`);
    return null;
  }
}

// Additional utility functions
export async function extractMultipleHTMLValues(htmlArray) {
  try {
    if (!Array.isArray(htmlArray)) {
      throw new Error('Input should be an array of HTML strings.');
    }

    const results = await Promise.all(htmlArray.map(html => extractValuesFromHTML(html)));
    return results;
  } catch (error) {
    logger.error(`Error extracting multiple HTML values: ${error.message}`);
    return null;
  }
}

export function mergeExtractedValues(...extractedValuesArray) {
  try {
    const mergedValues = new Map();

    extractedValuesArray.forEach(values => {
      if (values) {
        Object.entries(values).forEach(([key, value]) => {
          mergedValues.set(key, value);
        });
      }
    });

    return Object.fromEntries(mergedValues);
  } catch (error) {
    logger.error(`Error merging extracted values: ${error.message}`);
    return null;
  }
}

// Export the main function
export default extractValuesFromHTML;
