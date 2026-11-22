import { test, expect } from '@playwright/test';

// 13 tests: 8 pass, 2 always fail, 2 fail on the first attempt only, 1 skipped
const cart = `
  <h1>Cart</h1>
  <ul>
    <li data-price="12">Notebook</li>
    <li data-price="30">Backpack</li>
    <li data-price="8">Pen set</li>
  </ul>
  <p id="total">Total: £50</p>
  <button id="checkout">Checkout</button>
  <label><input id="gift" type="checkbox"> Gift wrap</label>
  <input id="coupon" placeholder="Coupon code">
  <p id="status" role="status"></p>
  <script>
    document.getElementById('checkout').onclick = () => document.getElementById('status').textContent = 'Order placed';
    document.getElementById('coupon').oninput = (e) => document.getElementById('status').textContent = e.target.value === 'SAVE10' ? 'Coupon applied' : '';
  </script>`;

test.beforeEach(async ({ page }) => {
  await page.setContent(cart);
});

test('shows the heading', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Cart' })).toBeVisible();
});

test('lists three items', async ({ page }) => {
  await expect(page.getByRole('listitem')).toHaveCount(3);
});

test('shows the total', async ({ page }) => {
  await expect(page.locator('#total')).toHaveText('Total: £50');
});

test('places an order', async ({ page }) => {
  await page.getByRole('button', { name: 'Checkout' }).click();
  await expect(page.getByRole('status')).toHaveText('Order placed');
});

test('applies a coupon', async ({ page }) => {
  await page.getByPlaceholder('Coupon code').fill('SAVE10');
  await expect(page.getByRole('status')).toHaveText('Coupon applied');
});

test('ignores a bad coupon', async ({ page }) => {
  await page.getByPlaceholder('Coupon code').fill('NOPE');
  await expect(page.getByRole('status')).toHaveText('');
});

test('toggles gift wrap', async ({ page }) => {
  await page.getByLabel('Gift wrap').check();
  await expect(page.getByLabel('Gift wrap')).toBeChecked();
});

test('logs the item count', async ({ page }) => {
  console.log(`items: ${await page.getByRole('listitem').count()}`);
  await expect(page.getByRole('listitem').first()).toHaveText('Notebook');
});

test('always fails: wrong total', async ({ page }) => {
  await expect(page.locator('#total')).toHaveText('Total: £60', { timeout: 500 });
});

test('always fails: missing button', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Pay now' })).toBeVisible({ timeout: 500 });
});

test('flaky: fails on the first attempt', async ({ page }, testInfo) => {
  await expect(page.getByRole('listitem')).toHaveCount(testInfo.retry === 0 ? 4 : 3, { timeout: 500 });
});

test('flaky: passes on retry', async ({ page }, testInfo) => {
  await expect(page.getByRole('button', { name: testInfo.retry === 0 ? 'Buy' : 'Checkout' })).toBeVisible({ timeout: 500 });
});

test.skip('skipped: saved carts', async ({ page }) => {
  await expect(page.getByText('Saved carts')).toBeVisible();
});
