import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptMetricValue,
  catalogMetrics,
  findMetricDefinition,
  metricCatalog
} from "./metric-catalog.ts";

test("accepts a plausible reading and normalizes it", () => {
  assert.deepEqual(acceptMetricValue("SBP", 145), {
    id: "SBP",
    label: "ความดันตัวบน (SBP)",
    value: "145",
    unit: "มม.ปรอท"
  });
});

test("every label is ไทย (Eng)", () => {
  for (const metric of metricCatalog) {
    assert.match(
      metric.label,
      /^[^()]*[฀-๿][^()]*\([^()]+\)$/u,
      `${metric.id} label is not "ไทย (Eng)": ${metric.label}`
    );
  }
});

test("legacy ids from the old three-field form still resolve", () => {
  assert.equal(findMetricDefinition("bp_systolic")?.id, "SBP");
  assert.equal(findMetricDefinition("ldl")?.id, "LDL");
  assert.equal(findMetricDefinition("nope"), undefined);
});

test("accepts numeric strings from the agent", () => {
  assert.equal(acceptMetricValue("LDL", "145")?.value, "145");
});

test("rejects ids outside the catalog", () => {
  assert.equal(acceptMetricValue("Astrology", 1), null);
});

test("rejects impossible readings rather than overwriting a real one", () => {
  assert.equal(acceptMetricValue("SBP", 900), null);
  assert.equal(acceptMetricValue("HbA1c", 0), null);
  assert.equal(acceptMetricValue("eGFR", -5), null);
});

test("rejects non-numeric payloads", () => {
  assert.equal(acceptMetricValue("LDL", "สูงมาก"), null);
  assert.equal(acceptMetricValue("LDL", null), null);
  assert.equal(acceptMetricValue("LDL", { value: 1 }), null);
});

test("catalog ids are unique and every field has a usable range", () => {
  const ids = metricCatalog.map((metric) => metric.id);
  assert.equal(new Set(ids).size, ids.length);

  for (const metric of metricCatalog) {
    assert.ok(metric.min < metric.max, `${metric.id} has an empty range`);
    assert.ok(metric.label.length > 0, `${metric.id} has no label`);
  }
});

test("blank catalog rows seed the form without values", () => {
  assert.equal(catalogMetrics().length, metricCatalog.length);
  assert.ok(catalogMetrics().every((metric) => metric.value === ""));
});
