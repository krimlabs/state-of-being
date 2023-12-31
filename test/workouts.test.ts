import { expect, test, describe, it, beforeAll, afterAll } from "bun:test";
import { unlink } from "node:fs/promises";
import {
  fetchWorkoutSheetData,
  generateYearlyWorkoutAggregates,
  WorkoutSheetData,
  saveWorkoutStatsToVault,
} from "@src/workouts";

test("fetchSheetData", async () => {
  const result = await fetchWorkoutSheetData();
  const requiredKeys: Array<keyof WorkoutSheetData> = [
    "byYearMonth",
    "aggregates",
    "currentYear",
    "currentMonth",
    "latest",
    "weekdays",
    "weekdaysPassed",
  ];

  // Check if all keys are present
  requiredKeys.forEach((key) => {
    expect(result).toHaveProperty(key);
  });

  // Check if keys in countByYearMonth exist in aggregates
  const { byYearMonth, aggregates } = result;
  Object.keys(byYearMonth).forEach((year) => {
    expect(aggregates).toHaveProperty(year);
  });
});

test("generateYearlyWorkoutAggregates", () => {
  const byYearMonth = {
    "2023": {
      "5": {
        count: 16,
        target: 24,
        showUpRate: "67",
      },
      "6": {
        count: 19,
        target: 22,
        showUpRate: "86",
      },
      "7": {
        count: 16,
        target: 25,
        showUpRate: "64",
      },
      "8": {
        count: 17,
        target: 21,
        showUpRate: "81",
      },
      "9": {
        count: 7,
        target: 20,
        showUpRate: "35",
      },
      "10": {
        count: 7,
        target: 26,
        showUpRate: "27",
      },
      "11": {
        count: 5,
        target: 27,
        showUpRate: "19",
      },
      "12": {
        count: 6,
        target: 28,
        showUpRate: "21",
      },
    },
    "2024": {
      "1": {
        count: 12,
        target: 28,
        showUpRate: "43",
      },
      "2": {
        count: 14,
        target: 25,
        showUpRate: "56",
      },
      "3": {
        count: 18,
        target: 27,
        showUpRate: "67",
      },
      "4": {
        count: 22,
        target: 24,
        showUpRate: "92",
      },
      "5": {
        count: 25,
        target: 23,
        showUpRate: "109",
      },
      "6": {
        count: 28,
        target: 27,
        showUpRate: "104",
      },
      "7": {
        count: 30,
        target: 20,
        showUpRate: "150",
      },
      "8": {
        count: 19,
        target: 22,
        showUpRate: "86",
      },
      "9": {
        count: 26,
        target: 20,
        showUpRate: "130",
      },
      "10": {
        count: 20,
        target: 26,
        showUpRate: "77",
      },
      "11": {
        count: 18,
        target: 21,
        showUpRate: "86",
      },
      "12": {
        count: 15,
        target: 27,
        showUpRate: "56",
      },
    },
  };
  const aggregates2023 = generateYearlyWorkoutAggregates(byYearMonth["2023"]);
  const aggregates2024 = generateYearlyWorkoutAggregates(byYearMonth["2024"]);

  expect(aggregates2023).toEqual({
    totalWorkouts: 93,
    averageWorkoutsPerMonth: 11.63,
    monthWithMostWorkouts: "6",
    monthWithLeastWorkouts: "11",
  });

  expect(aggregates2024).toEqual({
    totalWorkouts: 247,
    averageWorkoutsPerMonth: 20.58,
    monthWithMostWorkouts: "7",
    monthWithLeastWorkouts: "1",
  });
});

describe("saveStatsToVault", () => {
  const savePath = "./vault/workouts.test.json";
  beforeAll(async () => {
    await Bun.write(savePath, "");
  });

  afterAll(async () => {
    await unlink(savePath);
  });

  it("should fetchSheetData and save to specified file", async () => {
    const res = await saveWorkoutStatsToVault(savePath);
    const data = await fetchWorkoutSheetData();
    const dataOnDisk = await Bun.file(savePath).json();

    expect(JSON.stringify(dataOnDisk)).toBe(JSON.stringify(data));
  });
});
