-- Initialize database and import provided dump
CREATE DATABASE IF NOT EXISTS `Dashkey_test` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `Dashkey_test`;

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- Structure: doctrine_migration_versions
CREATE TABLE IF NOT EXISTS `doctrine_migration_versions` (
  `version` varchar(191) NOT NULL,
  `executed_at` datetime DEFAULT NULL,
  `execution_time` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

INSERT INTO `doctrine_migration_versions` (`version`, `executed_at`, `execution_time`) VALUES
('DoctrineMigrations\\Version20250212133616', '2025-02-12 13:36:31', 113),
('DoctrineMigrations\\Version20250212133940', '2025-02-12 13:39:42', 56),
('DoctrineMigrations\\Version20250219084507', '2025-02-19 08:45:14', 81),
('DoctrineMigrations\\Version20250224163450', '2025-02-24 16:34:53', 77),
('DoctrineMigrations\\Version20250227163259', NULL, NULL),
('DoctrineMigrations\\Version20250227170551', NULL, NULL),
('DoctrineMigrations\\Version20250227171133', NULL, NULL),
('DoctrineMigrations\\Version20250310140125', '2025-03-10 14:01:35', 124),
('DoctrineMigrations\\Version20250310140634', '2025-03-10 14:08:36', 84),
('DoctrineMigrations\\Version20250324162346', NULL, NULL),
('DoctrineMigrations\\Version20250325075859', NULL, NULL)
ON DUPLICATE KEY UPDATE executed_at=VALUES(executed_at), execution_time=VALUES(execution_time);

-- Structure: user
CREATE TABLE IF NOT EXISTS `user` (
  `id` int(11) NOT NULL,
  `email` varchar(180) NOT NULL,
  `roles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`roles`)),
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_8D93D649E7927C74` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `user` (`id`, `email`, `roles`, `password`) VALUES
(0, 'user@pluvio.com', '["ROLE_USER"]', '$2y$13$AlclI8u.3AR6857n85W0WON4PpaqVSd0Cc.9YKnPqVcGaYpdmVPAe'),
(1, 'admin@pluvio.com', '["ROLE_ADMIN"]', '$2y$10$dummyhashadmin')
ON DUPLICATE KEY UPDATE email=VALUES(email), roles=VALUES(roles), password=VALUES(password);

-- Structure: message
CREATE TABLE IF NOT EXISTS `message` (
  `id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `receiver_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_sender` (`sender_id`),
  KEY `fk_receiver` (`receiver_id`),
  CONSTRAINT `fk_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sender` FOREIGN KEY (`sender_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `message`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

