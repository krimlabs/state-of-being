function getCurrentDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0"); // Adding 1 because months are zero-based
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentYear(): number {
  return parseInt(getCurrentDate().split("-")[0]);
}

function getCurrentMonth(): number {
  return parseInt(getCurrentDate().split("-")[1]);
}

function getCurrentDay(): number {
  return parseInt(getCurrentDate().split("-")[2]);
}

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function hasMonthPassed(year: number, month: number): boolean {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // Adding 1 because months are zero-based

  if (year < currentYear) {
    return true; // Year has passed
  } else if (year === currentYear && month < currentMonth) {
    return true; // Year is current, but month has passed
  } else {
    return false; // Year is in the future or month is current/future
  }
}

function getMonthName(monthNumber: number): string {
  const months: string[] = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  if (monthNumber >= 1 && monthNumber <= 12) {
    return months[monthNumber - 1];
  } else {
    return "Invalid month number";
  }
}

function getWeekdaysInMonth(year: number, month: number): number {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  const daysArray = Array.from(
    {
      length: lastDay.getDate() - firstDay.getDate() + 1,
    },
    (_, index) => new Date(year, month - 1, firstDay.getDate() + index),
  );

  return daysArray.filter((day) => day.getDay() !== 0 && day.getDay() !== 6)
    .length;
}

function addNDaysToDate(dateString: string, n: number): string {
  const [day, month, year] = dateString.split("-").map(Number);
  const currentDate = new Date(year, month - 1, day); // Creating a Date object (months are zero-based)

  currentDate.setDate(currentDate.getDate() + n); // Adding 'n' days to the current date

  const updatedDay = currentDate.getDate();
  const updatedMonth = currentDate.getMonth() + 1; // Adding 1 as months are zero-based
  const updatedYear = currentDate.getFullYear();

  const formattedDate = `${updatedDay
    .toString()
    .padStart(2, "0")}-${updatedMonth
    .toString()
    .padStart(2, "0")}-${updatedYear}`;

  return formattedDate;
}

function getWeekdaysPassed(year: number, month: number): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // Months are zero-indexed

  // Check if the provided year and month have passed or not
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    const startDate = new Date(year, month - 1, 1); // Month is zero-indexed
    const endDate = new Date(year, month, 0); // Get the last day of the provided month

    const daysArray = Array.from(
      { length: endDate.getDate() - startDate.getDate() + 1 },
      (_, i) =>
        new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate() + i,
        ),
    );

    const weekdays = daysArray.filter(
      (date) => date.getDay() !== 0 && date.getDay() !== 6,
    );
    return weekdays.length;
  } else if (year === currentYear && month === currentMonth) {
    const startDate = new Date(year, month - 1, 1); // Month is zero-indexed
    const endDate = now;

    const daysArray = Array.from(
      { length: endDate.getDate() - startDate.getDate() + 1 },
      (_, i) =>
        new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate() + i,
        ),
    );

    const weekdays = daysArray.filter(
      (date) => date.getDay() !== 0 && date.getDay() !== 6,
    );
    return weekdays.length;
  } else {
    return 0; // Month has not passed yet
  }
}

function getPreviousMonthAndYear(
  month: number,
  year: number,
): { prevMonth: number; prevYear: number } {
  if (month === 1) {
    return { prevMonth: 12, prevYear: year - 1 };
  } else {
    return { prevMonth: month - 1, prevYear: year };
  }
}

export {
  addNDaysToDate,
  getCurrentDate,
  getCurrentMonth,
  getCurrentDay,
  getCurrentYear,
  getWeekdaysInMonth,
  getMonthName,
  hasMonthPassed,
  getLastDayOfMonth,
  getWeekdaysPassed,
  getPreviousMonthAndYear,
};
