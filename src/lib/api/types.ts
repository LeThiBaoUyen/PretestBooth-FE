// API Types and Interfaces

export interface User {
  id: string;
  email: string;
  name?: string; // Thêm tên user (tùy backend trả về)
  role: "STUDENT" | "LECTURER" | "ADMIN";
  isEmailVerified: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  name?: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  message: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ResendVerificationResponse {
  message: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

// ==================== PROBLEMS ====================

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  explanation: string | null;
  isHidden: boolean;
  isSample: boolean;
  order: number;
}

export interface Problem {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: Difficulty;
  starterCode: Record<string, string> | null;
  constraints: string | null;
  hints: string[];
  timeLimit: number;
  memoryLimit: number;
  functionName: string;
  inputTypes: string[];
  outputType: string;
  argNames: string[];
  totalSubmissions: number;
  acceptedSubmissions: number;
  acceptanceRate: number;
  isPublished: boolean;
  creatorId: string;
  testCases?: TestCase[];
  sampleTestCases?: TestCase[];
  createdAt: string;
  updatedAt: string;
}

export interface ProblemListItem {
  id: string;
  title: string;
  slug: string;
  difficulty: Difficulty;
  acceptanceRate: number;
  totalSubmissions: number;
  isPublished: boolean;
}

export interface PaginatedProblems {
  data: ProblemListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryProblemsParams {
  page?: number;
  limit?: number;
  difficulty?: Difficulty;
  search?: string;
  isPublished?: boolean;
  sortBy?: "createdAt" | "title" | "difficulty" | "acceptanceRate";
  sortOrder?: "asc" | "desc";
}

export interface CreateTestCaseRequest {
  input: string;
  expectedOutput: string;
  explanation?: string | null;
  isHidden?: boolean;
  isSample?: boolean;
  order?: number;
}

export interface CreateProblemRequest {
  title: string;
  slug: string;
  description: string;
  difficulty: Difficulty;
  starterCode?: Record<string, string>;
  constraints?: string;
  hints?: string[];
  timeLimit?: number;
  memoryLimit?: number;
  functionName?: string;
  inputTypes?: string[];
  outputType?: string;
  argNames?: string[];
  isPublished?: boolean;
  testCases?: CreateTestCaseRequest[];
}

export interface UpdateProblemRequest {
  title?: string;
  slug?: string;
  description?: string;
  difficulty?: Difficulty;
  starterCode?: Record<string, string>;
  constraints?: string;
  hints?: string[];
  timeLimit?: number;
  memoryLimit?: number;
  functionName?: string;
  inputTypes?: string[];
  outputType?: string;
  argNames?: string[];
  isPublished?: boolean;
}

// ==================== EXECUTION & SUBMISSIONS ====================

export type SubmissionStatus =
  | "PENDING"
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "COMPILE_ERROR"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED";

export interface LanguageInfo {
  language: string;
  version: string;
  aliases: string[];
  runtime?: string;
}

export interface ExecuteCodeRequest {
  language: string;
  version?: string;
  source: string;
  functionName?: string;
  inputTypes?: string[];
  stdin?: string;
  args?: string[];
  compileTimeout?: number;
  runTimeout?: number;
  compileMemoryLimit?: number;
  runMemoryLimit?: number;
}

export interface ExecuteCodeResponse {
  language: string;
  version: string;
  stdout: string;
  stderr: string;
  output: string;
  exitCode: number | null;
  signal: string | null;
  isSuccess: boolean;
  isCompileError: boolean;
  compileOutput?: string;
  executionTime: number;
  networkTime: number;
  totalTime: number;
}

export interface RunTestCaseRequest {
  language: string;
  version?: string;
  source: string;
  functionName?: string;
  inputTypes?: string[];
  input: string;
  expectedOutput: string;
  runTimeout?: number;
}

export interface RunTestCaseResponse {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  stdout: string;
  stderr: string;
  isCorrect: boolean;
  passed: boolean;
  executionTime: number;
  message?: string;
}

export interface SubmitCodeRequest {
  language: string;
  version?: string;
  source: string;
  functionName?: string;
  inputTypes?: string[];
  problemId: string;
  runTimeout?: number;
}

export interface TestCaseResult {
  testCaseId: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  stdout: string;
  stderr: string;
  isCorrect: boolean;
  isHidden: boolean;
  isSample: boolean;
  order: number;
  executionTime: number;
  passed: boolean;
  message?: string;
}

export interface SubmissionResponse {
  id: string;
  language: string;
  version: string;
  problemId: string;
  userId: string;
  sourceCode: string;
  status: SubmissionStatus;
  totalTestCases: number;
  passedTestCases: number;
  failedTestCases: number;
  executionTime: number;
  networkTime: number;
  totalTime: number;
  compileOutput?: string;
  errorMessage?: string;
  testCaseResults: TestCaseResult[];
  problem?: {
    id: string;
    title: string;
    slug: string;
    difficulty: Difficulty;
  };
  createdAt: string;
}

export interface SubmissionListItem {
  id: string;
  language: string;
  status: SubmissionStatus;
  executionTime: number;
  passedTestCases: number;
  totalTestCases: number;
  problemId: string;
  problemTitle: string;
  problemSlug: string;
  problemDifficulty: Difficulty;
  createdAt: string;
}

export interface PaginatedSubmissions {
  data: SubmissionListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QuerySubmissionsParams {
  page?: number;
  limit?: number;
  problemId?: string;
  status?: SubmissionStatus;
  language?: string;
  sortBy?: "createdAt" | "executionTime" | "status";
  sortOrder?: "asc" | "desc";
}

export interface SubmissionStats {
  totalSubmissions: number;
  acceptedSubmissions: number;
  acceptanceRate: number;
  averageExecutionTime: number;
  bestExecutionTime: number;
  languageDistribution: Record<string, number>;
  statusDistribution: Record<SubmissionStatus, number>;
}
