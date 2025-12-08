const express = require('express');
const router = express.Router();
const axios = require('axios');
const FeedParser = require('feedparser');

const RSS_FEEDS = {
  h5n1: 'https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US%3Aen&oc=11&q=%22h5n1%22%20AND%20(site:https://www.cidrap.umn.edu/avian-influenza-bird-flu%20OR%20site%3Afda.gov%20OR%20site%3Awww.who.int%20OR%20site%3Anews.un.org%20OR%20site%3Acdc.gov%20OR%20site%3Aceirr-network.org%20OR%20site%3Awww.nature.com%2Farticles%2F)%20AND%20when%3A1y',
  measles: 'https://news.google.com/rss/search?q=measles+(%22www.cdc.gov%22+OR+%22news.un.org%22+OR+%22www.who.int%22+OR+%22www.reuters.com%22+OR+%22cidrap.umn.edu%22)&hl=en-US&gl=US&ceid=US:en',
  mpox: 'https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US%3Aen&oc=11&q=(MPOX%20OR%20monkeypox%20OR%20MPXV)%20site:www.cdc.gov%20OR%20site:news.un.org%20OR%20site:www.who.int%20OR%20site:news.un.org/en',
};

/**
 * Google News RSS Router
 *
 * Server-side fetch + parse of whitelisted Google News RSS feeds
 *
 * Input (query params):
 *   feed  - required, one of: "h5n1", "measles", "mpox"
 *   count - optional, max 100 items to return (default 25)
 *
 * Output (JSON array):
 * [
 *   { title: "...", link: "...", pubDate: "2025-01-01T12:34:56.000Z" },
 *   ...
 * ]
 */
router.get('/news', async function (req, res) {
  const feedKey = req.query.feed;
  const rawCount = Number(req.query.count) || 25;
  const count = Math.max(1, Math.min(rawCount, 100));

  const url = RSS_FEEDS[feedKey];
  if (!url) {
    return res.status(400).json({message: 'Unknown or missing feed'});
  }

  let responded = false;
  const safeSend = (status, body) => {
    if (responded || res.headersSent) return;
    responded = true;
    res.status(status).json(body);
  };

  try {
    // Fetch RSS as a stream so we can pipe into feedparser
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 15000, // a bit more forgiving than 5s
    });

    const feedparser = new FeedParser();
    const items = [];

    response.data.on('error', (err) => {
      console.error(`Request stream error for feed "${feedKey}":`, err);
      safeSend(502, {message: 'Error fetching RSS feed'});
      // stop feedparser from continuing to process
      feedparser.destroy(err);
    });

    feedparser.on('error', (err) => {
      console.error(`FeedParser error for feed "${feedKey}":`, err);
      safeSend(502, {message: 'Error parsing RSS feed'});
    });

    feedparser.on('readable', function () {
      let item;
      while ((item = this.read())) {
        items.push(item);
      }
    });

    feedparser.on('end', () => {
      if (responded) return; // an error already went out

      try {
        const filtered = items
          .map(i => {
            const pubDateRaw = i.pubdate || i.date || null;
            const dateObj = pubDateRaw ? new Date(pubDateRaw) : null;
            const isValidDate = dateObj && !isNaN(dateObj.getTime());

            return {
              title: i.title,
              link: i.link,
              pubDate: isValidDate ? dateObj : null,
            };
          })
          .filter(i => i.pubDate && i.pubDate.getFullYear() >= 2023)
          .sort((a, b) => b.pubDate - a.pubDate)
          .slice(0, count)
          .map(i => ({
            title: i.title,
            link: i.link,
            pubDate: i.pubDate.toISOString(), // send as ISO string
          }));

        safeSend(200, filtered);
      } catch (e) {
        console.error('Post-processing error:', e);
        safeSend(500, {message: 'Error processing RSS items'});
      }
    });

    // Pipe axios stream -> feedparser
    response.data.pipe(feedparser);
  } catch (e) {
    console.error(`Top-level error for feed "${feedKey}":`, e);
    safeSend(502, {message: 'Error fetching RSS feed'});
  }
});

module.exports = router;
