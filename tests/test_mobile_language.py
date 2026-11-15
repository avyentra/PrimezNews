"""Exercise the reader's language selector in mobile Chrome on GitHub's Ubuntu runner."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import unittest
from urllib.request import Request, urlopen
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from threading import Thread
import socket
import time

ROOT = Path(__file__).resolve().parents[1]
PAGES = ("about-us", "contact", "editorial-policy", "privacy-policy",
         "grievance-redressal", "advertise")
DRIVER = shutil.which("chromedriver")


class MobileLanguageTest(unittest.TestCase):
    def test_language_switch_and_layout(self):
        if not DRIVER:
            if os.environ.get("GITHUB_ACTIONS"):
                self.fail("ChromeDriver is required on the CI runner")
            self.skipTest("ChromeDriver unavailable")

        server = ThreadingHTTPServer(("127.0.0.1", 0),
                                     partial(SimpleHTTPRequestHandler, directory=str(ROOT)))
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
                element = command(base + "/element", selector)
                select_id = next(iter(element.values()))
                headings = set()
                paragraphs = set()
                for lang in ("hi", "en", "pa"):
                    option = command(f"{base}/element/{select_id}/element", {
                        "using": "css selector", "value": f'option[value="{lang}"]'})
                    command(f"{base}/element/{next(iter(option.values()))}/click", {})
                    state = command(base + "/execute/sync", {"args": [], "script": """
                        const root = document.documentElement;
                        return [root.lang, root.clientWidth, root.scrollWidth,
                                document.querySelector('h1').innerText.trim(),
                                document.querySelector('main p').innerText.trim()];
                    """})
                    self.assertEqual(state[:3], [lang, 390, 390], (page, lang, state))
                    self.assertTrue(state[3] and state[4])
                    headings.add(state[3])
                    paragraphs.add(state[4])
                self.assertEqual(len(headings), 3)
                self.assertEqual(len(paragraphs), 3)
