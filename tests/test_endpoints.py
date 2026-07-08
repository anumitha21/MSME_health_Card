import unittest
import pandas as pd
from src.scoring import get_completeness_gap
from src.portfolio import get_inclusion_impact
from src.config import DATASET_PATH

class TestMSMEHealthCardLogic(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.df = pd.read_csv(DATASET_PATH)

    def test_completeness_gap_gold_tier(self):
        # Find a Gold tier business (all 4 sources present)
        gold_mask = (
            (self.df["gst_registered"] == 1) &
            (self.df["upi_available"] == 1) &
            (self.df["aa_consent_given"] == 1) &
            (self.df["epfo_registered"] == 1)
        )
        gold_records = self.df[gold_mask]
        
        if gold_records.empty:
            self.skipTest("No Gold tier records found in synthetic dataset.")
            
        enterprise_id = gold_records.iloc[0]["enterprise_id"]
        data = get_completeness_gap(enterprise_id)
        
        self.assertEqual(data["enterprise_id"], enterprise_id)
        self.assertEqual(data["current_tier"], "Gold")
        self.assertEqual(data["gaps"], [])
        self.assertIn("All data sources connected", data["message"])

    def test_completeness_gap_missing_sources(self):
        # Find an enterprise with missing sources (e.g. Bronze or Minimal)
        missing_mask = (
            (self.df["gst_registered"] == 0) |
            (self.df["upi_available"] == 0) |
            (self.df["aa_consent_given"] == 0) |
            (self.df["epfo_registered"] == 0)
        )
        missing_records = self.df[missing_mask]
        
        if missing_records.empty:
            self.skipTest("No records with missing sources found.")
            
        enterprise_id = missing_records.iloc[0]["enterprise_id"]
        data = get_completeness_gap(enterprise_id)
        
        self.assertEqual(data["enterprise_id"], enterprise_id)
        self.assertNotEqual(data["current_tier"], "Gold")
        self.assertTrue(len(data["gaps"]) > 0)
        
        # Verify schema of each gap
        first_gap = data["gaps"][0]
        self.assertIn("missing_source", first_gap)
        self.assertIn("projected_tier", first_gap)
        self.assertIn("projected_score", first_gap)
        self.assertIn("projected_confidence_interval", first_gap)
        self.assertIn("estimated_point_gain", first_gap)
        self.assertIn("message", first_gap)
        
        # Check sorting (estimated_point_gain descending)
        gains = [gap["estimated_point_gain"] for gap in data["gaps"]]
        self.assertEqual(gains, sorted(gains, reverse=True))

    def test_portfolio_inclusion_impact(self):
        data = get_inclusion_impact()
        
        self.assertIn("total_portfolio", data)
        self.assertIn("traditionally_scoreable", data)
        self.assertIn("alt_data_only", data)
        self.assertIn("alt_data_only_pct", data)
        self.assertIn("alt_data_only_healthy_tier_count", data)
        self.assertIn("alt_data_only_flagged_tier_count", data)
        self.assertIn("alt_data_only_by_sector", data)
        
        # Verify summation
        self.assertEqual(
            data["traditionally_scoreable"] + data["alt_data_only"],
            data["total_portfolio"]
        )
        
        # Verify percentage calculation matches
        if data["total_portfolio"] > 0:
            expected_pct = round(data["alt_data_only"] / data["total_portfolio"] * 100, 1)
            self.assertAlmostEqual(data["alt_data_only_pct"], expected_pct, places=1)

    def test_completeness_gap_invalid_id(self):
        data = get_completeness_gap("INVALID_ID")
        self.assertIn("error", data)
        self.assertIn("not found", data["error"])

if __name__ == "__main__":
    unittest.main()
