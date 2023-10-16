import fs from "node:fs";
import path from "node:path";

import { type Browser, chromium, firefox, webkit } from "playwright";

async function detectGlobals(browser: Browser): Promise<string[]> {
    const page = await browser.newPage();
    await page.goto("about:blank");
    const globals = await page.evaluate("Object.keys(Object.getOwnPropertyDescriptors(globalThis))");

    if (!Array.isArray(globals)) {
        throw new TypeError("failed to retrieve globals");
    }

    return globals.filter((x) => typeof x === "string") as string[];
}

async function main() {
    const browsers = [chromium, firefox, webkit];
    const browserInstances = await Promise.all(browsers.map((browser) => browser.launch()));
    const globals = await Promise.all(browserInstances.map(detectGlobals));
    const flattenedGlobals = globals.flat();
    await Promise.all(browserInstances.map((browser) => browser.close()));
    const uniqueGlobals = [...new Set(flattenedGlobals)];

    console.log(`collected ${uniqueGlobals.length} globals`);

    fs.writeFileSync(
        path.resolve(__dirname, "../src/globals.ts"),
        [
            "// This file is auto-generated by running `pnpm run collect`",
            "// DO NOT EDIT THIS FILE MANUALLY",
            "",
            "export const globals = [",
            ...uniqueGlobals.map((global) => `    '${global}',`),
            "] as const;",
            "",
            "export type BrowserGlobalKey = typeof globals[number];",
            "",
        ].join("\n"),
    );

    console.log("wrote to src/globals.ts");
}

main();