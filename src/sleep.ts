import axios from "axios";
import path from "path";
import config from "@src/config";
import { addNDaysToDate, getCurrentYear, getCurrentMonth } from "@src/time";

type Insight = {
  title?: string;
  description?: string;
};
type IndexContributorTitle =
  | "Active Hours"
  | "HR Drop"
  | "HRV Form"
  | "Movement Index"
  | "Resting Heart Rate"
  | "Restfulness"
  | "Sleep Quotient"
  | "Steps"
  | "Temperature Deviation"
  | "Timing"
  | "Total Sleep"
  | "Workout Frequency";

type IndexContributor = {
  title: IndexContributorTitle;
  icon: string;
  description: string;
  weekly_average: {
    week_0: number;
    week_minus_1: number;
    week_minus_2: number;
  };
  insights: Insight[];
  average_trend: "up" | "down";
};

type IndexData = {
  value: number;
  trend: "up" | "down" | "constant";
};

type WeekData = {
  start: string;
  end: string;
};

type WeeklyAverage = {
  week_0: number;
  week_minus_1: number;
  week_minus_2: number;
};

type IndexTypes = "sleep_index" | "recovery_index" | "movement_index";

type UltrahumanInsightResponse = {
  data: {
    user_name: string;
    average_scores: Record<IndexTypes, IndexData>;
    selected_week: string;
    sleep_index: {
      title: string;
      description: string;
      weekly_average: WeeklyAverage;
      insights: Insight[];
      best_contributors: IndexContributor[];
      worst_contributors: IndexContributor[];
    };
    recovery_index: {
      title: string;
      description: string;
      weekly_average: WeeklyAverage;
      insights: Insight[];
      best_contributors: IndexContributor[];
      worst_contributors: IndexContributor[];
    };
    movement_index: {
      title: string;
      description: string;
      weekly_average: WeeklyAverage;
      insights: Insight[];
      best_contributors: IndexContributor[];
      worst_contributors: IndexContributor[];
    };
    weeks: {
      week_0: WeekData;
      week_minus_1: WeekData;
      week_minus_2: WeekData;
    };
  };
  error: string;
  status: string;
};

