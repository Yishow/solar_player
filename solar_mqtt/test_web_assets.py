#!/usr/bin/env python3
import os
import unittest

class TestWebAssets(unittest.TestCase):
    def setUp(self):
        self.path = os.path.join(os.path.dirname(__file__), 'web', 'index.html')
        self.app_js_path = os.path.join(os.path.dirname(__file__), 'web', 'app.js')

    def _read_html(self):
        with open(self.path, "r", encoding="utf-8") as f:
            return f.read().replace("'", '"')

    # Removed test_required_panels_exist: old table-first panels are deprecated in Task 1


    # Removed test_subscription_table_exists: old table-first subscription table is deprecated in Task 1



    def test_app_uses_page_hostname_for_default_broker_host(self):
        with open(self.app_js_path, 'r', encoding='utf-8') as f:
            js = f.read()

        self.assertIn("window.location.hostname", js)

    def test_monitor_first_regions_exist(self):
        html = self._read_html()
        for id_ in (
            "summary-panel",
            "summary-connection-state",
            "summary-active-prefix",
            "summary-last-update",
            "summary-kn-state",
            "summary-cl-state",
            "monitoring-panel",
            "factory-panel-kn",
            "factory-panel-cl",
            "factory-status-kn",
            "factory-status-cl",
            "factory-updated-kn",
            "factory-updated-cl",
            "operations-panel",
            # Task 1: assert new monitor-first container IDs
            "factory-highlights-kn",
            "factory-highlights-cl",
            "factory-topic-list-kn",
            "factory-topic-list-cl",
        ):
            self.assertIn(f'id="{id_}"', html)

    def test_operations_modules_keep_required_controls(self):
        html = self._read_html()
        self.assertIn('src="vendor/mqtt.min.js"', html)
        self.assertIn('src="app.js"', html)
        # Assert config form name= contract is preserved
        for name in ("mqtt_prefix", "base_url", "login_pass"):
            self.assertIn(f'name="{name}"', html)
        for id_ in (
            "config-form",
            "selected-factory",
            "load-config",
            "save-config",
            "config-status",
            "restart-hint",
            "restart-required",
            "publish-form",
            "publish-topic",
            "publish-payload",
            "publish-error",
            "publish-submit",
            "broker-form",
            "broker-host",
            "broker-port",
            "client-id",
            "active-prefix",
            "broker-status",
            "broker-status-text",
            "connect-broker",
            "disconnect-broker",
        ):
            self.assertIn(f'id="{id_}"', html)


if __name__ == '__main__':
    unittest.main()
