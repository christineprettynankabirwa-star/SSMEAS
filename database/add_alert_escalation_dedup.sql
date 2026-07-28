BEGIN;

-- Preserve warning history while closing lower-severity incidents already
-- superseded by an unresolved critical sewage incident for the same tank.
UPDATE alerts warning_alert
SET status='RESOLVED', resolved_at=COALESCE(resolved_at, NOW()), updated_at=NOW()
WHERE warning_alert.status IN ('ACTIVE','ACKNOWLEDGED')
  AND warning_alert.severity='warning'
  AND warning_alert.alert_type='High sewage level'
  AND EXISTS (
    SELECT 1
    FROM alerts critical_alert
    WHERE critical_alert.tank_id=warning_alert.tank_id
      AND critical_alert.status IN ('ACTIVE','ACKNOWLEDGED')
      AND critical_alert.severity='critical'
      AND critical_alert.alert_type='Critical sewage level'
  );

COMMIT;
