import {
  UltrahumanInsightResponse,
  fetchInsights,
  fetchLastSavedInIndex,
  saveUltrahumanInsightsToVault,
  aggregateWeeklyData,
  readAllSleepDataFromDisk,
  extractContributors,
  groupAllDataByYearAndMonth,
  saveSleepStatsToVault,
  IndexContributor,
  IndexContributorTitle,
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

  it("should contain top level data, error and status", () => {
    expect(res).toHaveProperty("data");
    expect(res).toHaveProperty("error");
    expect(res).toHaveProperty("status");
  });

  it("should contain user_name property in res.data", () => {
    expect(res.data).toHaveProperty("user_name", "Shivek Khurana");
  });

  it("should contain week info in res.data", async () => {
    expect(res.data.weeks).toEqual({
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

  it("should have average_scores property in res.data", () => {
    expect(res.data).toHaveProperty("average_scores");

    const { average_scores } = res.data;
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

  it("should have selected_week property in res.data", () => {
    expect(res.data).toHaveProperty(
      "selected_week",
      "Mar 13 2023 - Mar 19 2023",
    );
  });

  it("should have expected keys in data k,v pair", () => {
    expect(Object.keys(res.data)).toEqual([
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

    const savedFile = Bun.file(`${savePath}/03-04-2023.json`);

    expect(await savedFile.exists()).toBe(true);

    const savedFileData = await savedFile.json();
    expect(savedFileData).toHaveProperty("data");
    expect(savedFileData).toHaveProperty("error");
    expect(savedFileData).toHaveProperty("status");
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

    const savedFile = Bun.file(`${savePath}/10-04-2023.json`);

    expect(await savedFile.exists()).toBe(true);

    const savedFileData = await savedFile.json();
    expect(savedFileData).toHaveProperty("data");
    expect(savedFileData).toHaveProperty("error");
    expect(savedFileData).toHaveProperty("status");
  });
});

describe("extractContributors", async () => {
  const sleepData = await readAllSleepDataFromDisk("./vault/ultrahuman");
  const grouped = groupAllDataByYearAndMonth(sleepData);

  const november2023DataList = grouped["2023"]["12"].map(
    (i) => i.ultrahumanDataOnDisk,
  );

  const extractedContributors = extractContributors(november2023DataList);

  it("should have extracted keys of type IndexContibutorTitle", () => {
    Object.keys(extractedContributors).map((k) => {
      expect([
        "Timing",
        "HR Drop",
        "Steps",
        "Active Hours",
        "HRV Form",
        "Temperature Deviation",
        "Restfulness",
        "Total Sleep",
        "Workout Frequency",
        "Sleep Quotient",
        "Movement Index",
        "Resting Heart Rate",
      ]).toContain(k as IndexContributorTitle);
    });
  });

  it("should have each contibutor key set to a list of IndexContibutor[]", () => {
    Object.keys(extractedContributors).map((k: string) => {
      const val: IndexContributor[] = extractedContributors[k];
      expect(Array.isArray(val)).toBe(true);

      val.map((i: IndexContributor) => {
        expect(i).toHaveProperty("title");
        expect(i).toHaveProperty("weekly_average");
      });
    });
  });
});

describe("aggregateWeeklyData", () => {
  it("should give aggerates of weekly data by month", async () => {
    const aggregated = await aggregateWeeklyData("./vault/ultrahuman");

    expect(aggregated).toHaveProperty("latest");
    expect(aggregated).toHaveProperty("2023.10");
    expect(aggregated).toHaveProperty("2023.11");
    expect(aggregated).toHaveProperty("2023.12");

    const december2023Res = aggregated["2023"]["12"];

    expect(december2023Res).toHaveProperty("sleepIndex");
    expect(december2023Res).toHaveProperty("recoveryIndex");
    expect(december2023Res).toHaveProperty("movementIndex");
    expect(december2023Res).toHaveProperty("sleepTrackerMissingInfo");
    expect(december2023Res).toHaveProperty("contributorAverages");

    const contri = december2023Res["contributorAverages"];
    expect(contri).toHaveProperty("HR Drop");
    expect(contri).toHaveProperty("Timing");
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
