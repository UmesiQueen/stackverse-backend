export const logger = (req, _, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';

    console.log(`[${timestamp}] ${method} ${url}`);
    console.log(`  IP: ${ip}`);
    console.log(`  User-Agent: ${userAgent}`);

    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`  Body: ${JSON.stringify(req.body, null, 2)}`);
    }

    if (req.query && Object.keys(req.query).length > 0) {
        console.log(`  Query: ${JSON.stringify(req.query, null, 2)}`);
    }

    console.log('  ---');

    next();
};