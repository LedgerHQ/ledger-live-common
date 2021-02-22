// @flow
import type {
  RawAnnouncement,
  Announcement,
  AnnoucementsUserSettings,
} from "./types";
import { startOfDayTime } from "./helpers";

export function localizeAnnouncements(
  rawAnnouncements: RawAnnouncement[],
  context: AnnoucementsUserSettings
): Announcement[] {
  return rawAnnouncements.map((rawAnnouncement: RawAnnouncement) => ({
    ...rawAnnouncement,
    content:
      rawAnnouncement.content[context.language] ||
      rawAnnouncement.content["en"],
  }));
}

export function filterAnnouncements(
  announcements: Announcement[],
  context: AnnoucementsUserSettings
): Announcement[] {
  const { language, currencies, getDate } = context;

  const date = getDate();

  return announcements.filter((announcement) => {
    if (announcement.languages && !announcement.languages.includes(language)) {
      return false;
    }

    if (
      announcement.currencies &&
      !announcement.currencies.some((c) => currencies.includes(c))
    ) {
      return false;
    }

    const publishedAt = new Date(announcement.published_at);
    if (publishedAt > date) {
      return false;
    }

    if (announcement.expired_at && new Date(announcement.expired_at) < date) {
      return false;
    }

    return true;
  });
}

export const groupAnnouncements = (cache: {
  [key: string]: Announcement,
}): { day: ?Date, data: Announcement[] }[] => {
  // first group by published_at or if theres a priority set
  const announcementsByDayOrPriority: {
    [key: string]: Announcement[],
  } = Object.keys(cache).reduce((sum, uuid: string) => {
    const announcement = cache[uuid];

    // group by publication date or if priority set in a group 0
    const k = isNaN(announcement.priority)
      ? startOfDayTime(announcement.published_at)
      : 0;

    return {
      ...sum,
      [`${k}`]: [...(sum[k] || []), announcement],
    };
  }, {});

  // map over the keyed groups and sort them by priority and date
  return Object.keys(announcementsByDayOrPriority)
    .filter(
      (key) =>
        announcementsByDayOrPriority[key] &&
        announcementsByDayOrPriority[key].length > 0 // filter out potential empty groups
    )
    .map((key) => Number(key)) // map every string to a number for sort evaluation
    .sort((a, b) => {
      const aa = a === 0 ? Infinity : a; // sort out by timestamp key while keeping priority set announcements on top
      const bb = b === 0 ? Infinity : b; // this can work because a and b cannot be equal to 0 at same time
      return bb - aa;
    })
    .map((date) => ({
      day: date === 0 ? null : new Date(date), // format Day if available
      data: announcementsByDayOrPriority[`${date}`].sort(
        (a, b) => (a.priority || 0) - (b.priority || 0)
      ), // resort data by priority if it is set
    }));
};
