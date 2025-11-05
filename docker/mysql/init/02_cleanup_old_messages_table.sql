-- Cleanup: Remove obsolete 'messages' table (plural)
-- The API now uses 'message' (singular) table from the original dump
USE `Dashkey_test`;

DROP TABLE IF EXISTS `messages`;

