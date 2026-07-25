import unittest

def filter_publication(status, affiliation_list):
    if status in ["Resigned", "Inactive"]:
        has_nu_aff = False
        for aff in affiliation_list:
            aff_name = str(aff.get("affilname", "")).lower()
            if "naresuan" in aff_name or "medicine" in aff_name:
                has_nu_aff = True
                break
        if not has_nu_aff:
            return False # Skip/Reject
    return True # Accept

class TestResignedFilter(unittest.TestCase):
    def test_active_author_always_accepted(self):
        # Even if affiliation doesn't match, active authors are accepted
        self.assertTrue(filter_publication("Active", [{"affilname": "Mahidol University"}]))

    def test_resigned_author_with_nu_accepted(self):
        # Resigned author with NU affiliation is accepted
        affs = [{"affilname": "Naresuan University"}, {"affilname": "Chulalongkorn University"}]
        self.assertTrue(filter_publication("Resigned", affs))

    def test_resigned_author_with_nu_hospital_accepted(self):
        # Resigned author with NU Hospital is accepted
        affs = [{"affilname": "Naresuan University Hospital"}]
        self.assertTrue(filter_publication("Resigned", affs))

    def test_resigned_author_with_medicine_accepted(self):
        # Resigned author with Faculty of Medicine NU is accepted
        affs = [{"affilname": "Faculty of Medicine"}]
        self.assertTrue(filter_publication("Resigned", affs))

    def test_resigned_author_without_nu_rejected(self):
        # Resigned author with non-NU affiliation is rejected
        affs = [{"affilname": "Mahidol University, Faculty of Science"}]
        self.assertFalse(filter_publication("Resigned", affs))
        
        # Another non-NU case
        affs = [{"affilname": "Harvard Medical School"}]
        self.assertFalse(filter_publication("Inactive", affs))

if __name__ == '__main__':
    unittest.main()
