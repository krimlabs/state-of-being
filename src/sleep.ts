import axios from "axios";
import path from "path";
import config from "@src/config";
import { addNDaysToDate } from "@src/time";

type Insight = {
  title?: string;
  description?: string;
};
type IndexContributor = {
  title: string;
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
    return response.data.data;
  } catch (error) {
    return error;
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

  const insights = await fetchInsights(token, nextWeekStart);
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
      JSON.stringify(insights),
    );
    return { msg: "Insights file written successfully", insightWeekStart };
  }
}

type UltrahumanDataOnDisk = {
  data: UltrahumanInsightResponse;
  status: string;
  error?: string;
};

type SleepDataOnDisk = {
  fileName: string;
  ultrahumanDataOnDisk: UltrahumanDataOnDisk;
};

async function readAllSleepDataFromDisk(
  folderPath: string,
): Promise<SleepDataOnDisk[]> {
  const indexFilePath = path.join(folderPath, "index.json");
  const indexDates: string[] = await Bun.file(indexFilePath).json();

  const combined = await Promise.all(
    indexDates.map(async (date: string) => {
      const jsonFilePath = path.join(folderPath, `${date}.json`);
      const ultrahumanDataOnDisk: UltrahumanDataOnDisk =
        await Bun.file(jsonFilePath).json();

      return { fileName: date, ultrahumanDataOnDisk };
    }),
  );

  return combined;
}

function groupAllDataByYearAndMonth(
  dataList: SleepDataOnDisk[],
): Record<string, Record<string, SleepDataOnDisk[]>> {
  return dataList.reduce(
    (groupedData, dataObj) => {
      const [_day, month, year] = dataObj.fileName.split("-").map(Number);

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

type MonthlySleepStats = {
  sleepIndex: number;
  recoveryIndex: number;
  movementIndex: number;
  sleepTrackerMissingInfo: boolean;
};
function calculateMonthlySleepStats(
  dataList: UltrahumanInsightResponse[],
): MonthlySleepStats {
  const totalSleepIndex = dataList.reduce((acc, current) => {
    return acc + current.average_scores.sleep_index.value;
  }, 0);

  const totalMovementIndex = dataList.reduce((acc, current) => {
    return acc + current.average_scores.movement_index.value;
  }, 0);

  const totalRecoveryIndex = dataList.reduce((acc, current) => {
    return acc + current.average_scores.recovery_index.value;
  }, 0);

  const sleepIndex = totalSleepIndex / dataList.length;
  const recoveryIndex = totalRecoveryIndex / dataList.length;
  const movementIndex = totalMovementIndex / dataList.length;

  return {
    sleepIndex,
    recoveryIndex,
    movementIndex,
    // missing info means I didn't wear the ring for some nights
    sleepTrackerMissingInfo:
      dataList.filter((item) => item.sleep_index === null).length > 0,
  };
}

// Aggregate weekly data by year and month
async function aggregateWeeklyData(
  folderPath: string,
): Promise<Record<string, Record<string, MonthlySleepStats>>> {
  const sleepData = await readAllSleepDataFromDisk(folderPath);
  const grouped = groupAllDataByYearAndMonth(sleepData);
  return Object.entries(grouped).reduce(
    (
      overallAverages,
      [year, monthData]: [string, Record<string, SleepDataOnDisk[]>],
    ) => {
      return {
        ...overallAverages,
        [year]: Object.entries(monthData).reduce(
          (acc, [month, monthData]: [string, SleepDataOnDisk[]]) => {
            return {
              ...acc,
              [month]: calculateMonthlySleepStats(
                monthData.map((m) => m.ultrahumanDataOnDisk.data),
              ),
            };
          },
          {},
        ),
      };
    },
    {},
  );
}

async function saveSleepStatsToVault(folderPath: string, savePath: string) {
  const stats = await aggregateWeeklyData(folderPath);

  try {
    // Convert stats to JSON format
    const statsJSON = JSON.stringify(stats, null, 2);

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
  fetchLastSavedInIndex,
  saveUltrahumanInsightsToVault,
};
