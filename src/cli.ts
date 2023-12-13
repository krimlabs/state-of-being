#!/usr/bin/env bun

import { program } from "commander";
import { setCurrentValueOfWorkoutKeyResult } from "@src/workouts";
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

program.parse(process.argv);
