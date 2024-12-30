import * as cheerio from 'cheerio';
import logger from "./logger.js";

const KEY_VALUE_REGEX = /p\[(?:'([^']+)'|`([^`]+)`|"([^"]+)")\]\s*=\s*(?:'([^']+)'|`([^`]+)`|"([^"]+)"|(\d+)|([^;]+));/g;

function extractValuesFromHTML(html) {
  try {
    if (typeof html !== 'string' || !html.trim()) {
      throw new Error("Invalid HTML input provided.");
    }

    const $ = cheerio.load(html);
    const extractedValues = {};

    $('script').each((_, script) => {
      $(script).html()?.trim()?.matchAll(KEY_VALUE_REGEX)?.forEach(match => {
        const key = match[1] || match[2] || match[3];
        const value = (match[4] || match[5] || match[6] || match[7] || match[8])?.trim();
        if (key) extractedValues[key] = value;
      });
    });

    logger.debug(`Extracted values: ${JSON.stringify(extractedValues)}`);
    return extractedValues;

  } catch (error) {
    logger.error(`Extraction error: ${error.message}`);
    return null;
  }
}

export default extractValuesFromHTML;
