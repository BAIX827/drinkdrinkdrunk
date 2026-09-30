import test from "node:test";
import assert from "node:assert/strict";
import "../Cocktail60/BarWeb/core.js";

test("calendar uses Monday-first weeks and handles leap years", () => {
  const leap = BarCore.journalMonth("2024-02");
  assert.equal(leap.cells.length, 35);
  assert.deepEqual(leap.cells.slice(0, 3), [null, null, null]);
  assert.equal(leap.cells[3].date, "2024-02-01");
  assert.equal(leap.cells.filter(Boolean).at(-1).date, "2024-02-29");
  assert.equal(BarCore.journalMonth("2025-02").cells.filter(Boolean).length, 28);
  assert.equal(BarCore.journalMonth("2021-02").cells.length, 28);
  assert.equal(BarCore.journalMonth("2026-03").cells.length, 42);
});

test("month navigation crosses year boundaries without timezone date shifts", () => {
  assert.equal(BarCore.journalMonth("2026-01").previous, "2025-12");
  assert.equal(BarCore.journalMonth("2026-12").next, "2027-01");
  assert.equal(BarCore.journalMonth("0001-01").previous, null);
  assert.equal(BarCore.journalMonth("9999-12").next, null);
  assert.equal(BarCore.journalMonth("0096-02").cells.filter(Boolean).length, 29);
});

test("calendar groups every same-day entry without changing appearance or legacy records", () => {
  const logs = [
    { id: "a", date: "2026-09-30", glass: "wine", color: "#8844aa" },
    { id: "old", date: "2026-09-30", name: "旧记录" },
    { id: "b", date: "2026-09-30", glass: "rocks", color: "#ffaa33" },
    { id: "c", date: "2026-10-01" },
  ];
  const before = structuredClone(logs);
  const month = BarCore.journalMonth("2026-09", logs);
  assert.equal(month.count, 3);
  assert.deepEqual(month.cells.find(day => day?.date === "2026-09-30").entries, logs.slice(0, 3));
  assert.deepEqual(logs, before);
  assert.equal(BarCore.journalMonth("2026-10", logs).count, 1);
});
