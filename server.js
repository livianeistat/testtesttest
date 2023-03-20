const express = require('express');
const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const app = express();
const port = 3000;


app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/', async (req, res) => {
  const keyword = req.body.keyword;
  console.log(`Scraping URLs for keyword: ${keyword}`);
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const url = `https://www.google.com/search?q=${keyword}`;
  await page.goto(url);
  let urls = [];
  while (urls.length < 500) {
    const currentUrls = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const urls = links.map(link => link.href);
      const nonGoogleUrls = urls.filter(url => {
        return !url.includes('google.') && !url.includes('webcache.googleusercontent.com');
      });
      return nonGoogleUrls;
    });
    urls = [...urls, ...currentUrls];
    urls = Array.from(new Set(urls));
    const nextButton = await page.$('#pnnext');
    if (urls.length >= 500 || !nextButton) {
      break;
    }
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('#pnnext')
    ]);
  }
  const csvWriter = createCsvWriter({
    path: 'urls.csv',
    header: [{ id: 'url', title: 'URL' }]
  });
  const data = urls.slice(0, 500).map(url => ({ url }));
  await csvWriter.writeRecords(data);
  await browser.close();
  console.log(`Finished scraping URLs`);
  res.send(`
  <p style="font-size:25px; display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; font-family: Montserrat;">Process completed successfully. <br>To access the URL's, please search for: urls.csv file located on your computer.</p>
  `);
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});