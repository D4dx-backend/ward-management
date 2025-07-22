// Week calculation utilities
export function getCurrentWeek() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

export function getWeekOptions() {
  const currentWeek = getCurrentWeek();
  const currentYear = new Date().getFullYear();
  
  return {
    currentWeek: {
      label: 'Current Week',
      value: `${currentWeek}-${currentYear}`,
      weekNumber: currentWeek,
      year: currentYear
    },
    previousWeek: {
      label: 'Previous Week',
      value: `${currentWeek - 1}-${currentYear}`,
      weekNumber: currentWeek - 1,
      year: currentYear
    },
    nextWeek: {
      label: 'Next Week',
      value: `${currentWeek + 1}-${currentYear}`,
      weekNumber: currentWeek + 1,
      year: currentYear
    },
    ongoingWeek: {
      label: 'Ongoing Week',
      value: `${currentWeek}-${currentYear}`,
      weekNumber: currentWeek,
      year: currentYear
    }
  };
}

export function getWeekRange(weekNumber, year) {
  const startOfYear = new Date(year, 0, 1);
  const startOfWeek = new Date(startOfYear);
  startOfWeek.setDate(startOfYear.getDate() + (weekNumber - 1) * 7 - startOfYear.getDay());
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  return {
    start: startOfWeek,
    end: endOfWeek
  };
}

export function formatWeekPeriod(weekNumber, year) {
  const { start, end } = getWeekRange(weekNumber, year);
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
}