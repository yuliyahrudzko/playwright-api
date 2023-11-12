const { test, expect } = require('@playwright/test');
const playwright = require('playwright');
const userData = JSON.parse(JSON.stringify(require('../fixtures/users.json')));

test('Login to demoqa', async () => {
  const browser = await playwright.chromium.launch(); 

  // Create a new incognito browser context
  const context = await browser.newContext(); 

  // Create a new page inside context.
  const page = await context.newPage(); 

  await page.goto('https://demoqa.com/login');

  await page.locator('#userName').fill(userData.username);

  await page.locator('#password').fill(userData.password);

  await page.locator('#login').click();

  await expect(page).toHaveURL(/.*profile/);

  let cookies = await context.cookies('https://demoqa.com/');

  await expect(cookies.find(c => c.name == 'userID').value).toBeTruthy();

  await expect(cookies.find(c => c.name == 'userName').value).toBeTruthy();

  await expect(cookies.find(c => c.name == 'expires').value).toBeTruthy();

  await expect(cookies.find(c => c.name == 'token').value).toBeTruthy();

  const USERID = cookies.find(c => c.name == 'userID').value;

  const USERNAME = cookies.find(c => c.name == 'userName').value;

  const TOKEN = cookies.find(c => c.name == 'token').value;

  // Block .png and .jpeg images
  await page.route(/.(png|jpeg|img)$/, route => route.abort());

  //Returns the matched response. 
  const responsePromise = page.waitForResponse(response =>
    response.url() === 'https://demoqa.com/BookStore/v1/Books' && response.status() === 200
  );

  await page.locator('#gotoStore').click();

  const booksResponse = await responsePromise;

  await expect(page).toHaveURL(/.*books/);

  await page.screenshot({ path: 'screenshot.png' });

  //we assert by using expect condition for the ok message and status code 200.
  expect(booksResponse.ok()).toBeTruthy();

  expect(booksResponse.status()).toBe(200);

  const booksCountInResponse = await booksResponse.body().then(b => { 
    let data = JSON.parse(b.toString()); 
    return data.books.length;
  });
  
  console.log(`Number of books in the response = ${booksCountInResponse}`);

  const booksCountOnUi = await page.locator('.rt-tbody>div img').count();

  console.log(`Number of books on the UI = ${booksCountOnUi}`);

  expect(booksCountInResponse).toEqual(booksCountOnUi);

  const newPageCount = Math.floor(Math.random() * (1000 - 1) + 1);

  console.log(`New page count should be ${newPageCount}`);

  // page.route() to mock network in a single page.
  page.route('https://demoqa.com/BookStore/v1/Book?**', async route => {
    // Fetch original response.
    const response = await route.fetch();
    // Add a prefix to the title.
    let body = await response.text();

    console.log(`Current page count is ${JSON.parse(body.toString()).pages}`);

    body = body.replace(JSON.parse(body.toString()).pages, newPageCount);
    route.fulfill({
      // Pass all fields from the response.
      response,
      // Override response body.
      body
    });
  });

  let bookNumber = Math.floor(Math.random() * (booksCountOnUi - 1) + 1);
 
  await page.locator(`.rt-tbody>div:nth-child(${bookNumber}) a`).click();

  await expect(page.locator('#pages-wrapper #userName-value')).toHaveText(newPageCount.toString());

  await page.screenshot({ path: 'BookContext.png' });

  //разобрать более подробно
  const response = await page.request.get(`https://demoqa.com/Account/v1/User/${USERID}`, {
    headers: {
    'Authorization': `Bearer ${TOKEN}`, }
  });

  console.log(await response.json());

  //returns text representation of response body
  let body = await response.text(); 

  console.log(body);

  expect(JSON.parse(body.toString()).username).toEqual(USERNAME);
 });
