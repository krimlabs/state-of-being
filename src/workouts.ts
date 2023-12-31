import {
  GoogleSpreadsheet,
  GoogleSpreadsheetWorksheet,
} from "google-spreadsheet";
import config from "@src/config";
import {
  getCurrentMonth,
  getCurrentYear,
  getWeekdaysInMonth,
  getMonthName,
  getWeekdaysPassed,
  getLastDayOfMonth,
} from "@src/time";
import {
  getNodeByWindmillState,
  WindmillStateContains,
  updateNotionPage,
  createMonthlyKeyResultPage,
  Statuses,
} from "@src/notion";

async function getHeaderValues(
  sheet: GoogleSpreadsheetWorksheet,
): Promise<string[]> {
  await sheet.loadHeaderRow();
  return sheet.headerValues;
}

function startsWithCapitalMonth(str: string): boolean {
  const months =
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s/i;
  return months.test(str);
}

async function fetchSheetHeaderValues(sheetId: string, apiKey: string) {
  const doc = new GoogleSpreadsheet(sheetId, {
    apiKey,
  });

  await doc.loadInfo();

  const headerValues = await Promise.all(
    doc.sheetsByIndex.map(getHeaderValues),
  );

  const dates = headerValues
    .flat()
    .filter((dateString: string) => {
      const parsedDate = Date.parse(dateString);
      return !isNaN(parsedDate);
    })
    .filter(startsWithCapitalMonth)
    .reduce((acc: string[], current: string) => {
      // filter dupes if any
      if (!acc.includes(current)) {
        acc.push(current);
      }
      return acc;
    }, [])
    .map((dateString: string) => new Date(dateString));

  return dates;
}

type YearlyWorkoutAggregates = {
  totalWorkouts: number;
  averageWorkoutsPerMonth: number;
  monthWithMostWorkouts: string;
  monthWithLeastWorkouts: string;
};

function generateYearlyWorkoutAggregates(
  byMonth: Record<string, number>,
): YearlyWorkoutAggregates | null {
  if (!byMonth) {
    return null;
  }

  const months = Object.entries(byMonth);

  if (months.length === 0) {
    return null;
  }

  const totalWorkouts = parseFloat(
    months.reduce((acc, [, { count }]) => acc + count, 0).toFixed(2),
  );

  const averageWorkoutsPerMonth = parseFloat(
    (totalWorkouts / months.length).toFixed(2),
  );

  const [monthWithMostWorkouts] = months.reduce(
    (max, [month, { count }]) => (count > max[1] ? [month, count] : max),
    ["", 0],
  );

  const [monthWithLeastWorkouts] = months.reduce(
    (min, [month, { count }]) => (count < min[1] ? [month, count] : min),
    ["", Infinity],
  );
  return {
    totalWorkouts,
    averageWorkoutsPerMonth,
    monthWithMostWorkouts,
    monthWithLeastWorkouts,
  };
}

type MonthlyWorkoutData = {
  count: number;
  target: number;
  showUpRate: string;
};

type WorkoutSheetData = {
  byYearMonth: Record<string, Record<string, MonthlyWorkoutData>>;
  aggregates: YearlyWorkoutAggregates;
  currentYear: number;
  currentMonth: number;
  weekdays: number;
  weekdaysPassed: number;
  latest: MonthlyWorkoutData;
};

