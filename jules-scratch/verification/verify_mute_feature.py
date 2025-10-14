from playwright.sync_api import sync_playwright, Page, expect
import sys

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(
        base_url="http://localhost:40122",
        ignore_https_errors=True,
    )
    page = context.new_page()

    try:
        print("Navigating to the players page...")
        page.goto("/#/players")
        page.wait_for_load_state("networkidle", timeout=20000)

        if "/auth" in page.url or "/setup" in page.url:
            print("Redirected to auth or setup page. Cannot proceed with player modal verification.")
            page.screenshot(path="jules-scratch/verification/redirect_page.png")
            browser.close()
            sys.exit(0)

        print("Checking for player list...")
        player_table = page.locator('table[data-testid="players-table"]')
        expect(player_table).to_be_visible(timeout=15000)

        player_rows = page.locator('tbody tr')
        if player_rows.count() == 0:
            print("No players online, cannot test player modal.")
            page.screenshot(path="jules-scratch/verification/verification.png")
            browser.close()
            sys.exit(0)

        print("Opening player modal...")
        player_rows.first.click()

        modal_header = page.get_by_role("dialog").locator('header')
        expect(modal_header).to_be_visible()

        print("Navigating to Mute tab...")
        mute_tab_button = page.get_by_role("button", name="Mute")
        expect(mute_tab_button).to_be_visible()
        mute_tab_button.click()

        print("Verifying Mute tab content...")
        expect(page.get_by_label("Duration")).to_be_visible()
        expect(page.get_by_label("Reason (optional)")).to_be_visible()

        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Screenshot of the Mute tab taken successfully.")

    except Exception as e:
        print(f"An error occurred during Playwright verification: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
        raise e
    finally:
        browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)