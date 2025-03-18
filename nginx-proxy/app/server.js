const server = Bun.serve({
    port: 3000,
    fetch(request) {
        return new Response(
            JSON.stringify({
                url: request.url,
                headers: request.headers,
                method: request.method,
            }),
            { headers: { "Content-Type": "application/json" } }
        );
    },
});

console.log(`Listening on ${server.url}`);
