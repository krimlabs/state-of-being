import {
  fetchLastSavedInIndex,
  saveUltrahumanInsightsToVault,
} from "@src/sleep";
import { rm, unlink } from "node:fs/promises";
import { expect, describe, it, beforeAll, afterAll } from "bun:test";

import config from "@src/config";

describe("fetchInsights", () => {
  it("should fetch insights for a week given a token and a start_date", async () => {
    // const res = await fetchInsights(config.ULTRAHUMAN_R1_TOKEN, "13-03-2023");
    // console.log(res.data.weeks);
  });
});

describe("fetchLastSavedInIndex", () => {
  const savePath = "./vault/ultrahuman.test";

  beforeAll(async () => {
    await Bun.write(
      savePath + "/index.json",
      `["13-03-2023", "20-03-2023", "02-04-2023"]`,
    );
  });

  afterAll(async () => {
    await rm(savePath, { recursive: true });
  });

  it("should default to 13-03-2023 if index.json does not exist", async () => {
    const lastSaved = await fetchLastSavedInIndex("./non-existent-path");
    expect(lastSaved).toBe("13-03-2023");
  });

  it("should return the last saved date if index.json exists", async () => {
    const lastSaved = await fetchLastSavedInIndex(savePath);
    expect(lastSaved).toBe("02-04-2023");
  });

  it("should fetch and save insights to vault", async () => {
    const res = await saveUltrahumanInsightsToVault(
      config.ULTRAHUMAN_R1_TOKEN,
      savePath,
    );

    const indexFile = Bun.file(`${savePath}/index.json`);
    expect(await indexFile.exists()).toBe(true);
    const expectedIndexContent = [
      "13-03-2023",
      "20-03-2023",
      "02-04-2023",
      "03-04-2023",
    ];
    const indexContent = JSON.parse(await indexFile.text());
    expect(indexContent).toEqual(expectedIndexContent);

    expect(await Bun.file(`${savePath}/03-04-2023.json`).exists()).toBe(true);
  });

  it("should fetch and save the next set insights to vault when called again", async () => {
    const res = await saveUltrahumanInsightsToVault(
      config.ULTRAHUMAN_R1_TOKEN,
      savePath,
    );

    const indexFile = Bun.file(`${savePath}/index.json`);
    expect(await indexFile.exists()).toBe(true);
    const expectedIndexContent = [
      "13-03-2023",
      "20-03-2023",
      "02-04-2023",
      "03-04-2023",
      "10-04-2023",
    ];
    const indexContent = JSON.parse(await indexFile.text());
    expect(indexContent).toEqual(expectedIndexContent);

    expect(await Bun.file(`${savePath}/10-04-2023.json`).exists()).toBe(true);
  });
});
