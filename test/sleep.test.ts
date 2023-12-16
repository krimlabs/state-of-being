import {
  UltrahumanInsightResponse,
  fetchInsights,
  fetchLastSavedInIndex,
  saveUltrahumanInsightsToVault,
  aggregateWeeklyData,
  saveSleepStatsToVault,
} from "@src/sleep";
import { rm, unlink } from "node:fs/promises";
import { expect, describe, it, beforeAll, afterAll } from "bun:test";

import config from "@src/config";

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

describe("fetchInsights", () => {
  let res: UltrahumanInsightResponse;

  beforeAll(async () => {
    res = await fetchInsights(config.ULTRAHUMAN_R1_TOKEN, "13-03-2023");
  });

  it("should contain user_name property", () => {
    expect(res).toHaveProperty("user_name", "Shivek Khurana");
  });

  it("should contain week info", async () => {
    expect(res.weeks).toEqual({
      week_0: {
        start: "13-03-2023",
        end: "19-03-2023",
      },
      week_minus_1: {
        start: "06-03-2023",
        end: "12-03-2023",
      },
      week_minus_2: {
        start: "27-02-2023",
        end: "05-03-2023",
      },
    });
  });

  it("should have average_scores property", () => {
    expect(res).toHaveProperty("average_scores");

    const { average_scores } = res;
    expect(average_scores).toMatchObject({
      sleep_index: expect.objectContaining({
        value: expect.any(Number),
        trend: expect.stringMatching(/^(up|down)$/),
      }),
      recovery_index: expect.objectContaining({
        value: expect.any(Number),
        trend: expect.stringMatching(/^(up|down)$/),
      }),
      movement_index: expect.objectContaining({
        value: expect.any(Number),
        trend: expect.stringMatching(/^(up|down)$/),
      }),
    });
  });

  it("should have selected_week property", () => {
    expect(res).toHaveProperty("selected_week", "Mar 13 2023 - Mar 19 2023");
  });

  it("should have expected keys", () => {
    expect(Object.keys(res)).toEqual([
      "user_name",
      "average_scores",
      "selected_week",
      "sleep_index",
      "recovery_index",
      "movement_index",
      "weeks",
    ]);
  });
});

describe("fetchLastSavedInIndex", () => {
  it("should default to 13-03-2023 if index.json does not exist", async () => {
    const lastSaved = await fetchLastSavedInIndex("./non-existent-path");
    expect(lastSaved).toBe("13-03-2023");
  });

  it("should return the last saved date if index.json exists", async () => {
    const lastSaved = await fetchLastSavedInIndex(savePath);
    expect(lastSaved).toBe("02-04-2023");
  });
});

describe("saveUltrahumanInsightsToVault", () => {
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

describe("aggregateWeeklyData", () => {
  it("should give aggerates of weekly data by month", async () => {
    const aggregated = await aggregateWeeklyData("./vault/ultrahuman");
    const expectedResultStructure = new Map([
      [
        expect.stringMatching(/\d{4}/), // Matches any string in the format of a year (four digits)
        new Map([
          [
            expect.stringMatching(/\d{1,2}/), // Matches any string in the format of a month (one or two digits)
            {
              sleepIndex: expect.any(Number),
              recoveryIndex: expect.any(Number),
              movementIndex: expect.any(Number),
              sleepTrackerMissingInfo: expect.any(Boolean),
            },
          ],
        ]),
      ],
    ]);

    expect(aggregated).toMatchObject(expectedResultStructure);
  });
});

describe("saveSleepStatsToVault", () => {
  const folderPath = "./vault/ultrahuman";
  const savePath = "./vault/ultrahuman/sleep.test.json";
  beforeAll(async () => {
    await Bun.write(savePath, "");
  });

  afterAll(async () => {
    await unlink(savePath);
  });

  it("should fetchSheetData and save to specified file", async () => {
    await saveSleepStatsToVault(folderPath, savePath);
    const data = await aggregateWeeklyData(folderPath);
    const dataOnDisk = await Bun.file(savePath).json();

    expect(JSON.stringify(dataOnDisk)).toBe(JSON.stringify(data));
  });
});
