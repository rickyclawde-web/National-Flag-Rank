import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";
import {
  states, teams, submissions, users, ballotWindows, ballots, ballotRankings, historicalRankings,
  type State, type Team, type Submission, type User, type BallotWindow, type Ballot, type BallotRanking, type HistoricalRanking,
  type InsertState, type InsertTeam, type InsertSubmission, type InsertUser,
  type InsertBallotWindow, type InsertBallot, type InsertBallotRanking, type InsertHistoricalRanking,
  STATES, AGE_GROUPS, GENDERS, POINTS_MAP,
} from "@shared/schema";
import { hashPassword } from "./auth";

export interface IStorage {
  // States
  getStates(): Promise<State[]>;
  getStateBySlug(slug: string): Promise<State | undefined>;

  // Teams
  getTeams(stateId?: number): Promise<Team[]>;
  getTeamById(id: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;

  // Submissions
  getSubmissions(stateId?: number, status?: string): Promise<(Submission & { team: Team })[]>;
  createSubmission(submission: Omit<InsertSubmission, 'teamId'>, teamData: InsertTeam): Promise<Submission>;
  updateSubmissionStatus(id: number, status: string, deletedBy?: number, reason?: string): Promise<Submission>;

  // Users
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getCoachesByState(stateId: number): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;

  // Ballot Windows
  getBallotWindows(stateId?: number): Promise<BallotWindow[]>;
  getBallotWindowById(id: number): Promise<BallotWindow | undefined>;
  getCurrentWindow(stateId: number, gender: string, ageGroup: string): Promise<BallotWindow | undefined>;
  createBallotWindow(window: InsertBallotWindow): Promise<BallotWindow>;
  updateBallotWindow(id: number, updates: Partial<InsertBallotWindow>): Promise<BallotWindow>;

  // Ballots
  getBallotByCoachAndWindow(coachId: number, windowId: number): Promise<Ballot | undefined>;
  submitBallot(ballot: InsertBallot, rankings: { teamId: number; rank: number }[]): Promise<Ballot>;
  getBallotCount(windowId: number): Promise<number>;
  getBallotRankings(ballotId: number): Promise<BallotRanking[]>;

  // Historical Rankings
  getHistoricalRankings(stateId: number, gender: string, ageGroup: string): Promise<(HistoricalRanking & { team: Team; window: BallotWindow })[]>;
  publishRankings(windowId: number): Promise<void>;

  // Seed
  seed(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getStates(): Promise<State[]> {
    return db.select().from(states).orderBy(asc(states.name));
  }

  async getStateBySlug(slug: string): Promise<State | undefined> {
    const [state] = await db.select().from(states).where(eq(states.slug, slug));
    return state;
  }

  async getTeams(stateId?: number): Promise<Team[]> {
    if (stateId) {
      return db.select().from(teams).where(eq(teams.stateId, stateId));
    }
    return db.select().from(teams);
  }

  async getTeamById(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [created] = await db.insert(teams).values(team).returning();
    return created;
  }

  async getSubmissions(stateId?: number, status?: string): Promise<(Submission & { team: Team })[]> {
    const rows = await db.select({
      submission: submissions,
      team: teams,
    }).from(submissions)
      .innerJoin(teams, eq(submissions.teamId, teams.id))
      .where(
        stateId && status
          ? and(eq(teams.stateId, stateId), eq(submissions.status, status as any))
          : stateId
          ? eq(teams.stateId, stateId)
          : status
          ? eq(submissions.status, status as any)
          : undefined
      )
      .orderBy(desc(submissions.createdAt));

    return rows.map(r => ({ ...r.submission, team: r.team }));
  }

  async createSubmission(submission: Omit<InsertSubmission, 'teamId'>, teamData: InsertTeam): Promise<Submission> {
    const team = await this.createTeam(teamData);
    const [created] = await db.insert(submissions).values({ ...submission, teamId: team.id } as InsertSubmission).returning();
    return created;
  }

  async updateSubmissionStatus(id: number, status: string, deletedBy?: number, reason?: string): Promise<Submission> {
    const [updated] = await db.update(submissions)
      .set({ status: status as any, deletedBy: deletedBy ?? null, deletedReason: reason ?? null })
      .where(eq(submissions.id, id))
      .returning();
    return updated;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getCoachesByState(stateId: number): Promise<User[]> {
    return db.select().from(users).where(and(eq(users.stateId, stateId), eq(users.isActive, true)));
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated;
  }

  async getBallotWindows(stateId?: number): Promise<BallotWindow[]> {
    if (stateId) {
      return db.select().from(ballotWindows).where(eq(ballotWindows.stateId, stateId)).orderBy(desc(ballotWindows.year), desc(ballotWindows.month));
    }
    return db.select().from(ballotWindows).orderBy(desc(ballotWindows.year), desc(ballotWindows.month));
  }

  async getBallotWindowById(id: number): Promise<BallotWindow | undefined> {
    const [window] = await db.select().from(ballotWindows).where(eq(ballotWindows.id, id));
    return window;
  }

  async getCurrentWindow(stateId: number, gender: string, ageGroup: string): Promise<BallotWindow | undefined> {
    const [window] = await db.select().from(ballotWindows)
      .where(and(
        eq(ballotWindows.stateId, stateId),
        eq(ballotWindows.gender, gender as any),
        eq(ballotWindows.ageGroup, ageGroup as any),
        eq(ballotWindows.status, "open"),
      ))
      .orderBy(desc(ballotWindows.year), desc(ballotWindows.month))
      .limit(1);
    return window;
  }

  async createBallotWindow(window: InsertBallotWindow): Promise<BallotWindow> {
    const [created] = await db.insert(ballotWindows).values(window).returning();
    return created;
  }

  async updateBallotWindow(id: number, updates: Partial<InsertBallotWindow>): Promise<BallotWindow> {
    const [updated] = await db.update(ballotWindows).set(updates as any).where(eq(ballotWindows.id, id)).returning();
    return updated;
  }

  async getBallotByCoachAndWindow(coachId: number, windowId: number): Promise<Ballot | undefined> {
    const [ballot] = await db.select().from(ballots)
      .where(and(eq(ballots.coachId, coachId), eq(ballots.windowId, windowId)));
    return ballot;
  }

  async submitBallot(ballot: InsertBallot, rankings: { teamId: number; rank: number }[]): Promise<Ballot> {
    const [created] = await db.insert(ballots).values(ballot).returning();
    const rankingRows = rankings.map(r => ({
      ballotId: created.id,
      teamId: r.teamId,
      rank: r.rank,
      points: POINTS_MAP[r.rank] ?? 0,
    }));
    await db.insert(ballotRankings).values(rankingRows);
    return created;
  }

  async getBallotCount(windowId: number): Promise<number> {
    const rows = await db.select().from(ballots).where(eq(ballots.windowId, windowId));
    return rows.length;
  }

  async getBallotRankings(ballotId: number): Promise<BallotRanking[]> {
    return db.select().from(ballotRankings).where(eq(ballotRankings.ballotId, ballotId));
  }

  async getHistoricalRankings(stateId: number, gender: string, ageGroup: string): Promise<(HistoricalRanking & { team: Team; window: BallotWindow })[]> {
    const rows = await db.select({
      ranking: historicalRankings,
      team: teams,
      window: ballotWindows,
    })
      .from(historicalRankings)
      .innerJoin(teams, eq(historicalRankings.teamId, teams.id))
      .innerJoin(ballotWindows, eq(historicalRankings.windowId, ballotWindows.id))
      .where(and(
        eq(ballotWindows.stateId, stateId),
        eq(ballotWindows.gender, gender as any),
        eq(ballotWindows.ageGroup, ageGroup as any),
        eq(ballotWindows.status, "published"),
      ))
      .orderBy(desc(ballotWindows.year), desc(ballotWindows.month), asc(historicalRankings.rank));

    return rows.map(r => ({ ...r.ranking, team: r.team, window: r.window }));
  }

  async publishRankings(windowId: number): Promise<void> {
    const allBallots = await db.select().from(ballots).where(eq(ballots.windowId, windowId));
    const tallies: Record<number, number> = {};

    for (const ballot of allBallots) {
      const rankings = await this.getBallotRankings(ballot.id);
      for (const r of rankings) {
        tallies[r.teamId] = (tallies[r.teamId] ?? 0) + r.points;
      }
    }

    const sorted = Object.entries(tallies)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    const rankingRows = sorted.map(([teamId, total], idx) => ({
      windowId,
      teamId: parseInt(teamId),
      totalPoints: total,
      rank: idx + 1,
    }));

    if (rankingRows.length > 0) {
      await db.insert(historicalRankings).values(rankingRows);
    }
    await this.updateBallotWindow(windowId, { status: "published" });
  }

  async seed(): Promise<void> {
    const existingStates = await this.getStates();
    if (existingStates.length > 0) return;

    for (const s of STATES) {
      await db.insert(states).values(s);
    }

    const [txState] = await db.select().from(states).where(eq(states.slug, "TX"));
    const [flState] = await db.select().from(states).where(eq(states.slug, "FL"));
    const [caState] = await db.select().from(states).where(eq(states.slug, "CA"));

    const seedTeams: InsertTeam[] = [
      { name: "Houston Heat", city: "Houston", clubName: "Houston FC", gender: "boys", ageGroup: "12U", stateId: txState.id, contactEmail: "coach@houstonheat.com" },
      { name: "Dallas Fury", city: "Dallas", clubName: "Dallas FC", gender: "boys", ageGroup: "12U", stateId: txState.id, contactEmail: "coach@dallasfury.com" },
      { name: "Austin Aces", city: "Austin", clubName: "Austin FC", gender: "boys", ageGroup: "12U", stateId: txState.id, contactEmail: "coach@austinaces.com" },
      { name: "San Antonio Storm", city: "San Antonio", clubName: "SA Flag", gender: "boys", ageGroup: "12U", stateId: txState.id, contactEmail: "info@sastorm.com" },
      { name: "Lubbock Lightning", city: "Lubbock", clubName: "LBK Sports", gender: "boys", ageGroup: "12U", stateId: txState.id },
      { name: "Houston Heat Girls", city: "Houston", clubName: "Houston FC", gender: "girls", ageGroup: "12U", stateId: txState.id, contactEmail: "girls@houstonheat.com" },
      { name: "Dallas Diamonds", city: "Dallas", clubName: "Dallas FC", gender: "girls", ageGroup: "12U", stateId: txState.id },
      { name: "Austin Angels", city: "Austin", clubName: "Austin FC", gender: "girls", ageGroup: "12U", stateId: txState.id },
      { name: "Miami Marlins", city: "Miami", clubName: "South FL Flag", gender: "boys", ageGroup: "10U", stateId: flState.id },
      { name: "Orlando Force", city: "Orlando", clubName: "Central FL FC", gender: "boys", ageGroup: "10U", stateId: flState.id },
      { name: "Tampa Titans", city: "Tampa", clubName: "Tampa Bay Flag", gender: "boys", ageGroup: "10U", stateId: flState.id },
      { name: "LA Lions", city: "Los Angeles", clubName: "SoCal Flag", gender: "boys", ageGroup: "14U", stateId: caState.id },
      { name: "SF Sharks", city: "San Francisco", clubName: "NorCal FC", gender: "boys", ageGroup: "14U", stateId: caState.id },
    ];

    const createdTeams: Team[] = [];
    for (const t of seedTeams) {
      const team = await this.createTeam(t);
      createdTeams.push(team);
    }

    const hashedPass = await hashPassword("password123");

    const seedUsers: InsertUser[] = [
      { name: "Super Admin", email: "admin@flagrankings.com", password: hashedPass, role: "admin", stateId: null, coachRole: null },
      { name: "John Director", email: "director.tx@flagrankings.com", password: hashedPass, role: "director", stateId: txState.id, coachRole: null },
      { name: "Coach Mike", email: "coach1.tx@flagrankings.com", password: hashedPass, role: "coach", stateId: txState.id, coachRole: "primary" },
      { name: "Coach Sarah", email: "coach2.tx@flagrankings.com", password: hashedPass, role: "coach", stateId: txState.id, coachRole: "primary" },
      { name: "Coach Alternate", email: "alt1.tx@flagrankings.com", password: hashedPass, role: "coach", stateId: txState.id, coachRole: "alternate" },
    ];

    for (const u of seedUsers) {
      await this.createUser(u);
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const deadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    for (const gender of GENDERS) {
      for (const ageGroup of AGE_GROUPS) {
        await db.insert(ballotWindows).values({
          stateId: txState.id,
          gender,
          ageGroup,
          month,
          year,
          status: "open",
          deadlineAt: deadline,
        });
      }
    }

    for (const ageGroup of AGE_GROUPS) {
      await db.insert(ballotWindows).values({
        stateId: flState.id,
        gender: "boys",
        ageGroup,
        month,
        year,
        status: "open",
        deadlineAt: deadline,
      });
    }

    const txTeams = createdTeams.filter(t => t.stateId === txState.id && t.gender === "boys" && t.ageGroup === "12U");
    const [openWindow] = await db.select().from(ballotWindows)
      .where(and(eq(ballotWindows.stateId, txState.id), eq(ballotWindows.gender, "boys"), eq(ballotWindows.ageGroup, "12U")));

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const [prevWindow] = await db.insert(ballotWindows).values({
      stateId: txState.id,
      gender: "boys",
      ageGroup: "12U",
      month: prevMonth,
      year: prevYear,
      status: "published",
      deadlineAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
    }).returning();

    if (txTeams.length >= 3 && prevWindow) {
      const rankingData = [
        { windowId: prevWindow.id, teamId: txTeams[0].id, totalPoints: 142, rank: 1 },
        { windowId: prevWindow.id, teamId: txTeams[1].id, totalPoints: 128, rank: 2 },
        { windowId: prevWindow.id, teamId: txTeams[2].id, totalPoints: 115, rank: 3 },
      ];
      if (txTeams[3]) rankingData.push({ windowId: prevWindow.id, teamId: txTeams[3].id, totalPoints: 98, rank: 4 });
      if (txTeams[4]) rankingData.push({ windowId: prevWindow.id, teamId: txTeams[4].id, totalPoints: 82, rank: 5 });
      await db.insert(historicalRankings).values(rankingData);
    }

    const txBoys12Subs = txTeams.slice(0, 4);
    for (const team of txBoys12Subs) {
      await db.insert(submissions).values({
        teamId: team.id,
        submitterName: `${team.name} Coordinator`,
        submitterEmail: team.contactEmail ?? `contact@${team.name.toLowerCase().replace(/\s/g, "")}.com`,
        submitterPhone: "555-0100",
        notes: `${team.name} is ready to compete this season!`,
        status: "pending",
      });
    }
  }
}

export const storage = new DatabaseStorage();
