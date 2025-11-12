-- ============================================================================
-- TABLE: prekey_bundles
-- Purpose: Store public encryption keys for End-to-End Encryption (E2EE)
--          using Double Ratchet / Signal Protocol
-- ============================================================================
-- SECURITY NOTE: This table contains ONLY public keys.
--                Private keys NEVER leave the client device.
--                The server cannot decrypt any messages.
-- ============================================================================

CREATE TABLE IF NOT EXISTS prekey_bundles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- User who owns this key bundle
  user_id INT NOT NULL,
  
  -- Long-term public identity key (base64 encoded)
  identity_key TEXT NOT NULL,
  
  -- Signed prekey components
  signed_prekey_id INT NOT NULL,
  signed_prekey_public TEXT NOT NULL,
  signed_prekey_signature TEXT NOT NULL,
  
  -- One-time prekeys (JSON array of base64 encoded keys)
  -- These are consumed one-by-one for forward secrecy
  one_time_prekeys LONGTEXT DEFAULT NULL,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE KEY unique_user_bundle (user_id),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_updated_at (updated_at)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- EXPLANATION OF FIELDS
-- ============================================================================
--
-- identity_key:
--   Long-term public key that identifies the user's device.
--   Used to verify the identity of the sender/receiver.
--
-- signed_prekey_id:
--   ID/index of the signed prekey (rotated periodically).
--
-- signed_prekey_public:
--   Public part of the signed prekey.
--
-- signed_prekey_signature:
--   Signature of the signed prekey, signed by the identity key.
--   Prevents man-in-the-middle attacks.
--
-- one_time_prekeys:
--   Array of ephemeral keys that are used once and deleted.
--   Provides forward secrecy - even if long-term keys are compromised,
--   past messages cannot be decrypted.
--
-- ============================================================================

-- Optional: Add comment to table
ALTER TABLE prekey_bundles 
COMMENT = 'Public key bundles for E2EE Double Ratchet protocol';
