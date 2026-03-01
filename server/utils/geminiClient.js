import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Unified utility to instantiate the GoogleGenerativeAI client.
 * Prioritizes a user-supplied API key (e.g., from request headers) 
 * over the server's default environment variable.
 *
 * @param {string|null} userApiKey - The API key provided by the user (if any)
 * @returns {GoogleGenerativeAI} The instantiated Gemini client
 * @throws {Error} If no API key is available
 */
export function getGenAI(userApiKey) {
    const keyToUse = userApiKey || process.env.GEMINI_API_KEY;

    if (!keyToUse) {
        throw new Error('No API key found. Please provide a Gemini API Key in the settings.');
    }

    return new GoogleGenerativeAI(keyToUse);
}
