import { test, expect, Page } from '@playwright/test'

test.describe('Frontend', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    page = await context.newPage()
  })

  test('homepage loads', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await expect(page.locator('body')).toBeVisible()
  })
})
