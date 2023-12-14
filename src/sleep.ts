import axios from "axios";
import config from "@src/config";
import { addNDaysToDate } from "@src/time";

async function fetchInsights(token: string, weekStartDate: string) {
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
    return error;
  }
}

async function fetchLastSavedInIndex(savePath: string) {
  const insightsIndex = Bun.file(savePath + "/index.json");

  const indexExists = await insightsIndex.exists();

  if (!indexExists) {
    return "13-03-2023";
  }
  const indexContent = await insightsIndex.text();

  const index = JSON.parse(indexContent);
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
    content = `["13-03-2023"]`;
  } else {
    content = await insightsIndex.text();
  }

  const parsedContent = JSON.parse(content);
  const newContent = [...parsedContent, lastSavedWeekDate];
  await Bun.write(indexPath, JSON.stringify(newContent));

  return newContent;
}

async function saveUltrahumanInsightsToVault(token: string, savePath: string) {
  const lastSavedWeekStart = await fetchLastSavedInIndex(savePath);
  const nextWeekStart = addNDaysToDate(lastSavedWeekStart, 7);

  const insights = await fetchInsights(token, nextWeekStart);
  const insightWeekStart = insights.data.weeks.week_0.start;

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

export { fetchInsights, fetchLastSavedInIndex, saveUltrahumanInsightsToVault };
