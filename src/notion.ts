import {
  Client,
  CreatePageParameters,
  GetPageParameters,
  GetPageResponse,
  PropertyValueMap,
  QueryDatabaseBodyParameters,
  QueryDatabaseResponse,
} from "@notionhq/client";
import config from "@src/config";
import { getLastDayOfMonth } from "@src/time";

enum Properties {
  WINDMILL_STATE = "Windmill State",
  STATUS = "Status",
}

enum Statuses {
  IN_PROGRESS = "In Progress",
  DONE = "Done",
}

enum Selects {
  KEY_RESULT = "Key Result",
  IN_PROGRESS = "In Progress",
  DONE = "Done",
}

enum WindmillStateContains {
  AUTO_MEDITATION = "AutoMeditationKeyResult",
  AUTO_WORKOUTS = "AutoWorkoutKeyResult",
  AUTO_OBSERVATIONS = "AutoObservationsKeyResult",
  HELLO_WORLD = "HelloWorld",
}

async function retrieveNotionPage(
  token: string,
  params: GetPageParameters,
): GetPageResponse {
  const notion = new Client({
    auth: token,
  });
  return await notion.pages.retrieve(params);
}

type PropertiesMap = {
  [key: string]: PropertyValueMap;
};

async function createNotionPage<T extends PropertiesMap>(
  token: string,
  databaseId: string,
  properties: T,
  emoji: string,
): Promise<void> {
  const notion = new Client({ auth: token });

  const pageProperties: CreatePageParameters = {
    parent: {
      database_id: databaseId,
    },
    properties: properties as PropertyValueMap,
    icon: {
      type: "emoji",
      emoji: emoji || "🤖",
    },
  };

  const response = await notion.pages.create(pageProperties);
  return response;
}

type UpdateOptions = {
  name?: string;
  icon?: { type: "emoji" | "external"; emoji?: string };
  cover?: { type: "external" | "page"; external?: { url: string } };
  properties?: PropertyValueMap;
};

async function updateNotionPage(
  token: string,
  pageId: string,
  updateOptions: UpdateOptions,
) {
  const notion = new Client({ auth: token });

  try {
    const res = await notion.pages.update({
      page_id: pageId,
      ...updateOptions,
    });

    return res;
  } catch (error) {
    console.error("Error updating Notion page:", error.body);
  }
}

async function queryNotionDb(
  token: string,
  queryParams: QueryDatabaseBodyParameters,
): QueryDatabaseResponse {
  const notion = new Client({
    auth: token,
  });

  return await notion.databases.query(queryParams);
}

async function* notionDbResultsGenerator(
  token: string,
  queryParams: QueryDatabaseBodyParameters,
) {
  let start_cursor = undefined;
  while (true) {
    const res: QueryDatabaseResponse = await queryNotionDb(token, {
      ...queryParams,
      start_cursor,
    });
    yield res;
    start_cursor = res?.next_cursor;
    if (!start_cursor) {
      break;
    }
  }
}

async function getObservationsForMonthAndYear(
  token: string,
  month: number,
  year: number,
  perPage = 100,
) {
  const observationsRes = await notionDbResultsGenerator(token, {
    database_id: config.notionDbIds.observations,
    page_size: perPage,
    filter: {
      and: [
        {
          property: "Date",
          date: {
            on_or_after: `${year}-${month}-01`,
            is_not_empty: true,
          },
        },
        {
          property: "Date",
          date: {
            is_not_empty: true,
            on_or_before: `${year}-${month}-${getLastDayOfMonth(year, month)}`,
          },
        },
      ],
    },
  });

  const observationPages = [];
  for await (const o of observationsRes) {
    observationPages.push(o);
  }

  const observations = observationPages
    .map((o) => o.results)
    .flat()
    .map((o) => ({
      ...o,
      month: o.properties["Date"].date?.start.split("-")[1],
    }));

  return observations;
}

async function getMeditationsForMonthAndYear(
  token: string,
  month: number,
  year: number,
  perPage = 100,
) {
  const res = await notionDbResultsGenerator(token, {
    database_id: config.notionDbIds.meditations,
    page_size: perPage,
    filter: {
      and: [
        {
          property: "Date",
          date: {
            on_or_after: `${year}-${month}-01`,
            is_not_empty: true,
          },
        },
        {
          property: "Date",
          date: {
            is_not_empty: true,
            on_or_before: `${year}-${month}-${getLastDayOfMonth(year, month)}`,
          },
        },
      ],
    },
  });

  const pages = [];
  for await (const o of res) {
    pages.push(o);
  }

  const list = pages
    .map((o) => o.results)
    .flat()
    .map((o) => ({
      ...o,
      month: o.properties["Date"].date?.start.split("-")[1],
    }));

  return list;
}

async function getNodeByWindmillState(token: string, searchTerm: string) {
  if (searchTerm.length === 0) {
    return { msg: "Empty search term not allowed" };
  }
  const nodeRes = await queryNotionDb(token, {
    database_id: config.notionDbIds.nodes,
    page_size: 1,
    filter: {
      and: [
        {
          property: Properties.WINDMILL_STATE,
          rich_text: {
            contains: searchTerm,
          },
        },
      ],
    },
  });

  return nodeRes;
}

// JS
function flattenList(arr: any[]): any[] {
  return arr.reduce((acc, currentItem) => {
    if (Array.isArray(currentItem)) {
      return acc.concat(flattenList(currentItem));
    }
    return acc.concat(currentItem);
  }, []);
}

function computeFrequencies(list: string[]): { [key: string]: number } {
  const frequencies: { [key: string]: number } = {};

  list.forEach((item) => {
    if (frequencies[item]) {
      frequencies[item] += 1;
    } else {
      frequencies[item] = 1;
    }
  });

  return frequencies;
}

// Validates if a string value exists within a given enum object.
function validateEnumString<T extends string>(
  enumObject: { [key: string]: T },
  value: string,
): T {
  if (Object.values(enumObject).includes(value as T)) {
    return value as T;
  } else {
    throw new Error(`Invalid ${typeof enumObject} value: ${value}`);
  }
}

export {
  computeFrequencies,
  createNotionPage,
  flattenList,
  getLastDayOfMonth,
  getMeditationsForMonthAndYear,
  getObservationsForMonthAndYear,
  notionDbResultsGenerator,
  Properties,
  queryNotionDb,
  retrieveNotionPage,
  Selects,
  Statuses,
  updateNotionPage,
  validateEnumString,
  WindmillStateContains,
  getNodeByWindmillState,
};
