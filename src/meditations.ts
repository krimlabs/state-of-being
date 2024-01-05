import {
  computeFrequencies,
  flattenList,
  getLastDayOfMonth,
  getMeditationsForMonthAndYear,
  getObservationsForMonthAndYear,
} from "@src/notion";

import {
  getCurrentDay,
  getCurrentMonth,
  getCurrentYear,
  getPreviousMonthAndYear,
  hasMonthPassed,
} from "@src/time";

import config from "@src/config";

type MissingDaysReturn = {
  count: number;
  missingDays: string[];
};

function countMissingDays(
  datesList: string[],
  year: number,
  month: number,
  numberOfDays: number,
): MissingDaysReturn {
  const missingDays = Array.from(
    { length: numberOfDays },
    (_, index) => index + 1,
  )
    .map((day) => {
      const formattedDay = day < 10 ? `0${day}` : `${day}`;
      const formattedMonth = month < 10 ? `0${month}` : `${month}`;
      return `${year}-${formattedMonth}-${formattedDay}`;
    })
    .filter(
      (currentDate) => !datesList.some((date) => date.startsWith(currentDate)),
    );

  return {
    count: missingDays.length,
    missingDays: missingDays,
  };
}

interface FrequencyDistributionMap {
  [key: string]: number;
}

function generateBarChartConfig(
  observedFrequency: FrequencyDistributionMap,
  meditatedFrequency: FrequencyDistributionMap,
  observedLabel: string,
  meditatedLabel: string,
): any {
  const labelsSet = new Set<string>([
    ...Object.keys(observedFrequency),
    ...Object.keys(meditatedFrequency),
  ]);
  const labels = Array.from(labelsSet);

  const observedData = labels.map((label) => observedFrequency[label] || 0);
  const meditatedData = labels.map((label) => meditatedFrequency[label] || 0);

  return {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: observedLabel,
          data: observedData,
          backgroundColor: "rgba(54, 162, 235, 0.5)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 0,
        },
        {
          label: meditatedLabel,
          data: meditatedData,
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 0,
        },
      ],
    },
    options: {
      rectangleRadius: 16,
      legend: {
        labels: {
          fontColor: "#333",
        },
      },
      scales: {
        xAxes: [
          {
            ticks: {
              fontColor: "#333",
            },
          },
        ],
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
              fontColor: "#333",
            },
            gridLines: {
              color: "#eee",
            },
          },
        ],
      },
      plugins: {},
    },
  };
}

function generateChartURL(jsonData: object): string {
  const baseURL = "https://image-charts.com/chart.js/2.8.0";
  const queryParams = {
    bkg: "white",
    c: JSON.stringify(jsonData),
    encoding: "url",
    height: 480,
    width: 1200,
  };

  const queryString = Object.entries(queryParams)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");

  return `${baseURL}?${queryString}`;
}

type Stats = {
  numMeditations: number;
  numObservations: number;
  meditationEfficiency: string;
  avgMeditationsPerDay: string;
  avgObservationsPerDay: string;
  meditationsMissedDaysCount: number;
  observationsMissedDayCount: number;
  waterBoiledMeditationsCount: number;
  satButCouldNotMeditateCount: number;
  showUpRate: string;
};

function generateWhatsAppMessage(
  stats: Stats,
  causesChartUrl: string,
  egosBarChartUrl: string,
): string {
  const {
    numMeditations,
    numObservations,
    meditationEfficiency,
    avgMeditationsPerDay,
    avgObservationsPerDay,
    meditationsMissedDaysCount,
    observationsMissedDayCount,
    waterBoiledMeditationsCount,
    satButCouldNotMeditateCount,
  } = stats;

  const message = `
🧘‍♂️ *Meditation Stats*
----------------------
💭 *Total Meditations*: ${numMeditations}
👀 *Total Observations*: ${numObservations}
📈 *Meditation Efficiency*: ${meditationEfficiency}
🌅 *Avg. Meditations per Day*: ${avgMeditationsPerDay}
📅 *Avg. Observations per Day*: ${avgObservationsPerDay}
🚫 *Missed Meditation Days*: ${meditationsMissedDaysCount}
🚷 *Missed Observation Days*: ${observationsMissedDayCount}
😞 *Sat But Could Not Meditate Days*: ${satButCouldNotMeditateCount}
💧 *Water Boiled During Meditations*: ${waterBoiledMeditationsCount}
\n
📊 *Causes Chart*: ${causesChartUrl}\n
📊 *Egos Bar Chart*: ${egosBarChartUrl}\n
`;

  return message;
}

