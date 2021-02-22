// @flow

type AnnouncementBase = {
  uuid: string, // unique id defining the announcement
  level?: string, // info, warning, alert ... set the article's global color palette.
  icon?: string, // info, warning ... select the article's icon among a list of presets
  priority?: number, // 1, 2, 3 ... optionally set the item as sticky. Sticky elements are ordered first by priority and then by publication date.
  contextual?: string[], // allow displaying the article in specific contextual parts of the app.
  published_at: string, // UTC date at which the content is displayed
  expired_at?: string, // optional UTC date at which the content is not available anymore.
  utm_campaign?: string, // optional UTM id for tracking purposes.
  languages?: string[], // optional language targeting.
  currencies?: string[], // optional per currency account ownership targeting.
};

export type AnnouncementContent = {
  title: string, // article title
  text: ?string, // article text
  link?: ?{
    // optional link to content
    href: string, // content URL
    label?: string, // optional link label
  },
};

export type RawAnnouncement = AnnouncementBase & {
  content: {
    [locale: string]: AnnouncementContent,
  },
};

export type Announcement = AnnouncementBase & {
  content: AnnouncementContent,
};

export type RawStatusSummary = {
  incidents: ?({
    created_at: string,
    id: string,
    impact: string,
    incident_updates: ?({
      body: string,
      created_at?: string,
      display_at?: string,
      id?: string,
      incident_id?: string,
      status?: string,
      updated_at?: string,
    }[]),
    monitoring_at: ?string,
    name: string,
    page_id: ?string,
    resolved_at: ?string,
    shortlink: ?string,
    status: string,
    updated_at: ?string,
  }[]),
};

export type StatusIncident = Announcement & {
  status?: string,
};

export type AnnoucementsUserSettings = {
  language: string,
  currencies: string[],
  getDate: () => Date,
};

export type AnnouncementsApi = {
  fetchAnnouncements: () => Promise<RawAnnouncement[]>,
};
