import unittest
from scripts.fetch_rss_news import editorial_body, location_evidence


class LocationReviewTests(unittest.TestCase):
    def test_dateline_alone_does_not_support_location(self):
        source = "Chandigarh: Canada announced a change to application deadlines."
        self.assertEqual(location_evidence("Chandigarh", source, source), "")

    def test_district_evidence_must_be_in_source(self):
        source = "Schools in Ludhiana district will close on Monday."
        self.assertIn(source, location_evidence("Ludhiana", source, source))
        self.assertEqual(location_evidence("Ludhiana", source, "Other report"), "")
        self.assertEqual(location_evidence("Chandigarh", source, source), "")

    def test_auto_publication_keeps_source_and_omits_review_hint(self):
        article = dict(body="Report", source_url="https://example.org/notice", evidence="Quote")
        self.assertIn("[RSS location evidence] Quote", editorial_body(article, "District office", True))
        self.assertEqual(editorial_body(article, "District office", False),
                         "Report\n\nਸਰੋਤ: District office\nhttps://example.org/notice")
