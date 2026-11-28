import assert from "node:assert/strict";
import test from "node:test";
import {
  isHttpUrl,
  formatLocalDate,
  removeById,
  scheduleValidationError,
  upsertById,
} from "./collection-logic.mjs";

test("URL validation accepts HTTP(S) and rejects malformed or unsupported schemes", () => {
  assert.equal(isHttpUrl("https://adtu.in/programmes"), true);
  assert.equal(isHttpUrl("http://example.org"), true);
  assert.equal(isHttpUrl("ftp://example.org/file.pdf"), false);
  assert.equal(isHttpUrl("https://user:example@example.org"), false);
  assert.equal(isHttpUrl("not a URL"), false);
});

test("schedule validation requires execution fields and rejects an earlier end date", () => {
  assert.match(scheduleValidationError({
    configId: "",
    startDate: "2026-01-02",
    time: "09:00",
    timeZone: "Asia/Kolkata",
    endDate: "",
  }), /Select a collection/);
  assert.match(scheduleValidationError({
    configId: "config-1",
    startDate: "2026-01-02",
    time: "09:00",
    timeZone: "Asia/Kolkata",
    endDate: "2026-01-01",
  }), /on or after/);
  assert.match(scheduleValidationError({
    configId: "config-1",
    startDate: "2026-01-02",
    time: "09:00",
    timeZone: "Not/AZone",
    endDate: "",
  }), /valid time zone/);
  assert.equal(scheduleValidationError({
    configId: "config-1",
    startDate: "2026-01-02",
    time: "09:00",
    timeZone: "Asia/Kolkata",
    endDate: "2026-01-02",
  }), "");
});

test("date-input values use the local calendar date", () => {
  assert.equal(formatLocalDate(new Date(2026, 0, 2)), "2026-01-02");
});

test("collection and schedule updates replace by id without duplicating records", () => {
  const original = [{ id: "one", value: "old" }, { id: "two", value: "keep" }];
  const updated = upsertById(original, { id: "one", value: "new" });

  assert.deepEqual(updated, [{ id: "one", value: "new" }, { id: "two", value: "keep" }]);
  assert.equal(original[0].value, "old");
  assert.deepEqual(removeById(updated, "one"), [{ id: "two", value: "keep" }]);
});
