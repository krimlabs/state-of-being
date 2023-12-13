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

export {
  getCurrentDate,
  getCurrentMonth,
  getCurrentDay,
  getCurrentYear,
  getWeekdaysInMonth,
  getMonthName,
  hasMonthPassed,
  getLastDayOfMonth,
};
