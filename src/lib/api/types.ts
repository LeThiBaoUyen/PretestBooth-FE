// API Types and Interfaces

export type LecturerPermission =
  | "CREATE_EXAM"
  | "REVIEW_QUESTION"
  | "MANAGE_QUESTION_BANK"
  | "MANAGE_STUDENTS"
  | "MANAGE_BOOTHS"
  | "MONITOR_SESSIONS"
  | "LECTURER_ADMIN";

export interface User {
  id: string;
  email: string;
  name?: string; // Thêm tên user (tùy backend trả về)
  studentCode?: string;
  className?: string;
  role: "STUDENT" | "LECTURER" | "ADMIN";
  permissions?: LecturerPermission[];
  isEmailVerified: boolean;
  dateOfBirth?: string;
  isLocked?: boolean;
  lockedReason?: string;
  totalPoints?: number;
  kycStatus?: "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED";
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

export interface BoothActivateRequest {
  boothCode: string;
  otp: string;
}

export interface BoothActivateResponse {
  boothId: string;
  boothCode: string;
  boothName: string;
  sessionActivatedAt?: string;
  sessionActivatedAtLocal?: string;
  boothSessionToken: string;
}

export interface BoothLogoutRequest {
  boothSessionToken: string;
}

export interface BoothLoginRequest {
  email: string;
  password: string;
  boothSessionToken: string;
}

export interface BoothLoginResponse extends LoginResponse {
  booth: {
    id: string;
    code: string;
    name: string;
  };
  checkedInBooking: {
    id: string;
    boothId: string;
    type: "PRACTICE" | "EXAM";
    status: string;
    startTime: string;
    endTime: string;
  } | null;
  pendingCheckinBooking: {
    id: string;
    boothId: string;
    type: "PRACTICE" | "EXAM";
    status: string;
    startTime: string;
    endTime: string;
  } | null;
}

export interface BoothSessionStatusResponse {
  active: boolean;
  booth: {
    id: string;
    code: string;
    name: string;
    status: "ACTIVE" | "MAINTENANCE" | "INACTIVE";
  };
  sessionActivatedAt?: string | null;
  sessionActivatedAtLocal?: string | null;
}

export interface GenerateBoothActivationOtpRequest {
  boothCode: string;
}

export interface GenerateBoothActivationOtpResponse {
  boothId: string;
  boothCode: string;
  otp: string;
  expiresAt: string;
  expiresAtLocal?: string;
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
export type QuestionClassification = "PRACTICE" | "EXAM";

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
  imageUrl?: string | null;
  questionType: QuestionType;
  classification: QuestionClassification;
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
  imageUrl?: string | null;
  questionType: QuestionType;
  classification: QuestionClassification;
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
  classification?: QuestionClassification;
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
  imageUrl?: string | null;
  questionType: QuestionType;
  classification: QuestionClassification;
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
  imageUrl?: string | null;
  questionType?: QuestionType;
  classification?: QuestionClassification;
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

export type QuestionReviewStatus =
  | "PENDING"
  | "RESUBMITTED"
  | "APPROVED"
  | "NEEDS_REVISION"
  | "SKIPPED";

export interface QuestionReviewReviewer {
  id: string;
  name: string | null;
  email: string;
}

export interface QuestionReviewAction {
  id: string;
  sessionId: string;
  status: QuestionReviewStatus;
  notes: string | null;
  reviewedBy: string;
  reviewedAt: string;
  createdAt: string;
  reviewer?: QuestionReviewReviewer;
}

export interface QuestionReviewSession {
  id: string;
  quarter: number;
  year: number;
  academicYear: string;
  startDate: string;
  endDate: string;
  status: QuestionReviewStatus;
  notes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  questionId: string;
  createdAt: string;
  updatedAt: string;
  question: Question;
  reviewer?: QuestionReviewReviewer | null;
  actions?: QuestionReviewAction[];
}

export interface QuestionReviewStats {
  total: number;
  pending: number;
  resubmitted: number;
  approved: number;
  needsRevision: number;
  skipped: number;
}

export interface ReviewSessionsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QuestionReviewSessionsResponse {
  data: QuestionReviewSession[];
  pagination: ReviewSessionsPagination;
  stats: QuestionReviewStats;
}

export interface QueryReviewSessionsParams {
  quarter?: number;
  year?: number;
  status?: QuestionReviewStatus;
  page?: number;
  limit?: number;
}

export interface SubmitQuestionReviewRequest {
  sessionId: string;
  status: Extract<QuestionReviewStatus, "APPROVED" | "NEEDS_REVISION">;
  notes?: string;
}

export interface ResubmitQuestionReviewRequest {
  sessionId: string;
  notes?: string;
}

export interface GenerateReviewSessionsRequest {
  quarter?: number;
  year?: number;
}

export interface GenerateReviewSessionsResponse {
  quarter: number;
  year: number;
  academicYear: string;
  totalPublishedQuestions: number;
  createdSessions: number;
}

// ==================== EXAMS ====================

export type ExamSection = "QUESTION" | "PROBLEM";
export type ExamSessionStatus = "IN_PROGRESS" | "SUBMITTED" | "GRADED";
export type ExamVisibility = "PRIVATE" | "PUBLIC";

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
  visibility?: ExamVisibility;
  publishAt?: string | null;
  publishedAt?: string | null;
  allowStudentReviewResults: boolean;
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
  visibility?: ExamVisibility;
  publishAt?: string | null;
  publishedAt?: string | null;
  allowStudentReviewResults: boolean;
  subjectId: string | null;
  topicId: string | null;
  subject?: { id: string; name: string } | null;
  topic?: { id: string; name: string } | null;
  creatorId: string;
  totalItems: number;
  sessionCount: number;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  type?: "PRACTICE" | "EXAM";
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
  imageUrl?: string | null;
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
  minDuration?: number;
  maxDuration?: number;
  minQuestionCount?: number;
  maxQuestionCount?: number;
  isPublished?: boolean;
  sortBy?: "createdAt" | "title" | "duration";
  sortOrder?: "asc" | "desc";
}

export interface CreateExamRequest {
  title: string;
  description?: string | null;
  subjectId?: string | null;
  subjectIds?: string[];
  topicId?: string | null;
  generationMode?: "RANDOM" | "MANUAL";
  allocationPolicy?: "STRICT" | "FLEXIBLE";
  questionCount: number;
  problemCount: number;
  questionDifficultyDistribution?: {
    easy: number;
    medium: number;
    hard: number;
  };
  questionAllocationRules?: Array<{
    subjectId: string;
    difficulty?: Difficulty | null;
    count: number;
  }>;
  problemDifficultyDistribution?: {
    easy: number;
    medium: number;
    hard: number;
  };
  includeProblemsRelatedToQuestions?: boolean;
  difficulty?: Difficulty | null;
  duration: number;
  questionIds?: string[];
  problemIds?: string[];
  shuffleQuestions?: boolean;
  shuffleChoices?: boolean;
  visibility?: ExamVisibility;
  allowStudentReviewResults?: boolean;
  publishAt?: string | null;
  publishNow?: boolean;
  type?: "PRACTICE" | "EXAM";
}

export interface UpdateExamRequest {
  title?: string;
  description?: string | null;
  duration?: number;
  isPublished?: boolean;
  visibility?: ExamVisibility;
  allowStudentReviewResults?: boolean;
  publishAt?: string | null;
  publishNow?: boolean;
  shuffleQuestions?: boolean;
  shuffleChoices?: boolean;
  type?: "PRACTICE" | "EXAM";
}

// Shuffled session returned when starting/resuming an exam
export interface ShuffledExamSession {
  id: string;
  examId: string;
  examType: "PRACTICE" | "EXAM";
  proctoringEnabled: boolean;
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

export interface SessionResultChoice {
  id: string;
  content: string;
  order: number;
  isSelected: boolean;
  isCorrect: boolean;
}

export interface SessionResultTestCase {
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
  message: string;
}

export interface SessionResultSubmission {
  submissionId: string;
  status: string;
  passedTestCases: number;
  failedTestCases: number;
  totalTestCases: number;
  executionTime: number | null;
  compileOutput: string | null;
  errorMessage: string | null;
  testCaseResults: SessionResultTestCase[] | null;
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
  canViewItemDetails: boolean;
  detailMessage: string | null;
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
  questionType?: QuestionType;
  questionExplanation?: string | null;
  correctAnswer?: string | null;
  choices?: SessionResultChoice[];
  submission?: SessionResultSubmission | null;
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
  examId?: string;
  studentId?: string;
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

// ==================== NEW MODULES (PHASE 1) ====================

// Booths
export type BoothStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE";

export interface BoothStatusLog {
  id: string;
  boothId: string;
  fromStatus: BoothStatus;
  toStatus: BoothStatus;
  note: string;
  changedByUserId: string | null;
  changedAt: string;
  changedByUser?: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

export interface Booth {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  location: string | null;
  status: BoothStatus;
  isSessionActive?: boolean;
  sessionActivatedAt?: string | null;
  sessionActivatedAtLocal?: string | null;
  statusLogs?: BoothStatusLog[];
  _count?: { bookings: number };
  createdAt: string;
  updatedAt: string;
}

// Bookings
export type BookingStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type BookingType = "PRACTICE" | "EXAM";

export interface Booking {
  id: string;
  userId: string;
  boothId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  type: BookingType;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  checkinStatus?: "PENDING" | "PASSED" | "FAILED";
  checkinSimilarityScore?: number | null;
  checkinThreshold?: number;
  checkinVerifiedAt?: string | null;
  checkinAttemptCount?: number;
  createdAt: string;
  updatedAt: string;
  booth?: Booth;
  user?: Partial<User>;
}

export interface AvailableTimeSlot {
  startTime: string;
  endTime: string;
  totalBooths: number;
  bookedBooths: number;
  availableBooths: number;
  bookedBoothIds: string[];
}

export interface AvailabilityResponse {
  date: string;
  booths: Booth[];
  slots: AvailableTimeSlot[];
}

export interface BookingDurationOption {
  id: string;
  type: BookingType;
  durationMinutes: number;
  isActive: boolean;
  displayOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoothStatusUpdatedEvent {
  boothId: string;
  status: BoothStatus;
  previousStatus: BoothStatus;
  note: string;
  changedByUserId: string;
  changedAt: string;
}

export interface BookingRealtimeEvent {
  bookingId: string;
  boothId: string;
  userId: string;
  status: "CHECKED_IN" | "COMPLETED";
  type: BookingType;
  startTime: string;
  endTime: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  emittedAt: string;
}

export interface MonitoringUpdatedEvent {
  scope: "BOOKING" | "BOOTH" | "EXAM" | "PRACTICE";
  action:
    | "CHECKIN"
    | "CHECKOUT"
    | "FORCE_CHECKOUT"
    | "FORCE_LOGOUT_BOOTH"
    | "START"
    | "SUBMIT"
    | "ABORT"
    | "EXTEND"
    | "NOTIFY";
  bookingId?: string;
  boothId?: string;
  userId?: string;
  sessionType?: "EXAM" | "PRACTICE";
  sessionId?: string;
  emittedAt: string;
}

export interface SessionTimerAdjustedEvent {
  sessionType: "EXAM" | "PRACTICE";
  sessionId: string;
  userId: string;
  boothId?: string;
  expiresAt: string;
  reason: string;
  emittedAt: string;
}

export interface SessionTerminatedEvent {
  sessionType: "EXAM" | "PRACTICE";
  sessionId: string;
  userId: string;
  boothId?: string;
  status: string;
  reason?: string;
  emittedAt: string;
}

export interface BoothNotificationEvent {
  userId?: string;
  boothId?: string;
  message: string;
  level?: "info" | "success" | "warning" | "error";
  emittedAt: string;
}

// KYC & Facial check-in
export interface LivenessPayload {
  action: "BLINK" | "SMILE";
  passed: boolean;
  confidence?: number;
}

export interface KycRegisterRequest {
  image: string;
  consentVersion: string;
  liveness: LivenessPayload;
}

export interface KycRegisterResponse {
  userId: string;
  kycStatus: "VERIFIED";
  embeddingDimension: number;
  embeddingModel: string;
  embeddingVersion: string;
  verifiedAt: string;
}

export interface KycStatusResponse {
  kycStatus: "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED";
  hasEmbedding: boolean;
  kycRegisteredAt: string | null;
  kycVerifiedAt: string | null;
  kycLastAttemptAt: string | null;
  faceEmbeddingUpdatedAt: string | null;
}

export interface CheckinVerifyRequest {
  bookingId: string;
  image: string;
  verifierDeviceId?: string;
}

export interface CheckinVerifyResponse {
  bookingId: string;
  matched: boolean;
  similarityScore: number;
  threshold: number;
  reason?: string;
  checkinStatus?: "PENDING" | "PASSED" | "FAILED";
  bookingStatus?: BookingStatus;
  checkedInAt?: string | null;
}

export interface CheckinThresholdConfig {
  key: string;
  threshold: number;
  source: "database" | "env" | "default";
  updatedAt: string | null;
  updatedByUserId?: string | null;
}

export interface UpdateCheckinThresholdRequest {
  threshold: number;
}

// Practice
export interface PracticeSession {
  id: string;
  userId: string;
  duration: number;
  totalItems: number;
  difficulty: Difficulty | null;
  subjectId: string | null;
  topicId: string | null;
  categoryId: string | null;
  status: "IN_PROGRESS" | "COMPLETED";
  startedAt: string;
  finishedAt: string | null;
  score: number | null;
  maxScore: number | null;
  items?: PracticeSessionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PracticeSessionItem {
  id: string;
  sessionId: string;
  questionId: string | null;
  problemId: string | null;
  order: number;
  points: number;
  question?: Question | null;
  problem?: Problem | null;
  answers?: PracticeSessionAnswer[];
}

export interface PracticeSessionAnswer {
  id: string;
  itemId: string;
  selectedChoiceIds: string[];
  textAnswer: string | null;
  sourceCode: string | null;
  language: string | null;
  languageVersion: string | null;
  isCorrect: boolean | null;
  score: number | null;
}

// Dashboard
export interface StudentStats {
  points: number;
  completedExams: number;
  completedPractices: number;
  submissionAccuracy: number;
  totalSubmissions: number;
  upcomingBookings: Booking[];
}

export interface AdminStats {
  totalStudents: number;
  activeBooths: number;
  todayBookings: number;
  totalExams: number;
  boothUtilizationPercent: number;
  recentProctoringEvents: any[];
}

export type MonitoringActivityType = "EXAM" | "PRACTICE" | "IDLE";

export interface ActiveMonitoringExamSession {
  sessionId: string;
  examId: string;
  examTitle: string;
  startedAt: string;
  expiresAt: string;
  duration: number;
  remainingSeconds: number | null;
}

export interface ActiveMonitoringPracticeSession {
  sessionId: string;
  startedAt: string;
  duration: number;
  expiresAt: string | null;
  remainingSeconds: number | null;
}

export interface ActiveMonitoringSessionItem {
  bookingId: string;
  boothId: string;
  boothName: string;
  boothCode: string | null;
  userId: string;
  studentName: string | null;
  studentEmail: string;
  studentCode: string | null;
  bookingType: BookingType;
  status: BookingStatus;
  checkedInAt: string | null;
  bookingStartTime: string;
  bookingEndTime: string;
  bookingRemainingSeconds: number;
  currentActivityType: MonitoringActivityType;
  currentRemainingSeconds: number;
  isWarning: boolean;
  activeExam: ActiveMonitoringExamSession | null;
  activePractice: ActiveMonitoringPracticeSession | null;
}

export interface PaginatedActiveMonitoringSessions {
  data: ActiveMonitoringSessionItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryActiveMonitoringParams {
  page?: number;
  limit?: number;
  boothId?: string;
  activityType?: MonitoringActivityType;
  search?: string;
  sortOrder?: "asc" | "desc";
}

export interface MonitorReasonRequest {
  reason: string;
}

export interface MonitorNotifyRequest {
  message: string;
  level?: "info" | "success" | "warning" | "error";
}

export interface ForceCheckoutResponse {
  message: string;
  bookingId: string;
  affectedExamSessions: number;
  affectedPracticeSessions: number;
}

export interface ForceBoothLogoutResponse {
  message: string;
  boothId: string;
  boothCode: string;
}

export interface MonitorNotifyResponse {
  message: string;
  bookingId: string;
}

export interface ExtendSessionRequest {
  minutes: number;
  reason: string;
}
