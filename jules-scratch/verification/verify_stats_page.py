from playwright.sync_api import Page, expect

def test_statistics_page(page: Page):
    # Navigate to the statistics page
    page.goto("http://localhost:40122/statistics")

    # Wait for the page to load
    expect(page.get_by_text("Statistics")).to_be_visible()

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/statistics.png")

    # Check for the new Mutes Given card
    expect(page.get_by_text("Mutes Given")).to_be_visible()