const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "sector-data.json"), "utf8"));

test("sector registry has the agreed eleven-sector coverage", () => {
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.sectors.length, 11);
  assert.equal(new Set(data.sectors.map((sector) => sector.id)).size, data.sectors.length);
});

test("every planned indicator identifies its frequency and source", () => {
  for (const sector of data.sectors) {
    assert.ok(sector.name);
    assert.ok(sector.description);
    assert.ok(sector.sources.length > 0);
    assert.ok(sector.indicators.length > 0);

    for (const indicator of sector.indicators) {
      assert.ok(indicator.name, `${sector.id} has an unnamed indicator`);
      assert.ok(indicator.frequency, `${sector.id}/${indicator.name} has no frequency`);
      assert.ok(indicator.source, `${sector.id}/${indicator.name} has no source`);
      assert.equal("value" in indicator, false, `${sector.id}/${indicator.name} must not contain an unvalidated value`);
    }
  }
});

test("pending registry contains no fabricated update timestamp", () => {
  assert.equal(data.status, "source-integration-pending");
  assert.equal(data.updatedAt, null);
});
