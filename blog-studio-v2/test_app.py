import unittest
from app import audit,fetch
class Tests(unittest.TestCase):
 def test_bad_draft(self):
  issues,_=audit({'title':'short','body':'fake','meta_description':'','slug':'INVALID'},[{},{}]); self.assertGreaterEqual(len(issues),5)
 def test_source_reject(self):
  for url in ['http://cdc.gov','https://cdc.gov.evil.example','https://127.0.0.1/']:
   with self.assertRaises(ValueError): fetch(url)
 def test_valid_shape(self):
  a={'title':'A practical guide for readers','meta_description':'A practical guide for readers who want to compare their available options and make a better decision.','slug':'practical-guide','body':'## First\n'+ 'Useful example details for readers. '*80+'[S1]\n## Second\n[S2]\n## Third'}
  self.assertEqual(audit(a,[{},{}])[0],[])
if __name__=='__main__':unittest.main()
