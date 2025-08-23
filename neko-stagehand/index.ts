import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";

async function main() {
    const stagehand = new Stagehand({
        env: "LOCAL",
        modelName: "gpt-4o-mini",
        modelClientOptions: {
            baseURL: process.env.OPENAI_BASE_URL,
            apiKey: process.env.OPENAI_API_KEY,
        },
        localBrowserLaunchOptions: {
            cdpUrl: 'http://0.0.0.0:9223',
            recordVideo: { dir: './videos', size: { width: 1920, height: 1080 } },
        },
    });

    await stagehand.init();

    const page = stagehand.page;

    await page.goto("https://stagehand.dev");

    const extractResult = await page.extract("Extract the value proposition from the page.");
    console.log(`Extract result:\n`, extractResult);

    const actResult = await page.act("Click the 'Evals' button.");
    console.log(`Act result:\n`, actResult);

    const observeResult = await page.observe("What can I click on this page?");
    console.log(`Observe result:\n`, observeResult);

    const agent = await stagehand.agent({
        instructions: "You're a helpful assistant that can control a web browser.",
    });

    const agentResult = await agent.execute("What is the most accurate model to use in Stagehand?");
    console.log(`Agent result:\n`, agentResult);

    await stagehand.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
