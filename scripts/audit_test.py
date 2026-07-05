"""
全面审计脚本 — 测试所有页面功能、捕获控制台错误、检查数据完整性
"""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
CONSOLE_ERRORS = []
NETWORK_FAILURES = []

def r(section, msg, level="OK"):
    flag = "[OK]" if level == "OK" else f"[{level}]"
    print(f"  {flag} [{section}] {msg}")

def test_all():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()

        page.on("console", lambda msg: CONSOLE_ERRORS.append({"type": msg.type, "text": msg.text}) if msg.type in ("error","warning") else None)
        page.on("requestfailed", lambda req: NETWORK_FAILURES.append({"url": req.url, "failure": req.failure}))

        # ──────── 1. Homepage ────────
        print("\n=== 1. HOMEPAGE ===")
        page.goto(BASE, wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(2000)

        r("home-title", page.title())
        r("home-year-select", "options: %d" % page.locator("select").first.locator("option").count())
        prov_query = "query?province="
        r("home-province-cards", "cards: %d" % page.locator("a[href*='%s']" % prov_query).count())
        has_score = page.locator("input[type='number']").count() > 0
        r("home-score-input", "exists: %s" % has_score)

        btn = page.locator("button:has-text('查看推荐')")
        if btn.count() > 0:
            btn.first.click()
            page.wait_for_timeout(3000)
            r("home-recommend-nav", page.url)

        # ──────── 2. Query page ────────
        print("\n=== 2. QUERY PAGE ===")
        page.goto(BASE + "/query", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(2000)

        back = page.locator("a[href='/']")
        txt = back.first.text_content()[:20] if back.count() > 0 else ""
        r("query-back-link", "exists: %s, text: %s" % (back.count() > 0, txt))
        r("query-selects", "count: %d" % len(page.locator("select").all()))

        search = page.locator("button:has-text('查询')")
        if search.count() > 0:
            search.first.click()
            page.wait_for_timeout(3000)
            r("query-search", page.url[:80])

        # ──────── 3. Recommend page ────────
        print("\n=== 3. RECOMMEND PAGE ===")
        page.goto(BASE + "/recommend?year=2025&score=600&examCategory=gaokao", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(3000)
        has_reach = page.locator("text=冲刺").count() > 0
        r("recommend-reach", "exists: %s" % has_reach)
        schools = page.locator("a[href*='/school/']").all()
        names = [el.text_content().strip()[:15] for el in schools if el.text_content().strip()]
        r("recommend-schools", "links: %d, samples: %s" % (len(schools), names[:5]))

        # ──────── 4. School detail ────────
        print("\n=== 4. SCHOOL DETAIL ===")
        page.goto(BASE + "/school/1", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(3000)
        h1 = page.locator("h1")
        r("detail-title", h1.first.text_content()[:40] if h1.count() > 0 else "MISSING")
        r("detail-back-btn", "count: %d" % page.locator("button:has-text('返回')").count())
        r("detail-rows", "tbody rows: %d" % len(page.locator("tbody tr").all()))
        cmp = page.locator("button:has-text('加入对比')")
        r("detail-compare", "btn count: %d" % cmp.count())

        # ──────── 5. API Tests ────────
        print("\n=== 5. API TESTS ===")
        api = ctx.new_page()

        tests = [
            ("provinces", "return (await (await fetch('/api/provinces')).json()).length"),
            ("records-2025", "const r=await fetch('/api/records?year=2025&pageSize=5'); const d=await r.json(); return {total:d.total};"),
            ("years", "return await (await fetch('/api/years')).json()"),
            ("recommend-600", "const r=await fetch('/api/recommend?year=2025&score=600&examCategory=gaokao'); const d=await r.json(); return {reach:d.reach?.length,match:d.match?.length,safety:d.safety?.length}"),
            ("recommend-400", "const r=await fetch('/api/recommend?year=2025&score=400&examCategory=gaokao'); const d=await r.json(); const s=new Set(); (d.safety||[]).forEach(x=>s.add(x.institution?.name)); return s.size"),
            ("school-1", "const r=await fetch('/api/institutions/1'); const d=await r.json(); return {name:d.name,records:d.records?.length,hasMajors:!!d.records?.[0]?.majors?.length}"),
        ]
        for label, js in tests:
            try:
                res = api.evaluate("async ()=>{" + js + "}")
                r("API-" + label, str(res))
            except Exception as e:
                r("API-" + label, str(e)[:80], "FAIL")

        # Province stats
        try:
            stats = api.evaluate("""async () => {
                const r = await fetch('/api/provinces/stats');
                return await r.json();
            }""")
            top = [(s['province'], s['recordCount']) for s in stats[:5]]
            r("data-province-stats", "provinces: %d, top5: %s" % (len(stats), top))
        except Exception as e:
            r("data-province-stats", str(e)[:80], "FAIL")

        # Yearly data
        for y in [2025, 2024, 2023]:
            try:
                res = api.evaluate("""async (y) => {
                    const r = await fetch('/api/records?year='+y+'&pageSize=1&granularity=institution');
                    return (await r.json()).total;
                }""", y)
                r("data-year-%d" % y, "institution: %d" % res)
            except:
                r("data-year-%d" % y, "FAIL", "FAIL")

        # Admin auth
        res = api.evaluate("""async () => {
            const r = await fetch('/api/admin/records?pageSize=1');
            return r.status;
        }""")
        r("admin-auth", "unauth status: %d (expect 401)" % res)

        # Login
        res = api.evaluate("""async () => {
            const r = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: 'admin', password: 'admin123'})
            });
            return {status: r.status, body: await r.json()};
        }""")
        r("admin-login", "status=%d, body=%s" % (res['status'], str(res['body'])))

        api.close()
        browser.close()

    # ──────── Summary ────────
    print("\n\n===========================================")
    print("  CONSOLE ERRORS / WARNINGS")
    print("===========================================")
    if CONSOLE_ERRORS:
        seen = set()
        for ce in CONSOLE_ERRORS:
            t = ce["text"][:200]
            if t not in seen:
                seen.add(t)
                print("  [%s] %s" % (ce["type"].upper(), t))
    else:
        print("  (none)")

    if NETWORK_FAILURES:
        print("\n  NETWORK FAILURES (%d):" % len(NETWORK_FAILURES))
        for nf in NETWORK_FAILURES[:5]:
            print("  [FAIL] %s" % nf["url"][:100])

if __name__ == "__main__":
    test_all()
