CREATE TABLE `encrypted_device_backups` (
	`installation_hash` varchar(64) NOT NULL,
	`envelope` json NOT NULL,
	`revision` int unsigned NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `encrypted_device_backups_installation_hash` PRIMARY KEY(`installation_hash`)
);
