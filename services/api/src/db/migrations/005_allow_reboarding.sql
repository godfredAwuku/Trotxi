-- Allow a rider to board the same trip again after completing the prior ride.
-- The "one active ride at a time" rule (uq_active_boarding_per_user) still holds;
-- we only drop the once-ever-per-trip uniqueness.
DROP INDEX IF EXISTS uq_boarding_user_trip;
