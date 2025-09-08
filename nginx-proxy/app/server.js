const server = Bun.serve({
    port: 3000,
    fetch(request) {
        return new Response(
            JSON.stringify({
                hostname: process.env.SERVICE_NAME || 'unknown',
                url: request.url,
                method: request.method,
                headers: request.headers,
            }),
            { headers: { "Content-Type": "application/json" } }
        );
    },
});

console.log(`Listening on ${server.url}`);
