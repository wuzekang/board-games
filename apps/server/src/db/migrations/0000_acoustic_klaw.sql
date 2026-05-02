CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`game_type` text DEFAULT 'draughts_100' NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`current_player` text DEFAULT 'human' NOT NULL,
	`board_state` text NOT NULL,
	`human_color` text DEFAULT 'dark' NOT NULL,
	`ai_difficulty` text DEFAULT 'medium' NOT NULL,
	`winner` text,
	`move_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `moves` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` text NOT NULL,
	`move_number` integer NOT NULL,
	`player` text NOT NULL,
	`from_pos` text NOT NULL,
	`to_pos` text NOT NULL,
	`move_type` text NOT NULL,
	`captured_pieces` text DEFAULT '[]' NOT NULL,
	`capture_path` text,
	`promoted` integer DEFAULT false NOT NULL,
	`board_state_after` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
