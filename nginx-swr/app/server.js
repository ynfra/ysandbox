const server = Bun.serve({
    port: 3000,
    fetch(request) {
        const now = new Date();
        return new Response(`Now: ${now.toUTCString()}`);
    },
});

console.log(`Listening on ${server.url}`);
