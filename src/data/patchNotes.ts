export interface PatchNote {
  version: string;
  title: string;
  date?: string;
  bullets: string[];
}

/** Newest first. The first entry is treated as the current app version. */
export const PATCH_NOTES: PatchNote[] = [
  {
    version: 'v0.8.0',
    title: 'Sprinkler Planner',
    bullets: [
      'Added Sprinkler, Quality Sprinkler, and Iridium Sprinkler planning.',
      'Added material progress cards for what you have and what is still needed.',
      'Added buy-cost checks for Clint materials and Krobus Iridium Sprinklers.',
      'Cleaned up the Sprinklers page to reduce clutter.',
    ],
  },
  {
    version: 'v0.7.1',
    title: 'Planner Limits & Layout',
    bullets: [
      'Added a 4-season default time cap to processing calculations. If keg/cask queues would stretch beyond that, the planner now assumes you sell raw instead of extrapolating forever.',
      'Extended the crop calendar to display long processing schedules across seasons.',
      'On large screens, the Plan your season and Seed sources cards now sit side by side.',
    ],
  },
  {
    version: 'v0.7.0',
    title: 'Artisan Processing',
    bullets: [
      'Choose to sell crops raw, ferment them in kegs, or age the keg products in casks.',
      'Limit kegs and casks if you only have a few; the planner queues each batch and shows the final collection date.',
      'Tiller and Artisan profession toggles apply the right bonuses to raw vs. processed.',
      'Crop calendars now mark keg and cask work alongside planting, watering, and harvests.',
    ],
  },
  {
    version: 'v0.6.0',
    title: 'My Farm',
    bullets: [
      'Track specific crop plans on a personal farm panel.',
      'Set a current day and watch upcoming harvests countdown.',
      'Per-crop mini calendar shows planted day, harvests, and today.',
    ],
  },
  {
    version: 'v0.5.0',
    title: 'Visual Polish',
    bullets: [
      'Added light and dark themes.',
      'Gave the app a more consistent pixel-art icon style across crops, tools, and pages.',
    ],
  },
  {
    version: 'v0.4.0',
    title: 'Fertilizer Update',
    bullets: [
      'Added fertilizer selection to the crop planner.',
      'Added farming level and expected quality-based profit.',
      'Added fertilizer amount limits, so plans can split fertilized and unfertilized crops.',
      'Added the Fertilizer Workshop to compare buying vs crafting.',
    ],
  },
  {
    version: 'v0.3.0',
    title: 'Crop Calendar',
    bullets: [
      'Added clickable crop cards.',
      'Added a Stardew-style calendar showing planting, watering, and harvest days.',
      'Improved regrowing crop labels so later harvests are easier to understand.',
    ],
  },
  {
    version: 'v0.2.0',
    title: 'Better Recommendations',
    bullets: [
      'Simplified results to one goal: highest net profit.',
      'Redesigned crop cards to make profit, final gold, and harvest timing easier to read.',
      'Cleaned up seed source filters and crop notes.',
    ],
  },
  {
    version: 'v0.1.0',
    title: 'Crop Planner',
    bullets: [
      'Added the first interactive crop planner.',
      'Added season, day, gold, quality, and seed source controls.',
      'Added crop recommendations with harvest dates, profit, and final gold.',
    ],
  },
];

export const CURRENT_VERSION = PATCH_NOTES[0].version;
