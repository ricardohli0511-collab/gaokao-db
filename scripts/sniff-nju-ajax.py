"""Sniff NJU 历年分数页的 AJAX 端点，用于确认 filter-page 抓取参数。"""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    ajax_requests: list = []
    page.on(
        "request",
        lambda req: ajax_requests.append(req)
        if req.resource_type in ["xhr", "fetch"]
        else None,
    )

    page.goto("https://bkzs.nju.edu.cn/static/front/nju/basic/html_web/lnfs.html")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)

    page.screenshot(path="/tmp/nju_default.png", full_page=True)

    # 切换省份到北京（非默认江苏）触发 AJAX
    try:
        dd = page.locator("dd[data-param='ssmc']")
        dd.click()
        page.wait_for_timeout(800)
        page.locator("dd[data-param='ssmc'] a[data-value='北京']").click()
        page.wait_for_timeout(4000)
        page.screenshot(path="/tmp/nju_beijing.png", full_page=True)
    except Exception as exc:
        print(f"[WARN] 省份切换失败: {exc}")

    # 切换年份到 2024
    try:
        page.locator("dd[data-param='nf'] a[data-value='2024']").click()
        page.wait_for_timeout(4000)
        page.screenshot(path="/tmp/nju_2024.png", full_page=True)
    except Exception as exc:
        print(f"[WARN] 年份切换失败: {exc}")

    print("=== NJU AJAX 请求 ===")
    for req in ajax_requests:
        if "ajax" in req.url.lower() or "lnfs" in req.url.lower():
            print(f"[{req.method}] {req.url}")
            if req.post_data:
                print(f"  Body: {req.post_data[:300]}")

    browser.close()
