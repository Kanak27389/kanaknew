import express, { Request, Response } from 'express';
import { INITIAL_BRANCHES } from '../src/data/branchesData.js';
import { INITIAL_STUDENTS } from '../src/data/studentsData.js';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    platform: 'vercel-serverless',
    timestamp: new Date().toISOString(),
    branchesCount: INITIAL_BRANCHES.length,
    studentsCount: INITIAL_STUDENTS.length,
  });
});

// Next Enrollment Number Preview
app.get('/api/enrollment/next', (req: Request, res: Response) => {
  const yearParam = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
  const effectiveYear = isNaN(yearParam) ? new Date().getFullYear() : yearParam;
  const yy = String(effectiveYear).slice(-2);
  const nextSerial = 1000;
  res.json({
    success: true,
    year: effectiveYear,
    nextEnrollmentId: `${yy}${String(nextSerial).padStart(4, '0')}`,
  });
});

// Branches
app.get('/api/branches', (req: Request, res: Response) => {
  res.json({ success: true, branches: INITIAL_BRANCHES });
});

// Students
app.get('/api/students', (req: Request, res: Response) => {
  res.json({ success: true, students: INITIAL_STUDENTS });
});

app.get('/api/students/:query', (req: Request, res: Response) => {
  const q = String(req.params.query || '').trim().toLowerCase();
  const found = INITIAL_STUDENTS.find(
    (s) =>
      s.enrollmentId.toLowerCase() === q ||
      s.rollNo?.toLowerCase() === q ||
      s.certSerial?.toLowerCase() === q
  );
  if (found) {
    res.json({ success: true, student: found });
  } else {
    res.status(404).json({ success: false, message: 'Student record not found' });
  }
});

export default app;
