const server = Bun.serve({
    port: 3000,
    fetch(request) {
        return new Response(
            JSON.stringify({
                url: request.url,
                method: request.method,
                hostname: process.env.HOSTNAME || 'unknown',
                timestamp: new Date().toISOString(),
                headers: request.headers,
            }),
            { headers: { "Content-Type": "application/json" } }
        );
    },
});

console.log(`Listening on ${server.url}`);
