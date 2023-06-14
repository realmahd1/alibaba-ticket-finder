const cheerio = require('cheerio');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const puppeteer = require('puppeteer');
const locateChrome = require('locate-chrome');

const sentry = new Webhook('linkurl');

const extractTicketPart = (url) => {
  const regex = /\/([A-Z]{3}-[A-Z]{3})/;
  const match = url.match(regex);
  return match ? match[1] : '';
};

const getTransportationType = (url) => {
  if (url.includes('bus')) {
    return '🚌 Bus';
  } else if (url.includes('flights')) {
    return '✈️ Plane';
  } else if (url.includes('train')) {
    return '🚂 Train';
  } else {
    return 'Transportation';
  }
};

const getDepartingDate = (url) => {
  const regex = /departing=(\d{4}-\d{2}-\d{2})/;
  const match = url.match(regex);
  return match ? match[1] : 'Unknown';
};

const ticketFinder = async (urls) => {
  const executablePath = await locateChrome();
  const browser = await puppeteer.launch({ headless: true, executablePath });

  try {
    for (const url of urls) {
      const page = await browser.newPage();
      await page.goto(url);

      await page.waitForTimeout(5000);

      const html = await page.content();
      const $ = cheerio.load(html);
      let ticketText = 'انتخاب بلیط';
      let ignoreText = 'پرواز های تکمیل ظرفیت';
      if (url.includes('flights')) {
        ticketText = 'انتخاب پرواز';
        ignoreText = 'پرواز های تکمیل ظرفیت';
      }
      
      const disabledButtons = $('button.is-disabled:contains("انتخاب پرواز")');
      const disabledCount = disabledButtons.length;
      
      const ticketCount = html.split(ticketText).length - 1 - disabledCount;
      
      let availableCount = 0;
      if (ticketCount > 0) {
        const ticketsParent = $('#app > div.wrapper > main > div > div > section');
        const availableCards = ticketsParent.children().nextAll('.available-card');
        availableCount = availableCards.length;

        // Ignore 'انتخاب پرواز' after 'پرواز های تکمیل ظرفیت'
        let ignore = false;
        availableCards.each((index, element) => {
          const cardText = $(element).text();
          const h3Element = $(element).find('h3');
          const h3Text = h3Element.text().trim();
          if (h3Text === ignoreText) {
            ignore = true;
          }
          if (!ignore) {
            availableCount++;
          }
        });
      }

      if (ticketCount > 0) {
        const ticketPart = extractTicketPart(url);
        const departingDate = getDepartingDate(url);
        const title = `${getTransportationType(url)} Ticket Alert (${ticketPart}) - ${departingDate}`;

        const embed = new MessageBuilder()
          .setTitle(title)
          .setColor('#00b0f4')
          .addField('Ticket Count', `✉️ ${ticketCount}`)

        sentry.send(embed);
      } else if (ticketCount === 0) {
        const ticketPart = extractTicketPart(url);
        const departingDate = getDepartingDate(url);
        const title = `${getTransportationType(url)} Ticket Alert (${ticketPart}) - ${departingDate}`;

        const embed = new MessageBuilder()
          .setTitle(title)
          .setColor('#ff0000')
          .setDescription(`🔴 No tickets available for ${ticketPart}`);

        sentry.send(embed);
      }

      await page.close();
    }
  } catch (error) {
    console.error(error);
  } finally {
    await browser.close();
  }
};

// Example usage with multiple URLs
const urls = [
  'example1'
];

setInterval(() => {
  console.log('Running ticket finder...');
  ticketFinder(urls);
}, 10000);
