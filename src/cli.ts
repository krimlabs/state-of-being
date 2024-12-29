#!/usr/bin/env bun

import { program } from "commander";
import {
  setCurrentValueOfWorkoutKeyResult,
  createMonthlyWorkoutKeyResult,
  saveWorkoutStatsToVault,
} from "@src/workouts";
import {
  saveSleepStatsToVault,
  saveUltrahumanInsightsToVault,
} from "@src/sleep";
import { getCurrentYear, getCurrentMonth } from "@src/time";
import config from "@src/config";
import {
  saveMeditationAggregatesToVault,
  createMonthlyObservationsKeyResult,
  createMonthlyMeditationsKeyResult,
} from "@src/meditations";

program
  .command("set-current-value-of-workout-key-result")
  .option(
    "-y, --year <year>",
    "Year for the workout key result",
    getCurrentYear()
  )
  .option(
    "-m, --month <month>",
    "Month for the workout key result",
    getCurrentMonth()
  )
  .action(async (options) => {
    try {
      const { year, month } = options;
      const result = await setCurrentValueOfWorkoutKeyResult(year, month);
      console.log(result);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  });

program
  .command("create-monthly-workout-key-result")
  .option(
    "-y, --year <year>",
    "Year for the workout key result",
    getCurrentYear()
  )
  .option(
    "-m, --month <month>",
    "Month for the workout key result",
    getCurrentMonth()
  )
  .action(async (options) => {
    try {
      const { year, month } = options;
      const result = await createMonthlyWorkoutKeyResult(year, month);
      console.log(result);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  });

program
  .command("create-monthly-meditations-key-result")
  .option(
    "-y, --year <year>",
    "Year for the workout key result",
    getCurrentYear()
  )
  .option(
    "-m, --month <month>",
    "Month for the workout key result",
    getCurrentMonth()
  )
  .action(async (options) => {
    try {
      const { year, month } = options;
      const result = await createMonthlyMeditationsKeyResult(year, month);
      console.log(result);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  });

program
  .command("create-monthly-observations-key-result")
  .option(
    "-y, --year <year>",
    "Year for the workout key result",
    getCurrentYear()
  )
  .option(
    "-m, --month <month>",
    "Month for the workout key result",
    getCurrentMonth()
  )
  .action(async (options) => {
    try {
      const { year, month } = options;
      const result = await createMonthlyObservationsKeyResult(year, month);
      console.log(result);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  });

program.command("save-workout-stats-to-vault").action(async () => {
  try {
    const savePath = config.workoutStatsSavePath;
    const res = await saveWorkoutStatsToVault(savePath);
    console.log(res);
  } catch (error) {
    console.log(error);
  }
});

program.command("save-next-sleep-stats-to-vault").action(async () => {
  try {
    const folderPath = config.ultrahumanFolderPath;
    const res = await saveUltrahumanInsightsToVault(
      config.ULTRAHUMAN_R1_TOKEN,
      folderPath
    );
    console.log(res);
  } catch (error) {
    console.log(error);
  }
});

program.command("save-sleep-aggregate-stats-to-vault").action(async () => {
  try {
    const res = await saveSleepStatsToVault(
      config.ultrahumanFolderPath,
      config.ultrahumanSleepAggregatesSavePath
    );
    console.log(res);
  } catch (error) {
    console.log(error);
  }
});

// Aggregates are computed for month, but should be written daily so it stays updated
program
  .command("save-monthly-meditation-aggregates-to-vault")
  .option(
    "-y, --year <year>",
    "Year for which to compute aggregates",
    getCurrentYear()
  )
  .option(
    "-m, --month <month>",
    "Month for which to compute aggregates",
    getCurrentMonth()
  )
  .action(async (options: { year?: number; month?: number }) => {
    try {
      const { year, month } = options;
      const result = await saveMeditationAggregatesToVault(
        config.meditationAggregatesSavePath,
        config.NOTION_TOKEN,
        month,
        year
      );
      console.log(result);
    } catch (error) {
      console.log(error);
    }
  });

program.parse(process.argv);
