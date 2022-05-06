const cheerio = require('cheerio');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const puppeteer = require('puppeteer');
const sentry = new Webhook(process.env.DISCORD_WEBHOOK_URL);

const ticketFinder = async () => {
    const browser = await puppeteer.launch({
        headless: true, executablePath: process.env.CHROME_PATH
    });
    const page = await browser.newPage();
    await page.goto(process.env.ALIBABA_URL); // https://www.alibaba.ir/bus/###-###?departing=####-##-##

    await page.waitForTimeout(5000);
    await page.screenshot({ path: '1.png' });

    // access to the DOM
    const html = await page.content();
    const $ = cheerio.load(html);
    const ticketsParent = $('#app > div.wrapper > main > div > div > section');
    // find all tickets
    allTickets = ticketsParent.children().nextAll('.available-card').length;
    // find disabled tickets
    disabledTickets = ticketsParent.children().nextAll('.is-disabled').length;

    if (disabledTickets < allTickets) {
        console.log(`Number of available tickets: ${allTickets - disabledTickets}`)
        const embed = new MessageBuilder()
            .setTitle('Ticket alert')
            .setColor('#00b0f4')
            .setDescription(`Number of available tickets: ${allTickets - disabledTickets}`)
        sentry.send(embed);
    }
}
setInterval(() => {
    ticketFinder();
}, 120000);
