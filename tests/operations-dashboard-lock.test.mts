import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const dashboardPath = resolve("app/admin/(protected)/dashboard/page.tsx");
const source = readFileSync(dashboardPath, "utf8");

const startMarker = "// PROTECTED-OPS-DASHBOARD-START";
const endMarker = "// PROTECTED-OPS-DASHBOARD-END";

const startIndex = source.indexOf(startMarker);
const endIndex = source.indexOf(endMarker);

assert.notEqual(startIndex, -1, "Missing protected start marker for operations dashboard.");
assert.notEqual(endIndex, -1, "Missing protected end marker for operations dashboard.");
assert.ok(startIndex < endIndex, "Protected markers for operations dashboard are out of order.");

const protectedRegion = source.slice(startIndex, endIndex);

const requiredAnchors = [
  'if (showOperationsManagerView) {',
  'const allPeriodBookings = bookings.filter',
  'const currentJakartaDateTimeLabel = getCurrentJakartaDateTimeLabel()',
  'const sourcePerformanceCards = [',
  'const operationalIssueItems =',
  'const showSplitKpiStory =',
  '{currentJakartaDateTimeLabel} WIB',
  '{showOperationalWorkspace && showOperationalTasksWidget ? (',
  '<AdminDashboardHeightSync />',
  'Prioritas Operasional',
];

for (const anchor of requiredAnchors) {
  assert.ok(
    protectedRegion.includes(anchor),
    `Operations dashboard lock failed. Missing anchor: ${anchor}`,
  );
}

const orderedAnchors = [
  'const sourcePerformanceCards = [',
  'const operationalIssueItems =',
  'const currentJakartaDateTimeLabel = getCurrentJakartaDateTimeLabel()',
  'const showSplitKpiStory =',
  '{currentJakartaDateTimeLabel} WIB',
  '{showSplitKpiStory ? (',
  '{showOperationalWorkspace && showOperationalTasksWidget ? (',
  '<AdminDashboardHeightSync />',
  'Prioritas Operasional',
];

let previousIndex = -1;
for (const anchor of orderedAnchors) {
  const currentIndex = protectedRegion.indexOf(anchor);
  assert.notEqual(currentIndex, -1, `Missing ordered anchor: ${anchor}`);
  assert.ok(
    currentIndex > previousIndex,
    `Operations dashboard structure changed unexpectedly around anchor: ${anchor}`,
  );
  previousIndex = currentIndex;
}

console.log("operations-dashboard-lock: ok");
