const server = Bun.serve({
    port: 3000,
    fetch(request) {
        // Date
        const now = new Date();
        const date =
            String(now.getFullYear()) + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + '-' +
            String(now.getHours()).padStart(2, '0') + ':' +
            String(now.getMinutes()).padStart(2, '0') + ':' +
            String(now.getSeconds()).padStart(2, '0');

        const response = new Response(`Now: ${date}`);

        // Access logs
        const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        console.log(`[${date}] ${request.method} ${request.url} - ${response.status} - IP: ${clientIP} - UA: ${userAgent}`);

        return response;
    },
});

console.log(`Listening on ${server.url}`);
