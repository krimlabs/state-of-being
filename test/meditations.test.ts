import {
  fetchDataAndComputeAggregates,
  saveMeditationAggregatesToVault,
} from "@src/meditations";
import { unlink } from "node:fs/promises";
import config from "@src/config";
import { expect, describe, it, beforeAll, afterAll, test } from "bun:test";

function isValidYearMonth(year: number, month: number) {
  // Create a date object with the given year and month (months are 0-based in JavaScript)
  const date = new Date(year, month - 1, 1);

  // Check if the date created is in the same year and month and is a valid date
  return date.getFullYear() === year && date.getMonth() === month - 1;
}

describe("fetchDataAndComputeAggregates", async () => {
  const aggregate = await fetchDataAndComputeAggregates(config.NOTION_TOKEN);

  it("has a valid year and month attached", () => {
    expect(isValidYearMonth(aggregate.year, aggregate.month)).toBe(true);
  });

  it("has correct stats object shape", () => {
    expect(aggregate.stats).toEqual(
      expect.objectContaining({
        numObservations: expect.any(Number),
        numMeditations: expect.any(Number),
        avgObservationsPerDay: expect.any(String),
        avgMeditationsPerDay: expect.any(String),
        medatationsMissedDaysCount: expect.any(Number),
        observationsMissedDayCount: expect.any(Number),
        satButCouldNotMeditateCount: expect.any(Number),
        waterBoiledMeditationsCount: expect.any(Number),
        mediationEfficiency: expect.any(String),
      }),
    );
  });
});

describe("saveAggregatesToVault", () => {
  const savePath = "./vault/meditations.test.json";

  afterAll(async () => {
    await unlink(savePath);
  });

  it("should create a file and save aggregates if file does not exist", async () => {
    await saveMeditationAggregatesToVault(
      savePath,
      config.NOTION_TOKEN,
      11,
      2023,
    );

    const dataOnDisk = await Bun.file(savePath).json();
    expect(dataOnDisk).toHaveProperty("2023.11");
  });

  it("should add to existing file if it already exists", async () => {
    await saveMeditationAggregatesToVault(
      savePath,
      config.NOTION_TOKEN,
      10,
      2023,
    );
    const dataOnDisk = await Bun.file(savePath).json();
    expect(dataOnDisk).toHaveProperty("2023.11");
    expect(dataOnDisk).toHaveProperty("2023.10");
  });
});
