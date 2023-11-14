const { test, expect } = require('@playwright/test');
const { password, username } = require('../fixtures/users.json');

test('Login to demoqa', async ({ page, context }) => {
  await page.goto('https://demoqa.com/login');

  await page.locator('#userName').fill(username);

  await page.locator('#password').fill(password);

  await page.locator('#login').click();

  await expect(page).toHaveURL(/.*profile/);

  //cookies that affect those URLs are returned (in th context)
  let cookies = await context.cookies('https://demoqa.com/');

  await expect(cookies.find(c => c.name === 'userID').value).toBeTruthy();

  await expect(cookies.find(c => c.name === 'userName').value).toBeTruthy();

  await expect(cookies.find(c => c.name === 'expires').value).toBeTruthy();

  await expect(cookies.find(c => c.name === 'token').value).toBeTruthy();

  const USERID = cookies.find(c => c.name === 'userID').value;

  const USERNAME = cookies.find(c => c.name === 'userName').value;

  const TOKEN = cookies.find(c => c.name === 'token').value;

  //Once route is enabled, every request matching the url pattern will stall unless it's continued, fulfilled or aborted
  // Block .png and .jpeg images
  await page.route(/.(png|jpeg|img)$/, route => route.abort());

  //Returns the matched response
  const responsePromise = page.waitForResponse(response =>
    response.url() === 'https://demoqa.com/BookStore/v1/Books' && response.status() === 200
  );

  await page.locator('#gotoStore').click();

  //await заставит интерпретатор JavaScript ждать до тех пор, пока промис справа от await не выполнится
  const booksResponse = await responsePromise;

  await expect(page).toHaveURL(/.*books/);

  await page.screenshot({ path: 'screenshot.png' });

  //we assert by using expect condition for the ok message and status code 200.
  expect(booksResponse.ok()).toBeTruthy();

  expect(booksResponse.status()).toBe(200);

  //returns the JSON representation of response body.
  //This method will throw if the response body is not parsable via JSON.parse
  const booksCountInResponse = await booksResponse.json().then(data => {
    return data.books.length;
  });

  const booksCountOnUi = await page.locator('.rt-tbody>div img').count();

  expect(booksCountInResponse).toEqual(booksCountOnUi);

  const newPageCount = Math.floor(Math.random() * (1000 - 1) + 1);

  console.log(`New page count should be ${newPageCount}`);

  // page.route() to mock network in a single page.
  page.route('https://demoqa.com/BookStore/v1/Book?**', async route => {
    // Fetch original response.
    const response = await route.fetch();
    let body = await response.text();

    body = body.replace(await response.json().then(data => data.pages), newPageCount);
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

  const response = await page.request.get(`https://demoqa.com/Account/v1/User/${USERID}`, {
    headers: {
    'Authorization': `Bearer ${TOKEN}`
    }
  });

  expect(await response.json().then(data => data.username)).toEqual(USERNAME);

  expect(await response.json().then(data => data.books.length)).toBe(0);
 });
