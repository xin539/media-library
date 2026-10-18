-- Schema only: no users, credentials or business data.
CREATE TABLE `users` (
  `id` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `openid` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `nickname` longtext COLLATE utf8mb4_bin NOT NULL,
  `avatar_url` longtext COLLATE utf8mb4_bin,
  `created_at` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `updated_at` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `username` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `password_hash` longtext COLLATE utf8mb4_bin,
  `role` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT 'designer',
  PRIMARY KEY (`id`),
  UNIQUE KEY `openid` (`openid`),
  UNIQUE KEY `username` (`username`),
  KEY `created_at` (`created_at`),
  KEY `updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `stores` (
  `id` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `name` longtext COLLATE utf8mb4_bin NOT NULL,
  `avatar_path` longtext COLLATE utf8mb4_bin,
  `country` longtext COLLATE utf8mb4_bin NOT NULL,
  `category` longtext COLLATE utf8mb4_bin NOT NULL,
  `created_at` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `updated_at` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `deleted_at` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `created_at` (`created_at`),
  KEY `updated_at` (`updated_at`),
  KEY `deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `sessions` (
  `token` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `user_id` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `expires_at` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`token`),
  KEY `user_id` (`user_id`),
  KEY `expires_at` (`expires_at`),
  CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `operation_logs` (
  `id` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `user_id` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `action` longtext COLLATE utf8mb4_bin NOT NULL,
  `target_type` longtext COLLATE utf8mb4_bin NOT NULL,
  `target_id` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `details` longtext COLLATE utf8mb4_bin,
  `created_at` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `created_at` (`created_at`),
  CONSTRAINT `operation_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `assets` (
  `id` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `store_id` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `name` longtext COLLATE utf8mb4_bin NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `size` bigint NOT NULL,
  `file_path` longtext COLLATE utf8mb4_bin NOT NULL,
  `created_at` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `deleted_at` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `uploader_id` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `relative_path` longtext COLLATE utf8mb4_bin,
  PRIMARY KEY (`id`),
  KEY `store_id` (`store_id`),
  KEY `uploader_id` (`uploader_id`),
  KEY `created_at` (`created_at`),
  KEY `deleted_at` (`deleted_at`),
  CONSTRAINT `assets_ibfk_1` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `assets_ibfk_2` FOREIGN KEY (`uploader_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `assets_chk_1` CHECK ((`type` in (_utf8mb4'image',_utf8mb4'video')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `design_tasks` (
  `id` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `store_id` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `title` longtext COLLATE utf8mb4_bin NOT NULL,
  `description` longtext COLLATE utf8mb4_bin,
  `priority` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT 'normal',
  `status` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT 'available',
  `progress` bigint NOT NULL DEFAULT '0',
  `assignee_id` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `creator_id` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `deadline` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `updated_at` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `completed_at` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `product_code` longtext COLLATE utf8mb4_bin,
  `product_name` longtext COLLATE utf8mb4_bin,
  `product_image_url` longtext COLLATE utf8mb4_bin,
  `sku_text` longtext COLLATE utf8mb4_bin,
  `review_note` longtext COLLATE utf8mb4_bin,
  `submitted_at` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `reviewed_at` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `creator_id` (`creator_id`),
  KEY `assignee_id` (`assignee_id`),
  KEY `store_id` (`store_id`),
  KEY `created_at` (`created_at`),
  KEY `updated_at` (`updated_at`),
  KEY `completed_at` (`completed_at`),
  KEY `submitted_at` (`submitted_at`),
  KEY `reviewed_at` (`reviewed_at`),
  CONSTRAINT `design_tasks_ibfk_1` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `design_tasks_ibfk_2` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `design_tasks_ibfk_3` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `design_tasks_chk_1` CHECK ((`priority` in (_utf8mb4'normal',_utf8mb4'urgent'))),
  CONSTRAINT `design_tasks_chk_2` CHECK ((`status` in (_utf8mb4'available',_utf8mb4'in_progress',_utf8mb4'submitted',_utf8mb4'revision',_utf8mb4'completed',_utf8mb4'cancelled'))),
  CONSTRAINT `design_tasks_chk_3` CHECK ((`progress` between 0 and 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `task_files` (
  `id` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `store_id` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `name` longtext COLLATE utf8mb4_bin NOT NULL,
  `mime_type` longtext COLLATE utf8mb4_bin,
  `size` bigint NOT NULL,
  `file_path` longtext COLLATE utf8mb4_bin NOT NULL,
  `created_at` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `uploader_id` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `task_id` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `purpose` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT 'reference',
  `relative_path` longtext COLLATE utf8mb4_bin,
  `upload_batch` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `upload_label` longtext COLLATE utf8mb4_bin,
  PRIMARY KEY (`id`),
  KEY `uploader_id` (`uploader_id`),
  KEY `store_id` (`store_id`),
  KEY `task_id` (`task_id`),
  KEY `created_at` (`created_at`),
  CONSTRAINT `task_files_ibfk_1` FOREIGN KEY (`uploader_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `task_files_ibfk_2` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_files_ibfk_3` FOREIGN KEY (`task_id`) REFERENCES `design_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `app_settings` (
  `key` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `value` longtext COLLATE utf8mb4_bin,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

