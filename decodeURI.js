import logger from "./logger.js";

function decodeURI(encodedString, prefixLength = 5) {
  try {
    if (typeof encodedString !== 'string') {
      throw new TypeError("Encoded string must be a string.");
    }

    // Check if the input string looks like valid Base64.
    if (!/^[A-Za-z0-9+/=]*$/.test(encodedString)) {
        throw new Error("Input string does not appear to be valid Base64.");
    }



    const base64Decoded = atob(encodedString);
    if (base64Decoded.length < prefixLength) {
      throw new Error("Encoded string is too short after Base64 decoding.");
    }

    const prefix = base64Decoded.slice(0, prefixLength);
    const encodedPortion = base64Decoded.slice(prefixLength);
    let decodedString = "";

    for (let i = 0; i < encodedPortion.length; i++) {
      decodedString += String.fromCharCode(
        encodedPortion.charCodeAt(i) ^ prefix.charCodeAt(i % prefixLength)
      );
    }

    logger.debug(`Decoded string: ${decodedString}`);
    return decodedString;

  } catch (error) {
    if (error instanceof DOMException && error.name === "InvalidCharacterError") {
      logger.error("Invalid Base64 string provided.");
    } else if (error instanceof TypeError) {
      logger.error(error.message);
    } else {
      logger.error(`Decoding error: ${error.message}`); 
    }
    return null;
  }
}

export default decodeURI;