async function fetchWorkoutSheetData(): Promise<WorkoutSheetData> {
  const dates = await fetchSheetHeaderValues(
    config.workoutTrackerSheetId,
    config.GOOGLE_SHEETS_API_KEY,
  );

  const currentYear = getCurrentYear();
  const currentMonth = getCurrentMonth();
  const weekdays = getWeekdaysInMonth(currentYear, currentMonth);
  const weekdaysPassed = getWeekdaysPassed(currentYear, currentMonth);

  // Get counts for every month
  const countByYearMonth = dates.reduce<Record<number, Record<number, number>>>(
    (acc, date) => {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      if (!acc[year]) {
        acc[year] = {};
      }

      acc[year][month] = (acc[year][month] || 0) + 1;

      return acc;
    },
    {},
  );

  // Compute show up rates
  const byYearMonth = Object.entries(countByYearMonth).reduce(
    (acc, [year, months]) => {
      const updatedMonths = Object.entries(months).reduce(
        (innerAcc, [month, count]) => {
          const target = getWeekdaysInMonth(Number(year), Number(month));
          const showUpRate = ((count * 100) / weekdaysPassed).toFixed(0);

          innerAcc[month] = {
            target,
            count,
            showUpRate,
          };

          return innerAcc;
        },
        {} as {
          [month: string]: {
            target: number;
            count: number;
            showUpRate: string;
          };
        },
      );

      acc[year] = updatedMonths;
      return acc;
    },
    {},
  );

  const aggregates: YearlyWorkoutAggregates = Object.keys(byYearMonth).reduce(
    (acc, year: string) => {
      return {
        ...acc,
        [year]: generateYearlyWorkoutAggregates(byYearMonth[year]),
      };
    },
    {},
  );

  return {
    latest: byYearMonth[currentYear][currentMonth],
    weekdays,
    weekdaysPassed,
    currentYear,
    currentMonth,
    byYearMonth,
    aggregates,
  };
}

async function setCurrentValueOfWorkoutKeyResult(
  forYear?: number,
  forMonth?: number,
) {
  const year = forYear || getCurrentYear();
  const month = forMonth || getCurrentMonth();

  const searchTerm = `${WindmillStateContains.AUTO_WORKOUTS}-${month}-${year}`;
  const workoutKeyResult = await getNodeByWindmillState(
    config.NOTION_TOKEN,
    searchTerm,
  );

  if (workoutKeyResult.results.length > 0) {
    const id = workoutKeyResult.results[0].id;
    const sheetData = await fetchWorkoutSheetData();
    const newVal = sheetData.byYearMonth[year][month].count;

    try {
      await updateNotionPage(config.NOTION_TOKEN, id, {
        properties: {
          Current: {
            number: newVal,
          },
        },
      });
      return { msg: "Workout key result current value updated", newVal, id };
    } catch (error) {
      return {
        msg: "Unable to update workout key result current value",
        newVal,
        id,
      };
    }
  }

  return { msg: `Key Result for ${searchTerm} does not exist yet` };
}

async function createMonthlyWorkoutKeyResult(
  forYear?: number,
  forMonth?: number,
) {
  const year = forYear || getCurrentYear();
  const month = forMonth || getCurrentMonth();

  const weekdays = getWeekdaysInMonth(year, month);
  const monthName = getMonthName(month);
  const title = `Workout ${weekdays} times during ${monthName}, ${year} ⁂`;
  const emoji = "🐒";

  try {
    return await createMonthlyKeyResultPage(
      config.NOTION_TOKEN,
      title,
      weekdays,
      [config.anchorNodeIds.workoutFiveTimesAWeekObj],
      WindmillStateContains.AUTO_WORKOUTS,
      emoji,
      Statuses.IN_PROGRESS,
      year,
      month,
    );
  } catch (error) {
    return { msg: "Unable to create new page" };
  }
}

async function saveWorkoutStatsToVault(savePath: string) {
  const stats = await fetchWorkoutSheetData();

  try {
    // Convert stats to JSON format
    const statsJSON = JSON.stringify(stats);

    // Write the stats data to the file using Bun.write
    await Bun.write(savePath, statsJSON);

    return {
      savePath,
      msg: "Stats saved successfully",
    };
  } catch (err) {
    return {
      error: err,
      msg: "Error saving stats",
    };
  }
}

export {
  fetchWorkoutSheetData,
  generateYearlyWorkoutAggregates,
  WorkoutSheetData,
  YearlyWorkoutAggregates,
  setCurrentValueOfWorkoutKeyResult,
  createMonthlyWorkoutKeyResult,
  saveWorkoutStatsToVault,
};
