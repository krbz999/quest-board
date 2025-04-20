const days = [
  {
    name: "Ardere",
    abbreviation: "Ard",
    ordinal: 1,
  },
  {
    name: "Claudere",
    abbreviation: "Claud",
    ordinal: 2,
  },
  {
    name: "Canere",
    abbreviation: "Can",
    ordinal: 3,
  },
  {
    name: "Saltare",
    abbreviation: "Salt",
    ordinal: 4,
  },
  {
    name: "Congerere",
    abbreviation: "Conger",
    ordinal: 5,
  },
  {
    name: "Operiere",
    abbreviation: "Oper",
    ordinal: 6,
  },
  {
    name: "Glacies",
    abbreviation: "Glac",
    ordinal: 7,
    isRestDay: true,
  },
  {
    name: "Ventus",
    abbreviation: "Vent",
    ordinal: 8,
    isRestDay: true,
  },
  {
    name: "Lux",
    abbreviation: "Lux",
    ordinal: 9,
    isRestDay: true,
  },
];

const months = [
  {
    name: "Sationem's Rise",
    abbreviation: "Sationem1",
    ordinal: 1,
    days: 27,
  },
  {
    name: "Sationem",
    abbreviation: "Sationem2",
    ordinal: 2,
    days: 27,
  },
  {
    name: "Sationem's End",
    abbreviation: "Sationem3",
    ordinal: 3,
    days: 27,
  },
  {
    name: "Suntide's Rise",
    abbreviation: "Suntide1",
    ordinal: 4,
    days: 27,
  },
  {
    name: "Suntide",
    abbreviation: "Suntide2",
    ordinal: 5,
    days: 27,
  },
  {
    name: "Suntide's End",
    abbreviation: "Suntide3",
    ordinal: 6,
    days: 27,
  },
  {
    name: "Maturam's Rise",
    abbreviation: "Maturam1",
    ordinal: 7,
    days: 27,
  },
  {
    name: "Maturam",
    abbreviation: "Maturam2",
    ordinal: 8,
    days: 27,
  },
  {
    name: "Maturam's End",
    abbreviation: "Maturam3",
    ordinal: 9,
    days: 27,
  },
  {
    name: "Withertide's Rise",
    abbreviation: "Withertide1",
    ordinal: 10,
    days: 27,
  },
  {
    name: "Withertide",
    abbreviation: "Withertide2",
    ordinal: 11,
    days: 27,
  },
  {
    name: "Withertide's End",
    abbreviation: "Withertide3",
    ordinal: 12,
    days: 27,
  },
  {
    name: "Tenebrae",
    abbreviation: "Tenebrae",
    ordinal: 13,
    days: 1,
  },
];

const seasons = [
  {
    name: "Sationem",
    monthStart: 1,
    monthEnd: 3,
  },
  {
    name: "Suntide",
    monthStart: 4,
    monthEnd: 6,
  },
  {
    name: "Maturam",
    monthStart: 7,
    monthEnd: 9,
  },
  {
    name: "Withertide",
    monthStart: 10,
    monthEnd: 12,
  },
  {
    name: "Tenebrae",
    monthStart: 13,
    monthEnd: 13,
  },
];

export default {
  name: "New Age of Havilon",
  description: "Calendar of the new age of Havilon, after the rediscovery.",
  years: {
    yearZero: 0,
    firstWeekday: 0,
    leapYear: {
      leapStart: 0,
      leapInterval: 0,
    },
  },
  months: { values: months },
  days: {
    values: days,
    daysPerYear: months.reduce((acc, m) => acc + m.days, 0),
    hoursPerDay: 24,
    minutesPerHour: 60,
    secondsPerMinute: 60,
  },
  seasons: { values: seasons },
};
