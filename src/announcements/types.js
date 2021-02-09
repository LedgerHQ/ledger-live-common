// @flow

export type Announcement = {
  uuid: string, // unique id defining the announcement
  article: {
    level?: string, // info, warning, alert ... set the article's global color palette.
    icon?: string, // info, warning ... select the article's icon among a list of presets
    title: string, // article title
    text: string, // article text
    link?: {
      // optional link to content
      href: string, // content URL
      label?: string, // optional link label
    },
  },
  priority?: number, // 1, 2, 3 ... optionally set the item as sticky. Sticky elements are ordered first by priority and then by publication date.
  contextual?: string[], // allow displaying the article in specific contextual parts of the app.
  published_at: string, // UTC date at which the content is displayed
  expired_at?: string, // optional UTC date at which the content is not available anymore.
  utm_campaign?: string, // optional UTM id for tracking purposes.
  language?: string, // optional language targeting.
  currencies?: string[], // optional per currency account ownership targeting.
};

export type Annoucements = Announcement[];
