-- !!!!!!!!!!!!!!!
-- EDIT ALL TABLES NAMES FOR PRODUCTION
-- !!!!!!!!!!!!!!!

--
-- Database: `notida`
--

-- --------------------------------------------------------

--
-- Table structure for table `notes`
--

CREATE TABLE `notes` (
  `id` CHAR(36) NOT NULL,
  `title` text NOT NULL,
  `content` longtext,
  `historic` longtext,
  `color` varchar(63) NOT NULL DEFAULT 'bg-default',
  `creationDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updateDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `hiddenNote` tinyint NOT NULL DEFAULT '0',
  `pinnedNote` tinyint NOT NULL DEFAULT '0',
  `folder` varchar(63) DEFAULT NULL,
  `category` varchar(63) DEFAULT NULL,
  `link` varchar(63) DEFAULT NULL,
  `reminder` varchar(63) DEFAULT NULL,
  `userId` CHAR(36) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` CHAR(36) NOT NULL,
  `name` varchar(63) NOT NULL,
  `psswd` varchar(255) NOT NULL,
  `creationDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lastLogin` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `mfa` tinyint NOT NULL DEFAULT '0',
  `mfaSecret` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `notes`
--
ALTER TABLE `notes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `link` (`link`),
  ADD KEY (`userId`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `notes`
--
ALTER TABLE `notes`
  ADD CONSTRAINT `notes_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;
