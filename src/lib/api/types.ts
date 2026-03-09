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
  subjectId: string | null;
  topicId: string | null;
  subject?: { id: string; name: string } | null;
  topic?: { id: string; name: string } | null;
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
  subjectId: string | null;
  topicId: string | null;
  subject?: { id: string; name: string } | null;
  topic?: { id: string; name: string } | null;
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
  subjectId?: string;
  topicId?: string;
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
  subjectId?: string | null;
  topicId?: string | null;
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
  subjectId?: string | null;
  topicId?: string | null;
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

// ==================== QUESTION BANK ====================

export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "SHORT_ANSWER";

export interface Subject {
  id: string;
  name: string;
  description: string | null;
  topicCount?: number;
  questionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  name: string;
  subjectId: string;
  questionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionChoice {
  id: string;
  content: string;
  isCorrect: boolean;
  order: number;
}

export interface Question {
  id: string;
  content: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  correctAnswer: string | null;
  explanation: string | null;
  isPublished: boolean;
  subjectId: string;
  topicId: string | null;
  creatorId: string;
  subject?: Subject;
  topic?: Topic | null;
  choices?: QuestionChoice[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionListItem {
  id: string;
  content: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  isPublished: boolean;
  subjectId: string;
  topicId: string | null;
  subject?: { id: string; name: string };
  topic?: { id: string; name: string } | null;
  choiceCount?: number;
  createdAt: string;
}

export interface PaginatedQuestions {
  data: QuestionListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryQuestionsParams {
  page?: number;
  limit?: number;
  questionType?: QuestionType;
  difficulty?: Difficulty;
  subjectId?: string;
  topicId?: string;
  search?: string;
  isPublished?: boolean;
  sortBy?: "createdAt" | "difficulty" | "questionType";
  sortOrder?: "asc" | "desc";
}

export interface CreateChoiceRequest {
  content: string;
  isCorrect: boolean;
  order?: number;
}

export interface CreateQuestionRequest {
  content: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  subjectId: string;
  topicId?: string | null;
  explanation?: string | null;
  isPublished?: boolean;
  correctAnswer?: string | null;
  choices?: CreateChoiceRequest[];
}

export interface UpdateQuestionRequest {
  content?: string;
  questionType?: QuestionType;
  difficulty?: Difficulty;
  subjectId?: string;
  topicId?: string | null;
  explanation?: string | null;
  isPublished?: boolean;
  correctAnswer?: string | null;
  choices?: CreateChoiceRequest[];
}

export interface CreateSubjectRequest {
  name: string;
  description?: string | null;
}

export interface CreateTopicRequest {
  name: string;
}

// ==================== EXAMS ====================

export type ExamSection = "QUESTION" | "PROBLEM";
export type ExamSessionStatus = "IN_PROGRESS" | "SUBMITTED" | "GRADED";

export interface Exam {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  problemCount: number;
  duration: number;
  difficulty: Difficulty | null;
  includeProblemsRelatedToQuestions: boolean;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  isPublished: boolean;
  subjectId: string | null;
  topicId: string | null;
  subject?: { id: string; name: string } | null;
  topic?: { id: string; name: string } | null;
  creatorId: string;
  items?: ExamItem[];
  sessionCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ExamListItem {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  problemCount: number;
  duration: number;
  difficulty: Difficulty | null;
  isPublished: boolean;
  subjectId: string | null;
  topicId: string | null;
  subject?: { id: string; name: string } | null;
  topic?: { id: string; name: string } | null;
  creatorId: string;
  totalItems: number;
  sessionCount: number;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  createdAt: string;
}

export interface ExamItem {
  id: string;
  section: ExamSection;
  order: number;
  points: number;
  questionId: string | null;
  problemId: string | null;
  question?: ExamQuestion | null;
  problem?: ExamProblem | null;
}

export interface ExamQuestion {
  id: string;
  content: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  choices?: ExamChoice[];
}

export interface ExamChoice {
  id: string;
  content: string;
  order: number;
}

export interface ExamProblem {
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
}

export interface PaginatedExams {
  data: ExamListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryExamsParams {
  page?: number;
  limit?: number;
  subjectId?: string;
  topicId?: string;
  difficulty?: Difficulty;
  search?: string;
  isPublished?: boolean;
  sortBy?: "createdAt" | "title" | "duration";
  sortOrder?: "asc" | "desc";
}

export interface CreateExamRequest {
  title: string;
  description?: string | null;
  subjectId?: string | null;
  topicId?: string | null;
  questionCount: number;
  problemCount: number;
  includeProblemsRelatedToQuestions?: boolean;
  difficulty?: Difficulty | null;
  duration: number;
  questionIds?: string[];
  problemIds?: string[];
  shuffleQuestions?: boolean;
  shuffleChoices?: boolean;
}

export interface UpdateExamRequest {
  title?: string;
  description?: string | null;
  duration?: number;
  isPublished?: boolean;
  shuffleQuestions?: boolean;
  shuffleChoices?: boolean;
}

// Shuffled session returned when starting/resuming an exam
export interface ShuffledExamSession {
  id: string;
  examId: string;
  examTitle: string;
  duration: number;
  status: ExamSessionStatus;
  startedAt: string;
  finishedAt: string | null;
  score: number | null;
  maxScore: number | null;
  questionItems: ShuffledItem[];
  problemItems: ShuffledItem[];
  answers: SessionAnswer[];
}

export interface ShuffledItem {
  id: string;
  section: ExamSection;
  order: number;
  points: number;
  question?: ExamQuestion | null;
  problem?: ExamProblem | null;
}

export interface SessionAnswer {
  id: string;
  examItemId: string;
  selectedChoiceIds: string[];
  textAnswer: string | null;
  submissionId: string | null;
  sourceCode: string | null;
  language: string | null;
  languageVersion: string | null;
  isCorrect: boolean | null;
  score: number | null;
}

export interface SaveAnswerRequest {
  examItemId: string;
  selectedChoiceIds?: string[];
  textAnswer?: string | null;
  submissionId?: string | null;
  sourceCode?: string | null;
  language?: string | null;
  languageVersion?: string | null;
}

export interface SessionResult {
  id: string;
  examId: string;
  examTitle: string;
  status: ExamSessionStatus;
  startedAt: string;
  finishedAt: string | null;
  score: number | null;
  maxScore: number | null;
  totalItems: number;
  correctItems: number;
  pendingItems: number;
  items: SessionResultItem[];
}

export interface SessionResultItem {
  examItemId: string;
  section: ExamSection;
  points: number;
  isCorrect: boolean | null;
  score: number | null;
  questionContent?: string;
  problemTitle?: string;
  selectedChoiceIds: string[];
  textAnswer: string | null;
}

export interface GradeSessionRequest {
  items: {
    examItemId: string;
    score: number;
    isCorrect: boolean;
  }[];
}

// ==================== EXAM SESSIONS LIST ====================

export interface ExamSessionListItem {
  id: string;
  examId: string;
  examTitle: string;
  status: ExamSessionStatus;
  startedAt: string;
  finishedAt: string | null;
  score: number | null;
  maxScore: number | null;
  totalItems: number;
  correctItems: number;
  pendingItems: number;
  questionCount: number;
  problemCount: number;
}

export interface PaginatedExamSessions {
  data: ExamSessionListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryExamSessionsParams {
  page?: number;
  limit?: number;
  status?: ExamSessionStatus;
  sortBy?: "startedAt" | "score" | "finishedAt";
  sortOrder?: "asc" | "desc";
}

// ==================== UNIFIED SUBMISSIONS ====================

export type UnifiedSubmissionType = "PROBLEM" | "EXAM";

export interface UnifiedSubmissionItem {
  id: string;
  type: UnifiedSubmissionType;
  title: string;
  slug: string | null;
  difficulty: Difficulty | null;
  status: string;
  language: string | null;
  totalTestCases: number | null;
  passedTestCases: number | null;
  executionTime: number | null;
  score: number | null;
  maxScore: number | null;
  totalItems: number | null;
  correctItems: number | null;
  pendingItems: number | null;
  questionCount: number | null;
  problemCount: number | null;
  examId: string | null;
  date: string;
}

export interface PaginatedUnifiedSubmissions {
  data: UnifiedSubmissionItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryUnifiedSubmissionsParams {
  page?: number;
  limit?: number;
  type?: "PROBLEM" | "EXAM" | "ALL";
  sortOrder?: "asc" | "desc";
}