async function fetchInsights(
  token: string,
  weekStartDate: string,
): Promise<UltrahumanInsightResponse> {
  try {
    const response = await axios.get(config.ultrahumanApiBase, {
      params: {
        token,
        date: weekStartDate,
      },
      headers: {
        "Accept-Encoding": "gzip, deflate",
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function fetchLastSavedInIndex(savePath: string) {
  const insightsIndex = Bun.file(savePath + "/index.json");

  const indexExists = await insightsIndex.exists();

  if (!indexExists) {
    return "13-03-2023";
  }
  const index = await insightsIndex.json();

  return index[index.length - 1];
}

async function updateLastSavedIndex(
  savePath: string,
  lastSavedWeekDate: string,
) {
  const indexPath = `${savePath}/index.json`;
  const insightsIndex = Bun.file(indexPath);

  const indexExists = await insightsIndex.exists();
  let content;
  if (!indexExists) {
    content = ["13-03-2023"];
  } else {
    content = await insightsIndex.json();
  }

  const newContent = [...content, lastSavedWeekDate];
  await Bun.write(indexPath, JSON.stringify(newContent));

  return newContent;
}

async function saveUltrahumanInsightsToVault(token: string, savePath: string) {
  const lastSavedWeekStart = await fetchLastSavedInIndex(savePath);
  const nextWeekStart = addNDaysToDate(lastSavedWeekStart, 7);

  const insightsRaw = await fetchInsights(token, nextWeekStart);
  const insights = insightsRaw.data;
  const insightWeekStart = insights.weeks.week_0.start;

  if (lastSavedWeekStart === insightWeekStart) {
    return {
      msg: "Insights written already",
      lastSavedWeekStart,
      insightWeekStart,
    };
  } else {
    await updateLastSavedIndex(savePath, insightWeekStart);
    await Bun.write(
      `${savePath}/${insightWeekStart}.json`,
      JSON.stringify(insightsRaw),
    );
    return { msg: "Insights file written successfully", insightWeekStart };
  }
}

type SleepDataOnDisk = {
  fileName: string;
  ultrahumanDataOnDisk: UltrahumanInsightResponse;
};

async function readAllSleepDataFromDisk(
  folderPath: string,
): Promise<SleepDataOnDisk[]> {
  const indexFilePath = path.join(folderPath, "index.json");
  const indexDates: string[] = await Bun.file(indexFilePath).json();

  const combined = await Promise.all(
    indexDates.map(async (date: string) => {
      const fileName = `${date}.json`;
      const jsonFilePath = path.join(folderPath, fileName);
      const ultrahumanDataOnDisk: UltrahumanInsightResponse =
        await Bun.file(jsonFilePath).json();

      return { fileName, ultrahumanDataOnDisk };
    }),
  );

  return combined;
}

function groupAllDataByYearAndMonth(
  dataList: SleepDataOnDisk[],
): Record<string, Record<string, SleepDataOnDisk[]>> {
  return dataList.reduce(
    (groupedData, dataObj) => {
      // convert a file name like: 12-11-2023.json to [12, 11, 2023] and cut the .json part
      const [_day, month, year] = dataObj.fileName
        .slice(0, dataObj.fileName.indexOf("."))
        .split("-")
        .map(Number);

      return {
        ...groupedData,
        [year]: {
          ...(groupedData[year] || {}),
          [month]: [...(groupedData[year]?.[month] || []), dataObj],
        },
      };
    },
    {} as Record<string, Record<string, SleepDataOnDisk[]>>,
  );
}

function extractContributors(
  dataList: UltrahumanInsightResponse[],
): Record<IndexContributorTitle, IndexContributor[]> {
  const flattenedContributors = dataList
    .reduce((acc: IndexContributor[][], current: UltrahumanInsightResponse) => {
      const { sleep_index, movement_index, recovery_index } = current.data;

      return [
        ...acc,
        [
          ...(sleep_index?.best_contributors || []),
          ...(sleep_index?.worst_contributors || []),
          ...(movement_index?.best_contributors || []),
          ...(movement_index?.worst_contributors || []),
          ...(recovery_index?.best_contributors || []),
          ...(recovery_index?.worst_contributors || []),
        ],
      ];
    }, [])
    .flat();

  const groupedByTitle = flattenedContributors.reduce(
    (acc: Record<IndexContributorTitle, IndexContributor[]>, curr) => ({
      ...acc,
      [curr.title]: [...(acc[curr.title] || []), curr],
    }),
    {},
  );

  return groupedByTitle;
}

type MonthlySleepStats = {
  sleepIndex: number;
  recoveryIndex: number;
  movementIndex: number;
  sleepTrackerMissingInfo: boolean;
  contributorAverages: Record<IndexContributorTitle, number>;
};

function calculateMonthlySleepStats(
  dataList: UltrahumanInsightResponse[],
): MonthlySleepStats {
  const totalSleepIndex = dataList.reduce((acc, current) => {
    return acc + current.data.average_scores.sleep_index.value;
  }, 0);

  const totalMovementIndex = dataList.reduce((acc, current) => {
    return acc + current.data.average_scores.movement_index.value;
  }, 0);

  const totalRecoveryIndex = dataList.reduce((acc, current) => {
    return acc + current.data.average_scores.recovery_index.value;
  }, 0);

  const sleepIndex = totalSleepIndex / dataList.length;
  const recoveryIndex = totalRecoveryIndex / dataList.length;
  const movementIndex = totalMovementIndex / dataList.length;

  const contributors = extractContributors(dataList);

  const contributorAverages = Object.keys(contributors).reduce(
    (accOut, k: string) => {
      const monthlyData = contributors[k];

      const total = monthlyData.reduce(
        (acc: number, current: IndexContributor) => {
          return acc + current.weekly_average.week_0;
        },
        0,
      );
      return { ...accOut, [k]: total / monthlyData.length };
    },
    {},
  );

  return {
    sleepIndex,
    recoveryIndex,
    movementIndex,
    // missing info means I didn't wear the ring for some nights
    sleepTrackerMissingInfo:
      dataList.filter((item) => item.data.sleep_index === null).length > 0,
    contributorAverages,
  };
}

// Aggregate weekly data by year and month
async function aggregateWeeklyData(
  folderPath: string,
): Promise<Record<string, Record<string, MonthlySleepStats>>> {
  const sleepData = await readAllSleepDataFromDisk(folderPath);
  const grouped = groupAllDataByYearAndMonth(sleepData);
  const aggregated = Object.entries(grouped).reduce(
    (
      overallAverages,
      [year, monthDataRaw]: [string, Record<string, SleepDataOnDisk[]>],
    ) => {
      return {
        ...overallAverages,
        [year]: Object.entries(monthDataRaw).reduce(
          (acc, [month, monthGroupedList]: [string, SleepDataOnDisk[]]) => {
            return {
              ...acc,
              [month]: calculateMonthlySleepStats(
                monthGroupedList.map((m) => m.ultrahumanDataOnDisk),
              ),
            };
          },
          {},
        ),
      };
    },
    {},
  );

  // send the latest stats in a seperate key so website can render mindlessly
  const currentYear = getCurrentYear();
  const currentMonth = getCurrentMonth();
  const latest = aggregated[currentYear][currentMonth];

  return { ...aggregated, latest };
}

async function saveSleepStatsToVault(folderPath: string, savePath: string) {
  const stats = await aggregateWeeklyData(folderPath);

  try {
    // Convert stats to JSON format
    const statsJSON = JSON.stringify({ ...stats });

    // Write the stats data to the file using Bun.write
    await Bun.write(savePath, statsJSON);

    return {
      savePath,
      msg: "Sleep stats saved successfully",
    };
  } catch (err) {
    return {
      error: err,
      msg: "Error saving stats",
    };
  }
}

export {
  aggregateWeeklyData,
  saveSleepStatsToVault,
  fetchInsights,
  UltrahumanInsightResponse,
  IndexContributorTitle,
  fetchLastSavedInIndex,
  saveUltrahumanInsightsToVault,
  extractContributors,
  groupAllDataByYearAndMonth,
  readAllSleepDataFromDisk,
  IndexContributor,
};
