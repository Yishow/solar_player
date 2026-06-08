import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CustomSelect } from "./CustomSelect";

test("CustomSelect renders a native select element with options and disabled state", () => {
    const markup = renderToStaticMarkup(
        <CustomSelect
            className="demo-select"
            disabled={true}
            onChange={() => undefined}
            options={[
                { label: "請選擇", value: "" },
                { label: "Overview", value: "overview" }
            ]}
            value="overview"
        />
    );

    assert.match(markup, /class="[^"]*mgmt-select-container[^"]*demo-select[^"]*"/);
    assert.match(markup, /<select[^>]*(class="mgmt-select-native"|disabled="")[^>]*(class="mgmt-select-native"|disabled="")[^>]*>/);
    assert.match(markup, /<option value="overview" selected="">Overview<\/option>/);
    assert.match(markup, /<option value="">請選擇<\/option>/);
});