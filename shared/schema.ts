import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["public", "coach", "director", "admin"]);
export const submissionStatusEnum = pgEnum("submission_status", ["pending", "approved", "deleted"]);
export const ballotWindowStatusEnum = pgEnum("ballot_window_status", ["open", "closed", "published"]);
export const coachRoleEnum = pgEnum("coach_role", ["primary", "alternate"]);
export const genderEnum = pgEnum("gender", ["boys", "girls"]);
export const ageGroupEnum = pgEnum("age_group", ["8U", "10U", "12U", "14U"]);

export const states = pgTable("states", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 10 }).notNull().unique(),
});

export const teams = pgTable("teams", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  clubName: text("club_name"),
  gender: genderEnum("gender").notNull(),
  ageGroup: ageGroupEnum("age_group").notNull(),
  stateId: integer("state_id").notNull().references(() => states.id),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
});

export const submissions = pgTable("submissions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  submitterName: text("submitter_name").notNull(),
  submitterEmail: text("submitter_email").notNull(),
  submitterPhone: text("submitter_phone"),
  notes: text("notes"),
  status: submissionStatusEnum("status").notNull().default("pending"),
  deletedBy: integer("deleted_by"),
  deletedReason: text("deleted_reason"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("coach"),
  stateId: integer("state_id").references(() => states.id),
  coachRole: coachRoleEnum("coach_role"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const ballotWindows = pgTable("ballot_windows", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  stateId: integer("state_id").notNull().references(() => states.id),
  gender: genderEnum("gender").notNull(),
  ageGroup: ageGroupEnum("age_group").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  status: ballotWindowStatusEnum("status").notNull().default("open"),
  deadlineAt: timestamp("deadline_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const ballots = pgTable("ballots", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  windowId: integer("window_id").notNull().references(() => ballotWindows.id),
  coachId: integer("coach_id").notNull().references(() => users.id),
  submittedAt: timestamp("submitted_at").notNull().default(sql`now()`),
});

export const ballotRankings = pgTable("ballot_rankings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ballotId: integer("ballot_id").notNull().references(() => ballots.id),
  teamId: integer("team_id").notNull().references(() => teams.id),
  rank: integer("rank").notNull(),
  points: integer("points").notNull(),
});

export const historicalRankings = pgTable("historical_rankings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  windowId: integer("window_id").notNull().references(() => ballotWindows.id),
  teamId: integer("team_id").notNull().references(() => teams.id),
  totalPoints: integer("total_points").notNull(),
  rank: integer("rank").notNull(),
  publishedAt: timestamp("published_at").notNull().default(sql`now()`),
});

export const insertStateSchema = createInsertSchema(states);
export const insertTeamSchema = createInsertSchema(teams);
export const insertSubmissionSchema = createInsertSchema(submissions);
export const insertUserSchema = createInsertSchema(users);
export const insertBallotWindowSchema = createInsertSchema(ballotWindows);
export const insertBallotSchema = createInsertSchema(ballots);
export const insertBallotRankingSchema = createInsertSchema(ballotRankings);
export const insertHistoricalRankingSchema = createInsertSchema(historicalRankings);

export type State = typeof states.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type User = typeof users.$inferSelect;
export type BallotWindow = typeof ballotWindows.$inferSelect;
export type Ballot = typeof ballots.$inferSelect;
export type BallotRanking = typeof ballotRankings.$inferSelect;
export type HistoricalRanking = typeof historicalRankings.$inferSelect;

export type InsertState = typeof states.$inferInsert;
export type InsertTeam = typeof teams.$inferInsert;
export type InsertSubmission = typeof submissions.$inferInsert;
export type InsertUser = typeof users.$inferInsert;
export type InsertBallotWindow = typeof ballotWindows.$inferInsert;
export type InsertBallot = typeof ballots.$inferInsert;
export type InsertBallotRanking = typeof ballotRankings.$inferInsert;
export type InsertHistoricalRanking = typeof historicalRankings.$inferInsert;

export const STATES = [
  { name: "Texas", slug: "TX" },
  { name: "Florida", slug: "FL" },
  { name: "California", slug: "CA" },
  { name: "New Mexico", slug: "NM" },
  { name: "Oklahoma", slug: "OK" },
  { name: "Louisiana", slug: "LA" },
  { name: "Pennsylvania", slug: "PA" },
  { name: "New York", slug: "NY" },
  { name: "Kansas", slug: "KS" },
  { name: "Colorado", slug: "CO" },
  { name: "Washington", slug: "WA" },
  { name: "Oregon", slug: "OR" },
];

export const AGE_GROUPS = ["8U", "10U", "12U", "14U"] as const;
export const GENDERS = ["boys", "girls"] as const;

export const POINTS_MAP: Record<number, number> = {
  1: 10, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1
};
