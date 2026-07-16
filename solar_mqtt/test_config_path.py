import json
import os
import tempfile
import unittest
from pathlib import Path

from solar.config import Config


class ConfigPathTests(unittest.TestCase):
    def test_load_uses_project_config_when_cwd_differs(self):
        repo_root = Path(__file__).resolve().parent
        config_file = repo_root / "solar_config.json"
        with config_file.open("r", encoding="utf-8") as f:
            expected = json.load(f)

        expected_factory_ids = [fac["factory_id"] for fac in expected["factories"]]

        old_cwd = os.getcwd()
        with tempfile.TemporaryDirectory() as tmp:
            os.chdir(tmp)
            try:
                cfg = Config()
                cfg.load()
            finally:
                os.chdir(old_cwd)

        self.assertEqual(cfg.factory_ids(), expected_factory_ids)


if __name__ == "__main__":
    unittest.main()
