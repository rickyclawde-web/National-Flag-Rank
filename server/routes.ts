import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { verifyPassword, hashPassword } from "./auth";
import { z } from "zod";
import { insertSubmissionSchema, insertTeamSchema } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId: number;
    userRole: string;
    userStateId: number | null;
  }
}

function requireAuth(roles?: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (roles && !roles.includes(req.session.userRole)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const user = await storage.getUserByEmail(email);
    if (!user || !await verifyPassword(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (!user.isActive) return res.status(403).json({ error: "Account disabled" });

    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.userStateId = user.stateId;

    const { password: _, ...safeUser } = user;
    return res.json({ user: safeUser });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const user = await storage.getUserById(req.session.userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    const { password: _, ...safeUser } = user;
    return res.json({ user: safeUser });
  });

  // States
  app.get("/api/states", async (_req, res) => {
    const stateList = await storage.getStates();
    res.json(stateList);
  });

  // Public rankings
  app.get("/api/rankings", async (req, res) => {
    const { state, gender, ageGroup } = req.query;
    if (!state || !gender || !ageGroup) {
      return res.status(400).json({ error: "state, gender, and ageGroup required" });
    }
    const stateRecord = await storage.getStateBySlug(state as string);
    if (!stateRecord) return res.status(404).json({ error: "State not found" });

    const rankings = await storage.getHistoricalRankings(stateRecord.id, gender as string, ageGroup as string);
    res.json(rankings);
  });

  // Public submission
  app.post("/api/submissions", async (req, res) => {
    const submissionSchema = z.object({
      submitterName: z.string().min(2),
      submitterEmail: z.string().email(),
      submitterPhone: z.string().optional(),
      notes: z.string().optional(),
      teamName: z.string().min(2),
      city: z.string().min(2),
      clubName: z.string().optional(),
      gender: z.enum(["boys", "girls"]),
      ageGroup: z.enum(["8U", "10U", "12U", "14U"]),
      stateSlug: z.string(),
    });

    const parse = submissionSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors });

    const { teamName, city, clubName, gender, ageGroup, stateSlug, submitterName, submitterEmail, submitterPhone, notes } = parse.data;
    const state = await storage.getStateBySlug(stateSlug);
    if (!state) return res.status(404).json({ error: "State not found" });

    const submission = await storage.createSubmission(
      { submitterName, submitterEmail, submitterPhone, notes },
      { name: teamName, city, clubName, gender, ageGroup, stateId: state.id }
    );
    res.status(201).json(submission);
  });

  // Coach endpoints
  app.get("/api/coach/pool", requireAuth(["coach", "director", "admin"]), async (req, res) => {
    const stateId = req.session.userStateId;
    if (!stateId) return res.status(400).json({ error: "No state assigned" });
    const submissions = await storage.getSubmissions(stateId, "pending");
    res.json(submissions);
  });

  app.patch("/api/coach/submissions/:id", requireAuth(["coach", "director", "admin"]), async (req, res) => {
    const id = parseInt(req.params.id);
    const { status, reason } = req.body;
    if (!["pending", "approved", "deleted"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const updated = await storage.updateSubmissionStatus(id, status, req.session.userId, reason);
    res.json(updated);
  });

  app.get("/api/coach/windows", requireAuth(["coach", "director", "admin"]), async (req, res) => {
    const stateId = req.session.userStateId;
    if (!stateId) return res.status(400).json({ error: "No state assigned" });
    const windows = await storage.getBallotWindows(stateId);
    res.json(windows);
  });

  app.get("/api/coach/windows/current", requireAuth(["coach", "director", "admin"]), async (req, res) => {
    const { gender, ageGroup } = req.query;
    const stateId = req.session.userStateId;
    if (!stateId || !gender || !ageGroup) return res.status(400).json({ error: "Missing params" });
    const window = await storage.getCurrentWindow(stateId, gender as string, ageGroup as string);
    if (!window) return res.status(404).json({ error: "No open ballot window" });
    const count = await storage.getBallotCount(window.id);
    res.json({ ...window, ballotCount: count });
  });

  app.post("/api/coach/ballots", requireAuth(["coach", "director", "admin"]), async (req, res) => {
    const schema = z.object({
      windowId: z.number(),
      rankings: z.array(z.object({ teamId: z.number(), rank: z.number().min(1).max(10) })).min(1).max(10),
    });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors });

    const existing = await storage.getBallotByCoachAndWindow(req.session.userId!, parse.data.windowId);
    if (existing) return res.status(409).json({ error: "Ballot already submitted" });

    const ballot = await storage.submitBallot(
      { windowId: parse.data.windowId, coachId: req.session.userId! },
      parse.data.rankings
    );
    res.status(201).json(ballot);
  });

  app.get("/api/coach/ballot-status", requireAuth(["coach", "director", "admin"]), async (req, res) => {
    const { windowId } = req.query;
    if (!windowId) return res.status(400).json({ error: "windowId required" });
    const ballot = await storage.getBallotByCoachAndWindow(req.session.userId!, parseInt(windowId as string));
    res.json({ submitted: !!ballot, ballot });
  });

  // Director endpoints
  app.get("/api/director/dashboard", requireAuth(["director", "admin"]), async (req, res) => {
    const stateId = req.session.userStateId ?? (req.query.stateId ? parseInt(req.query.stateId as string) : undefined);
    if (!stateId) return res.status(400).json({ error: "No state" });

    const [coaches, windows, allSubmissions] = await Promise.all([
      storage.getCoachesByState(stateId),
      storage.getBallotWindows(stateId),
      storage.getSubmissions(stateId),
    ]);

    const windowsWithCounts = await Promise.all(windows.map(async (w) => ({
      ...w,
      ballotCount: await storage.getBallotCount(w.id),
    })));

    res.json({ coaches: coaches.map(c => { const { password: _, ...safe } = c; return safe; }), windows: windowsWithCounts, submissions: allSubmissions });
  });

  app.patch("/api/director/windows/:id/publish", requireAuth(["director", "admin"]), async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.publishRankings(id);
    res.json({ success: true });
  });

  app.post("/api/director/windows", requireAuth(["director", "admin"]), async (req, res) => {
    const schema = z.object({
      stateId: z.number(),
      gender: z.enum(["boys", "girls"]),
      ageGroup: z.enum(["8U", "10U", "12U", "14U"]),
      month: z.number(),
      year: z.number(),
      deadlineAt: z.string().optional(),
    });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors });
    const window = await storage.createBallotWindow({
      ...parse.data,
      deadlineAt: parse.data.deadlineAt ? new Date(parse.data.deadlineAt) : undefined,
    } as any);
    res.status(201).json(window);
  });

  // Admin endpoints
  app.get("/api/admin/users", requireAuth(["admin"]), async (req, res) => {
    const stateId = req.query.stateId ? parseInt(req.query.stateId as string) : undefined;
    if (stateId) {
      const coaches = await storage.getCoachesByState(stateId);
      return res.json(coaches.map(c => { const { password: _, ...s } = c; return s; }));
    }
    const allStates = await storage.getStates();
    const allCoaches = await Promise.all(allStates.map(s => storage.getCoachesByState(s.id)));
    const flat = allCoaches.flat();
    res.json(flat.map(c => { const { password: _, ...s } = c; return s; }));
  });

  app.post("/api/admin/users", requireAuth(["admin"]), async (req, res) => {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(["coach", "director", "admin"]),
      stateId: z.number().nullable(),
      coachRole: z.enum(["primary", "alternate"]).nullable(),
    });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors });

    const hashed = await hashPassword(parse.data.password);
    const user = await storage.createUser({ ...parse.data, password: hashed } as any);
    const { password: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  });

  app.get("/api/admin/windows", requireAuth(["admin"]), async (_req, res) => {
    const windows = await storage.getBallotWindows();
    const withCounts = await Promise.all(windows.map(async w => ({
      ...w,
      ballotCount: await storage.getBallotCount(w.id),
    })));
    res.json(withCounts);
  });

  app.get("/api/admin/submissions", requireAuth(["admin"]), async (req, res) => {
    const { status } = req.query;
    const subs = await storage.getSubmissions(undefined, status as string);
    res.json(subs);
  });

  return httpServer;
}
