#!/usr/bin/env bun

import { program } from "commander";
import {
  setCurrentValueOfWorkoutKeyResult,
  createMonthlyWorkoutKeyResult,
  saveWorkoutStatsToVault,
} from "@src/workouts";
import { saveUltrahumanInsightsToVault } from "@src/sleep";
import { getCurrentYear, getCurrentMonth } from "@src/time";
import config from "@src/config";

program
  .command("set-current-value-of-workout-key-result")
  .option(
    "-y, --year <year>",
    "Year for the workout key result",
    getCurrentYear(),
  )
  .option(
    "-m, --month <month>",
    "Month for the workout key result",
    getCurrentMonth(),
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
    getCurrentYear(),
  )
  .option(
    "-m, --month <month>",
    "Month for the workout key result",
    getCurrentMonth(),
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

program.command("save-workout-stats-to-vault").action(async () => {
  try {
    const savePath = config.workoutsSavePath;
    const res = await saveWorkoutStatsToVault(savePath);
    console.log(res);
  } catch (error) {
    console.log(error);
  }
});

program.command("save-next-sleep-stats-to-vault").action(async () => {
  try {
    const savePath = config.ultrahumanSavePath;
    const res = await saveUltrahumanInsightsToVault(
      config.ULTRAHUMAN_R1_TOKEN,
      savePath,
    );
    console.log(res);
  } catch (error) {
    console.log(error);
  }
});

program.parse(process.argv);
