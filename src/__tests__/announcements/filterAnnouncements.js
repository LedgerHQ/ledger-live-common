// @flow
import timemachine from "timemachine";
import {
  filterAnnouncements,
  localizeAnnouncements,
} from "../../announcements/logic";
import api from "../../announcements/api/api.mock";
timemachine.config({
  dateString: "February 22, 2021 13:12:59",
});

let rawAnnouncement;
let announcements;
describe("filterAnnouncements", () => {
  beforeEach(async () => {
    rawAnnouncement = await api.fetchAnnouncements();
  });

  afterAll(() => {
    timemachine.reset();
  });

  describe("language filters", () => {
    describe("with context.language = 'en'", () => {
      const context = {
        language: "en",
        currencies: ["bitcoin", "cosmos"],
        getDate: () => new Date(),
      };

      beforeEach(() => {
        announcements = localizeAnnouncements(rawAnnouncement, context);
      });
      it("should return all anouncements for english only and all the non-scoped one", async () => {
        const filtered = filterAnnouncements(announcements, context);

        expect(filtered).toStrictEqual(announcements);
      });
    });
    describe("with context.language = 'fr'", () => {
      const context = {
        language: "fr",
        currencies: ["bitcoin", "cosmos"],
        getDate: () => new Date(),
      };

      beforeEach(() => {
        announcements = localizeAnnouncements(rawAnnouncement, context);
      });

      it("should return all anouncements for french only and all the non-scoped one", async () => {
        const filtered = filterAnnouncements(announcements, context);
        const expected = [
          {
            uuid: "announcement-id-a",
            level: "info",
            icon: "warning",
            content: {
              title: "Incoming cosmos fork",
              text:
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc nibh felis, pom id...",
              link: {
                href: "https://ledger.com/there-is/an/incoming-cosmos-fork",
                label: "Click here for more information on upcoming fork",
              },
            },
            contextual: [],
            published_at: "2019-10-31T00:00:00.000Z",
            expired_at: "2021-03-06T00:00:00.000Z",
            utm_campaign: "promo_feb2021",
            currencies: ["cosmos"],
          },
          {
            uuid: "announcement-id-c",
            level: "warning",
            icon: "warning",
            content: {
              title: "Fork bitcoin en approche",
              text:
                "Lorem ipsum mais en français dolor sit amet, consectetur adipiscing elit. Nunc nibh felis, pom id...",
              link: {
                href: "https://ledger.com/there-is/an/fork-bitcoin-en-approche",
                label: "Clique ici pour en savoir plus sur le fork bitcoin ;)",
              },
            },
            priority: 1,
            contextual: ["send"],
            published_at: "2019-10-31T00:00:00.000Z",
            expired_at: "2021-05-06T00:00:00.000Z",
            currencies: ["bitcoin"],
          },
        ];

        expect(filtered).toStrictEqual(expected);
      });
    });
  });

  xdescribe("currencies filters", () => {
    describe("with context.currencies = ['bitcoin']", () => {
      const context = {
        language: "en",
        currencies: ["bitcoin"],
        getDate: () => new Date(),
      };
    });
    describe("with context.currencies = ['cosmos']", () => {
      const context = {
        language: "en",
        currencies: ["cosmos"],
        getDate: () => new Date(),
      };
    });
    describe("with context.currencies = ['bitcoin', 'cosmos']", () => {
      const context = {
        language: "en",
        currencies: ["bitcoin", "cosmos"],
        getDate: () => new Date(),
      };
    });
    describe("with context.currencies = []", () => {
      const context = {
        language: "en",
        currencies: [],
        getDate: () => new Date(),
      };
    });
  });

  xdescribe("published_at filters", () => {
    beforeEach(() => {
      timemachine.reset();
    });

    afterAll(() => {
      timemachine.config({
        dateString: "February 22, 2021 13:12:59",
      });
    });
  });

  xdescribe("expired_at filters", () => {
    beforeEach(() => {
      timemachine.reset();
    });

    afterAll(() => {
      timemachine.config({
        dateString: "February 22, 2021 13:12:59",
      });
    });
  });
});
