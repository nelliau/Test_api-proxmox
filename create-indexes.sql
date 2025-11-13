-- ============================================================================
-- OPTIMISATION: Index pour améliorer les performances
-- ============================================================================
-- Date: 2025-11-13
-- Description: Ajoute des index sur les colonnes fréquemment requêtées
-- ============================================================================

USE `your_database_name`;  -- REMPLACER par le nom de votre base

-- ============================================================================
-- INDEX SUR LA TABLE user
-- ============================================================================

-- Index sur email (normalement déjà unique, mais on s'assure)
-- Si l'index existe déjà, MySQL ignorera cette commande
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email ON user(email);

-- ============================================================================
-- INDEX SUR LA TABLE message
-- ============================================================================

-- Index composite pour requêtes sender->receiver
-- Utilisé par: GET /messages?userId=X
CREATE INDEX IF NOT EXISTS idx_message_sender_receiver 
ON message(sender_id, receiver_id, created_at DESC);

-- Index pour requêtes par receiver (messages reçus)
-- Utilisé par: GET /messages/new, GET /messages/unread-count
CREATE INDEX IF NOT EXISTS idx_message_receiver_created 
ON message(receiver_id, created_at DESC);

-- Index pour tri par date de création
CREATE INDEX IF NOT EXISTS idx_message_created_at 
ON message(created_at DESC);

-- Index pour recherche bidirectionnelle efficace
CREATE INDEX IF NOT EXISTS idx_message_sender_created 
ON message(sender_id, created_at DESC);

-- ============================================================================
-- INDEX SUR LA TABLE friends
-- ============================================================================

-- Index composite sender + receiver
-- Utilisé par: POST /friends/request (check existence)
CREATE INDEX IF NOT EXISTS idx_friends_sender_receiver 
ON friends(sender_id, receiver_id);

-- Index pour requêtes par receiver + status
-- Utilisé par: GET /friends/requests (pending requests)
CREATE INDEX IF NOT EXISTS idx_friends_receiver_status 
ON friends(receiver_id, status, created_at DESC);

-- Index pour requêtes par sender + status
-- Utilisé par: GET /friends (accepted friends)
CREATE INDEX IF NOT EXISTS idx_friends_sender_status 
ON friends(sender_id, status, updated_at DESC);

-- Index global sur status
CREATE INDEX IF NOT EXISTS idx_friends_status 
ON friends(status);

-- Index pour tri par date de mise à jour
CREATE INDEX IF NOT EXISTS idx_friends_updated_at 
ON friends(updated_at DESC);

-- ============================================================================
-- ANALYSE DES TABLES POUR OPTIMISER LE QUERY PLANNER
-- ============================================================================

ANALYZE TABLE user;
ANALYZE TABLE message;
ANALYZE TABLE friends;

-- ============================================================================
-- VÉRIFICATION DES INDEX CRÉÉS
-- ============================================================================

-- Afficher les index sur user
SHOW INDEX FROM user;

-- Afficher les index sur message
SHOW INDEX FROM message;

-- Afficher les index sur friends
SHOW INDEX FROM friends;

-- ============================================================================
-- STATISTIQUES (optionnel - pour debug)
-- ============================================================================

-- SELECT 
--   TABLE_NAME,
--   INDEX_NAME,
--   SEQ_IN_INDEX,
--   COLUMN_NAME,
--   CARDINALITY,
--   INDEX_TYPE
-- FROM information_schema.STATISTICS
-- WHERE TABLE_SCHEMA = DATABASE()
--   AND TABLE_NAME IN ('user', 'message', 'friends')
-- ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
