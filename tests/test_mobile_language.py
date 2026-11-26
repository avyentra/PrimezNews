"""Exercise the reader's language selector in mobile Chrome on GitHub's Ubuntu runner."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import unittest
from urllib.request import Request, urlopen
from urllib.parse import urlsplit
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from threading import Thread
import socket
import time

try:  # local machines: Playwright brings its own matching browser
    from playwright.sync_api import sync_playwright
except ImportError:  # GitHub runner: ChromeDriver below
    sync_playwright = None

ROOT = Path(__file__).resolve().parents[1]
PAGES = ("about-us", "contact", "editorial-policy", "privacy-policy",
         "grievance-redressal", "advertise")
DRIVER = shutil.which("chromedriver")


class PagesRequestHandler(SimpleHTTPRequestHandler):
    """Mirror GitHub Pages extensionless HTML routes in the local test server."""
    def translate_path(self, path):
        resolved = super().translate_path(path)
        if not Path(resolved).exists() and not urlsplit(path).path.endswith("/"):
            candidate = Path(resolved + ".html")
            if candidate.is_file():
                return str(candidate)
        return resolved


class MobileLanguageTest(unittest.TestCase):
    def test_language_switch_and_layout(self):
        if sync_playwright and not os.environ.get("GITHUB_ACTIONS"):
            return self._run_with_playwright()
        if not DRIVER:
            if os.environ.get("GITHUB_ACTIONS"):
                self.fail("ChromeDriver is required on the CI runner")
            self.skipTest("ChromeDriver unavailable")

        server = ThreadingHTTPServer(("127.0.0.1", 0),
                                     partial(PagesRequestHandler, directory=str(ROOT)))
        self.addCleanup(server.server_close)
        Thread(target=server.serve_forever, daemon=True).start()
        self.addCleanup(server.shutdown)
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        driver = subprocess.Popen([DRIVER, f"--port={port}"])
        self.addCleanup(driver.wait, 10)
        self.addCleanup(driver.terminate)

        def command(path, data=None):
            request = Request(f"http://127.0.0.1:{port}{path}",
                              data=json.dumps(data).encode() if data is not None else None,
                              headers={"Content-Type": "application/json"})
            with urlopen(request, timeout=30) as response:
                return json.load(response)["value"]

        for attempt in range(100):
            try:
                command("/status")
                break
            except OSError:
                if attempt == 99:
                    raise
                time.sleep(0.1)
        options = {"args": ["--headless=new", "--no-sandbox"],
                   "mobileEmulation": {"deviceMetrics": {"width": 390, "height": 844,
                                                        "pixelRatio": 2, "mobile": True,
                                                        "touch": True}}}
        session = command("/session", {"capabilities": {"alwaysMatch": {
            "browserName": "chrome", "goog:chromeOptions": options}}})
        base = "/session/" + session["sessionId"]
        selector = {"using": "css selector", "value": "select[data-language-switch]"}
        for page in PAGES:
            with self.subTest(page=page):
                command(base + "/url", {"url": f"http://127.0.0.1:{server.server_port}/{page}.html"})
                headings = set()
                paragraphs = set()
                for lang in ("hi", "en", "pa"):
                    # Language-specific routes replace the document; locate the current selector each time.
                    element = command(base + "/element", selector)
                    select_id = next(iter(element.values()))
                    option = command(f"{base}/element/{select_id}/element", {
                        "using": "css selector", "value": f'option[value="{lang}"]'})
                    command(f"{base}/element/{next(iter(option.values()))}/click", {})
                    for attempt in range(100):
                        ready = command(base + "/execute/sync", {"args": [lang], "script": "return document.readyState === 'complete' && document.documentElement.lang === arguments[0] && !!document.querySelector('primez-site-nav')?.shadowRoot;"})
                        if ready:
                            break
                        time.sleep(0.1)
                    self.assertTrue(ready, (page, lang, "Language navigation did not settle"))
                    state = command(base + "/execute/sync", {"args": [], "script": """
                        const root = document.documentElement;
                        const frame = ['.pn-header', '.pn-footer'].map(selector =>
                            [...document.querySelectorAll(selector + ' [data-frame-lang="' + root.lang + '"]')].find(el => el.getClientRects().length));
                        if (frame.some(el => !el || !el.getClientRects().length)) {
                            throw Error('Selected language missing from public header or footer');
                        }
                        return [root.lang, root.clientWidth, root.scrollWidth,
                                document.querySelector('h1').innerText.trim(),
                                document.querySelector('main p').innerText.trim()];
                    """})
                    self.assertEqual(state[:3], [lang, 390, 390], (page, lang, state))
                    self.assertTrue(state[3] and state[4])
                    nav = command(base + "/execute/sync", {"args": [], "script": """
                        const root = document.querySelector('primez-site-nav').shadowRoot;
                        const toggle = root.querySelector('button');
                        toggle.click();
                        const links = [...root.querySelectorAll('#sections a')];
                        const first = links[0];
                        const result = [toggle.getAttribute('aria-expanded'),
                            links.length, first.getAttribute('aria-label'), first.getBoundingClientRect().width,
                            new URL(links[2].href).searchParams.get('category')];
                        toggle.click();
                        return result;
                    """})
                    self.assertEqual(nav[:3], ["true", 10, {"en": "Home", "hi": "होम", "pa": "ਮੁੱਖ ਪੰਨਾ"}[lang]])
                    self.assertGreater(nav[3], 0)
                    self.assertEqual(nav[4], "Agriculture")
                    headings.add(state[3])
                    paragraphs.add(state[4])
                self.assertEqual(len(headings), 3)
                self.assertEqual(len(paragraphs), 3)

        def nav_state(script):
            return command(base + "/execute/sync", {"args": [], "script":
                "const root=document.querySelector('primez-site-nav').shadowRoot;"
                "const trigger=root.querySelector('.more'),panel=root.querySelector('#panel');" + script})
        self.assertTrue(nav_state("return panel.hidden"))
        self.assertFalse(nav_state("trigger.click(); return panel.hidden"))
        self.assertTrue(nav_state("trigger.click(); return panel.hidden"))
        self.assertEqual(nav_state("return document.querySelector('.pn-edition').getBoundingClientRect().width"), 0)
        desktop = command("/session", {"capabilities": {"alwaysMatch": {
            "browserName": "chrome", "goog:chromeOptions": {"args": ["--headless=new", "--no-sandbox", "--window-size=1440,900"]}}}})
        base = "/session/" + desktop["sessionId"]
        command(base + "/url", {"url": f"http://127.0.0.1:{server.server_port}/about-us.html"})
        self.assertTrue(nav_state("return panel.hidden"))
        element = nav_state("return trigger")
        def hover(origin, x=0, y=0):
            command(base + "/actions", {"actions": [{"type": "pointer", "id": "mouse",
                "parameters": {"pointerType": "mouse"}, "actions": [
                    {"type": "pointerMove", "duration": 50, "origin": origin, "x": x, "y": y}]}]})
        hover(element)
        self.assertFalse(nav_state("return panel.hidden"))
        hover(nav_state("return panel.querySelector('a')"))
        time.sleep(0.25)
        self.assertFalse(nav_state("return panel.hidden"))
        hover("viewport", 1, 1)
        time.sleep(0.25)
        self.assertTrue(nav_state("return panel.hidden"))

    # Same checks as above, driven by Playwright. Used locally, where the installed
    # ChromeDriver and Chrome versions often do not match.
    def _run_with_playwright(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0),
                                     partial(PagesRequestHandler, directory=str(ROOT)))
        self.addCleanup(server.server_close)
        Thread(target=server.serve_forever, daemon=True).start()
        self.addCleanup(server.shutdown)
        origin = f"http://127.0.0.1:{server.server_port}"
        nav_js = ("const root=document.querySelector('primez-site-nav').shadowRoot;"
                  "const trigger=root.querySelector('.more'),panel=root.querySelector('#panel');")
        with sync_playwright() as pw:
            try:
                browser = pw.chromium.launch()
            except Exception:
                browser = pw.chromium.launch(executable_path=shutil.which("google-chrome") or "google-chrome")
            mobile = browser.new_page(viewport={"width": 390, "height": 844},
                                      device_scale_factor=2, is_mobile=True, has_touch=True)
            for page in PAGES:
                with self.subTest(page=page):
                    mobile.goto(f"{origin}/{page}.html")
                    headings, paragraphs = set(), set()
                    for lang in ("hi", "en", "pa"):
                        mobile.select_option("select[data-language-switch]", lang)
                        mobile.wait_for_function("(lang) => document.readyState === 'complete' && document.documentElement.lang === lang && !!document.querySelector('primez-site-nav')?.shadowRoot", arg=lang)
                        state = mobile.evaluate("""() => {
                            const root = document.documentElement;
                            const frame = ['.pn-header', '.pn-footer'].map(selector =>
                                [...document.querySelectorAll(selector + ' [data-frame-lang="' + root.lang + '"]')].find(el => el.getClientRects().length));
                            if (frame.some(el => !el || !el.getClientRects().length)) {
                                throw Error('Selected language missing from public header or footer');
                            }
                            return [root.lang, root.clientWidth, root.scrollWidth,
                                    document.querySelector('h1').innerText.trim(),
                                    document.querySelector('main p').innerText.trim()];
                        }""")
                        self.assertEqual(state[:3], [lang, 390, 390], (page, lang, state))
                        self.assertTrue(state[3] and state[4])
                        nav = mobile.evaluate("""() => {
                            const root = document.querySelector('primez-site-nav').shadowRoot;
                            const toggle = root.querySelector('button');
                            toggle.click();
                            const links = [...root.querySelectorAll('#sections a')];
                            const first = links[0];
                            const result = [toggle.getAttribute('aria-expanded'),
                                links.length, first.getAttribute('aria-label'), first.getBoundingClientRect().width,
                                new URL(links[2].href).searchParams.get('category')];
                            toggle.click();
                            return result;
                        }""")
                        self.assertEqual(nav[:3], ["true", 10, {"en": "Home", "hi": "होम", "pa": "ਮੁੱਖ ਪੰਨਾ"}[lang]])
                        self.assertGreater(nav[3], 0)
                        self.assertEqual(nav[4], "Agriculture")
                        headings.add(state[3])
                        paragraphs.add(state[4])
                    self.assertEqual(len(headings), 3)
                    self.assertEqual(len(paragraphs), 3)
            state = lambda page, script: page.evaluate("() => {" + nav_js + script + "}")
            self.assertTrue(state(mobile, "return panel.hidden"))
            self.assertFalse(state(mobile, "trigger.click(); return panel.hidden"))
            self.assertTrue(state(mobile, "trigger.click(); return panel.hidden"))
            self.assertEqual(state(mobile, "return document.querySelector('.pn-edition').getBoundingClientRect().width"), 0)
            desktop = browser.new_page(viewport={"width": 1440, "height": 900})
            desktop.goto(f"{origin}/about-us.html")
            self.assertTrue(state(desktop, "return panel.hidden"))
            more = desktop.locator("primez-site-nav").locator(".more")
            more.hover()
            self.assertFalse(state(desktop, "return panel.hidden"))
            desktop.locator("primez-site-nav").locator("#panel a").first.hover()
            time.sleep(0.25)
            self.assertFalse(state(desktop, "return panel.hidden"))
            desktop.mouse.move(1, 1)
            time.sleep(0.25)
            self.assertTrue(state(desktop, "return panel.hidden"))
