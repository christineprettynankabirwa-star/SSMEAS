import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { pool } from "../src/config/database";
import { storePrediction } from "../src/models/prediction.model";

test("prediction polling deduplicates history snapshots within the retention window", async () => {
  const query = mock.method(pool, "query", async (sql: string) => {
    if (sql.includes("INSERT INTO prediction_history")) {
      assert.match(sql, /WHERE NOT EXISTS/);
      assert.match(sql, /INTERVAL '30 minutes'/);
    }
    return { rows: [], rowCount: 0 };
  });
  try {
    await storePrediction({
      tankId: "00000000-0000-4000-8000-000000000001", fillVelocityPercentPerHour: 0.2,
      currentLevel: 70, currentVolumeCubicMeters: 7, remainingVolumeCubicMeters: 3,
      warning: { thresholdPercent: 65, remainingHours: 0, estimatedArrivalAt: new Date().toISOString(), status: "THRESHOLD_REACHED", predictionInterval95: { earliestArrivalAt: null, latestArrivalAt: null, minimumHours: null, maximumHours: null } },
      danger: { thresholdPercent: 85, remainingHours: 75, estimatedArrivalAt: new Date().toISOString(), status: "PROJECTED", predictionInterval95: { earliestArrivalAt: null, latestArrivalAt: null, minimumHours: null, maximumHours: null } },
      overflow: { thresholdPercent: 100, remainingHours: 150, estimatedArrivalAt: new Date().toISOString(), status: "PROJECTED", predictionInterval95: { earliestArrivalAt: null, latestArrivalAt: null, minimumHours: null, maximumHours: null } },
      predictionStatus: "PROJECTED", qualityStatus: "GOOD", regressionRSquared: 0.9,
      fillingCycleStartedAt: new Date().toISOString(), confidence: 90, sampleCount: 20,
      calculatedAt: new Date().toISOString(),
    });
  } finally {
    query.mock.restore();
  }
});