type MeditationAggregate = {
  month: number;
  year: number;
  stats: Stats;
  egosObservedFrequencyDistribution: Record<string, number>;
  egosInMeditationFrequencyDistribution: Record<string, number>;
  underlyingCausesObservedFrequencyDistribution: Record<string, number>;
  underlyingCausesMeditatedOnFrequencyDistribution: Record<string, number>;
};

async function fetchDataAndComputeAggregates(
  token: string,
  forMonth?: number,
  forYear?: number,
): Promise<MeditationAggregate> {
  const currentMonth = getCurrentMonth();
  const currentYear = getCurrentYear();
  const month = forMonth || currentMonth;
  const year = forYear || currentYear;
  const totalDaysInThisMonth = hasMonthPassed(year, month)
    ? getLastDayOfMonth(year, month)
    : getCurrentDay();

  // Fetch base observations and meditations

  const observations = await getObservationsForMonthAndYear(token, month, year);
  const meditations = await getMeditationsForMonthAndYear(token, month, year);

  const satButCouldNotMeditateCount = meditations.filter(
    (m) => m.properties["Didn't work at all?"].checkbox,
  ).length;

  // Find out all dates I missed observing of meditating
  const observationDates = observations.map(
    (o) => o.properties["Date"].date.start,
  );
  const meditationDates = meditations.map(
    (o) => o.properties["Date"].date.start,
  );

  const observationsMissingDays = countMissingDays(
    observationDates,
    year,
    month,
    totalDaysInThisMonth,
  );

  const meditationMissingDays = countMissingDays(
    meditationDates,
    year,
    month,
    totalDaysInThisMonth,
  );

  // Find the most observed and meditated upon egos
  const egosObserved = flattenList(
    observations.map((o) => o.properties.Egos.multi_select?.map((m) => m.name)),
  );

  const egosObservedFrequencyDistribution = computeFrequencies(egosObserved);

  const egosMeditatedOn = flattenList(
    meditations.map((o) => o.properties.Egos.multi_select?.map((m) => m.name)),
  );

  const egosInMeditationFrequencyDistribution =
    computeFrequencies(egosMeditatedOn);

  // Find out most observed underlying causes and most meditated upon underlying causes
  const underlyingCausesObserved = flattenList(
    observations.map(
      (o) => o.properties["Underlying cause"].multi_select?.map((m) => m.name),
    ),
  );

  const underlyingCausesObservedFrequencyDistribution = computeFrequencies(
    underlyingCausesObserved,
  );

  const underlyingCausesMeditatedOn = flattenList(
    meditations.map((m) =>
      (
        m.properties["Observation underlying causes"].formula["string"] || ""
      ).split(","),
    ),
  ).flat();

  const underlyingCausesMeditatedOnFrequencyDistribution = computeFrequencies(
    underlyingCausesMeditatedOn.filter(
      (uc: string) => uc !== "" && uc !== null,
    ),
  );

  // Compute number of water boiled meditations
  const waterBoiledMeditationsCount = meditations.filter(
    (m) => m.properties["Water boiled ?"].checkbox,
  ).length;

  // Compute stats to send out
  const stats = {
    numObservations: observations.length,
    numMeditations: meditations.length,
    avgObservationsPerDay: (observations.length / totalDaysInThisMonth).toFixed(
      2,
    ),
    avgMeditationsPerDay: (meditations.length / totalDaysInThisMonth).toFixed(
      2,
    ),
    meditationsMissedDaysCount: meditationMissingDays.count,
    observationsMissedDayCount: observationsMissingDays.count,
    satButCouldNotMeditateCount,
    waterBoiledMeditationsCount,
    meditationEfficiency: (
      (waterBoiledMeditationsCount * 100) /
      meditations.length
    ).toFixed(2),
    target: getLastDayOfMonth(currentYear, currentMonth),
    showUpRate: (
      ((totalDaysInThisMonth - meditationMissingDays.count) * 100) /
      totalDaysInThisMonth
    ).toFixed(0),
  };

  // Compute config for bar charts
  const egosBarChartConfig = generateBarChartConfig(
    egosObservedFrequencyDistribution,
    egosInMeditationFrequencyDistribution,
    "Observed egos",
    "Meditated on egos",
  );

  const causesBarChartConfig = generateBarChartConfig(
    underlyingCausesObservedFrequencyDistribution,
    underlyingCausesMeditatedOnFrequencyDistribution,
    "Observed egos",
    "Meditated on egos",
  );

  const egosBarChartUrl = generateChartURL(egosBarChartConfig);
  const causesChartUrl = generateChartURL(causesBarChartConfig);
  const totalPackage = {
    month,
    year,
    stats,
    // observations,
    // meditations,
    // meditationObservations,
    egosObservedFrequencyDistribution,
    egosInMeditationFrequencyDistribution,
    underlyingCausesObservedFrequencyDistribution,
    underlyingCausesMeditatedOnFrequencyDistribution,
    // egosBarChartUrl,
    // causesChartUrl,
    // whatsappMessage: generateWhatsAppMessage(
    //   stats,
    //   egosBarChartUrl,
    //   causesChartUrl,
    // ),
  };
  return totalPackage;
}

