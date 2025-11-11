-- Table pour les demandes d'amis
CREATE TABLE IF NOT EXISTS friend_request (
  id INT AUTO_INCREMENT PRIMARY KEY,
  requester_id INT NOT NULL,
  receiver_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES user(id) ON DELETE CASCADE,
  UNIQUE KEY unique_friendship (requester_id, receiver_id)
);

-- Index pour améliorer les performances
CREATE INDEX idx_receiver_status ON friend_request(receiver_id, status);
CREATE INDEX idx_requester_status ON friend_request(requester_id, status);
