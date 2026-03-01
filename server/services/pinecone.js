import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient = null;
let pineconeIndex = null;

function isConfigured() {
    return !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX);
}

async function getIndex() {
    if (!isConfigured()) return null;
    if (!pineconeIndex) {
        if (!pineconeClient) {
            pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        }
        pineconeIndex = pineconeClient.index(process.env.PINECONE_INDEX);
    }
    return pineconeIndex;
}

/**
 * Store a site analysis for a session (graceful no-op if Pinecone not configured)
 */
export async function storeAnalysis(sessionId, siteData) {
    try {
        const index = await getIndex();
        if (!index) return;

        // Simple embedding placeholder - in production use a real embedding model
        const vector = new Array(1536).fill(0).map(() => Math.random() * 0.01);

        await index.upsert([{
            id: `${sessionId}-${siteData.name}-${Date.now()}`,
            values: vector,
            metadata: {
                sessionId,
                siteName: siteData.name,
                rating: siteData.rating,
                timestamp: new Date().toISOString(),
                lat: siteData.lat,
                lng: siteData.lng,
            },
        }]);
    } catch (err) {
        console.warn('[Pinecone] storeAnalysis failed (non-fatal):', err.message);
    }
}

/**
 * Query session context from Pinecone
 */
export async function querySimilar(sessionId, limit = 5) {
    try {
        const index = await getIndex();
        if (!index) return [];

        const queryVector = new Array(1536).fill(0).map(() => Math.random() * 0.01);
        const result = await index.query({
            vector: queryVector,
            topK: limit,
            filter: { sessionId: { $eq: sessionId } },
            includeMetadata: true,
        });

        return result.matches?.map(m => m.metadata) || [];
    } catch (err) {
        console.warn('[Pinecone] querySimilar failed (non-fatal):', err.message);
        return [];
    }
}