async function saveMeditationAggregatesToVault(
  savePath: string,
  token: string,
  forMonth?: number,
  forYear?: number,
) {
  const aggregates = await fetchDataAndComputeAggregates(
    token,
    forMonth,
    forYear,
  );

  const currentMonth = getCurrentMonth();
  const currentYear = getCurrentYear();
  const currentDay = getCurrentDay();

  try {
    const aggregatesFile = await Bun.file(savePath);

    const existingAggregates = (await aggregatesFile.exists())
      ? await Bun.file(savePath).json()
      : {};

    // Add newly fetched aggregates to existing aggregates on disk
    const updatedAggregates = {
      ...existingAggregates,
      [aggregates.year]: {
        ...(existingAggregates[aggregates.year] || {}),
        [aggregates.month]: aggregates,
      },
    };

    // compute dashboard info here so UI does not need to mangle with time
    const haveDataForThisMonth =
      updatedAggregates.hasOwnProperty(currentYear) &&
      updatedAggregates[currentYear].hasOwnProperty(currentMonth);

    const latestForDashboard = haveDataForThisMonth
      ? {
          ...updatedAggregates[currentYear][currentMonth],
          ...{
            currentDay,
            currentYear,
            currentMonth,
            daysInCurrentMonth: getLastDayOfMonth(currentYear, currentMonth),
            targetObservationsPerDay: config.targetObservationsPerDay,
          },
        }
      : (() => {
          // If stats for this month don't exist, write previous month stats as latest for dash
          const { prevYear, prevMonth } = getPreviousMonthAndYear(
            currentMonth,
            currentYear,
          );
          const daysInLastMonth = getLastDayOfMonth(prevYear, prevMonth);
          return {
            ...updatedAggregates[prevYear][prevMonth],
            ...{
              currentDay: daysInLastMonth,
              currentYear: prevYear,
              currentMonth: prevMonth,
              daysInCurrentMonth: daysInLastMonth,
              targetObservationsPerDay: config.targetObservationsPerDay,
            },
          };
        })();

    // Write the stats data to the file using Bun.write
    await Bun.write(
      savePath,
      JSON.stringify({ ...updatedAggregates, latestForDashboard }),
    );

    return {
      savePath,
      forYear,
      forMonth,
      msg: "Meditation aggregates saved successfully",
    };
  } catch (err) {
    return {
      forYear,
      forMonth,
      error: err,
      msg: "Error saving stats",
    };
  }
}

export {
  fetchDataAndComputeAggregates,
  MeditationAggregate,
  saveMeditationAggregatesToVault,
};
