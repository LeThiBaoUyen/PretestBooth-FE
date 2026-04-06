export const COHORTS = [17, 18, 19, 20, 21, 22, 23, 24, 25];

const CLASS_PREFIXES = ["DHKHMT", "DHKTPM", "KTPM"];
const CLASS_SUFFIXES = ["A", "B", "C"];

export function buildClassNamesByCohort(cohort: number) {
  const classes: string[] = [];

  for (const prefix of CLASS_PREFIXES) {
    for (const suffix of CLASS_SUFFIXES) {
      classes.push(`${prefix}${cohort}${suffix}`);
    }
  }

  return classes;
}
