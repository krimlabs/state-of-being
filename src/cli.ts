#!/usr/bin/env bun

import { program } from "commander";
import {
  setCurrentValueOfWorkoutKeyResult,
  createMonthlyWorkoutKeyResult,
  saveWorkoutStatsToVault,
} from "@src/workouts";
import { getCurrentYear, getCurrentMonth } from "@src/time";

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
    const savePath = "./vault/workouts.json";
    const res = await saveWorkoutStatsToVault(savePath);
    console.log(res);
  } catch (error) {
    console.log(error);
  }
});

program.parse(process.argv);
