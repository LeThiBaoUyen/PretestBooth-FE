# Quick Start Guide - Code Execution & Submissions

## 🎯 For Users

### Taking an Exam

1. Navigate to **Bài tập** (Problems) from the header
2. Click on any problem to view details
3. Click **"Làm bài"** or navigate to `/exam?problem=<problem-slug>`
4. Write your solution in the Monaco code editor
5. Select your programming language (JavaScript, Python, Java, C++, C)
6. Click **"Chạy"** (Run) to test against sample test cases
7. Review results in the "Kết quả" tab
8. When ready, click **"Nộp bài"** (Submit) for full evaluation
9. View your submission in "Lịch sử nộp bài"

### Viewing Submissions

1. Click **"Lịch sử nộp bài"** in the header
2. Filter by:
   - **Status**: Accepted, Wrong Answer, Compile Error, etc.
   - **Language**: JavaScript, Python, Java, C++, C
3. Click any submission row to see detailed results
4. View:
   - Test case results (input, expected output, actual output)
   - Execution time for each test case
   - Compile errors or runtime errors
   - Your submitted source code

## 💻 For Developers

### Using the Execution API

#### Execute Code (Playground Mode)

```typescript
import { executionApi } from "@/lib/api/execution";

const result = await executionApi.executeCode({
  language: "javascript",
  version: "18.15.0",
  source: 'console.log("Hello World");',
  stdin: "", // optional input
});

console.log(result.stdout); // "Hello World"
console.log(result.executionTime); // e.g., 42
```

#### Run Single Test Case

```typescript
const result = await executionApi.runTestCase({
  language: "python",
  source: "print(input())",
  input: "test input",
  expectedOutput: "test input",
});

console.log(result.passed); // true/false
console.log(result.actualOutput); // actual program output
```

#### Submit Code for Evaluation

```typescript
const submission = await executionApi.submitCode({
  language: "javascript",
  source: "function solution() { ... }",
  problemId: "problem-uuid",
  runTimeout: 3000, // optional
});

console.log(submission.status); // 'ACCEPTED', 'WRONG_ANSWER', etc.
console.log(submission.passedTestCases); // number of passed tests
console.log(submission.testCaseResults); // detailed results
```

### Using the Submissions API

#### Get All Submissions

```typescript
import { submissionsApi } from "@/lib/api/execution";

const result = await submissionsApi.getSubmissions({
  page: 1,
  limit: 20,
  status: "ACCEPTED", // optional filter
  language: "python", // optional filter
  sortBy: "createdAt",
  sortOrder: "desc",
});

console.log(result.data); // array of submissions
console.log(result.totalPages); // total pages
```

#### Get Submission Details

```typescript
const submission = await submissionsApi.getSubmission("submission-uuid");

console.log(submission.sourceCode);
console.log(submission.testCaseResults);
console.log(submission.status);
```

#### Get Problem Submissions

```typescript
const submissions = await submissionsApi.getSubmissionsByProblem(
  "problem-uuid",
  { page: 1, limit: 10 },
);
```

#### Get Submission Statistics

```typescript
const stats = await submissionsApi.getSubmissionStats("problem-uuid");

console.log(stats.acceptanceRate); // e.g., 0.75 (75%)
console.log(stats.averageExecutionTime); // in ms
console.log(stats.languageDistribution); // { javascript: 10, python: 5 }
```

### Available Languages

```typescript
const SUPPORTED_LANGUAGES = {
  javascript: { version: "18.15.0" },
  python: { version: "3.10.0" },
  java: { version: "15.0.2" },
  "c++": { version: "10.2.0" },
  c: { version: "10.2.0" },
};
```

### Submission Statuses

```typescript
type SubmissionStatus =
  | "PENDING" // Processing
  | "ACCEPTED" // All tests passed
  | "WRONG_ANSWER" // Failed some tests
  | "COMPILE_ERROR" // Code didn't compile
  | "RUNTIME_ERROR" // Crashed during execution
  | "TIME_LIMIT_EXCEEDED" // Took too long
  | "MEMORY_LIMIT_EXCEEDED"; // Used too much memory
```

## 🔧 Configuration

### Environment Variables

```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3000

# Backend (.env)
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
PISTON_API_URL="https://emkc.org/api/v2/piston" # or self-hosted
```

### Timeout Limits

- Default run timeout: 3000ms (3 seconds)
- Configurable per problem in database
- Can override in API calls

### Test Case Types

- **Sample Test Cases** (`isSample: true`): Visible to users, shown when running code
- **Hidden Test Cases** (`isHidden: true`): Only evaluated during submission, not shown to users

## 🎨 UI Components

### Exam Page Components

Located in `src/components/exam/`:

- `ExamHeader`: Title, difficulty, run/submit buttons
- `ExamTabs`: Tab navigation (Description, Test Cases, Results)
- `DescriptionTab`: Problem description and examples
- `TestCaseTab`: Sample test case preview
- `ResultTab`: Execution results display
- `CodeEditor`: Monaco editor with language selector

### Reusable Components

```typescript
import {
  ExamHeader,
  ExamTabs,
  DescriptionTab,
  TestCaseTab,
  ResultTab,
  CodeEditor,
} from "@/components/exam";
```

## 🐛 Error Handling

### Compile Errors

```typescript
if (submission.status === "COMPILE_ERROR") {
  console.log(submission.compileOutput);
  // Display to user
}
```

### Runtime Errors

```typescript
testCaseResults.forEach((result) => {
  if (result.stderr) {
    console.error(result.stderr);
  }
});
```

### Network Errors

```typescript
try {
  const result = await executionApi.submitCode(data);
} catch (error) {
  console.error("Submission failed:", error.message);
  // Show error toast to user
}
```

## 📱 Responsive Design

### Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Mobile Optimizations

- Stacked layout for exam page (problem above, editor below)
- Collapsible navigation menu
- Touch-friendly buttons and inputs
- Horizontal scroll for tables

## 🔒 Authentication

### Required for:

- Executing code
- Submitting solutions
- Viewing submissions
- Accessing problem details

### Token Management

- Access token: Stored in localStorage
- Refresh token: HTTP-only cookie
- Auto-refresh on expiry
- Session restoration on page load

## 📊 Performance Tips

1. **Lazy Load Monaco Editor**: Import dynamically to reduce initial bundle
2. **Pagination**: Use reasonable limits (10-20 items per page)
3. **Debounce API Calls**: Avoid rapid consecutive requests
4. **Cache Results**: Use TanStack Query's built-in caching
5. **Optimize Test Cases**: Limit sample test cases to 3-5 visible ones

## 🧪 Testing Locally

1. Start backend:

   ```bash
   cd pretest-booth-be
   npm run start:dev
   ```

2. Start frontend:

   ```bash
   cd PretestBooth-FE
   npm run dev
   ```

3. Test URLs:
   - Exam: http://localhost:3001/exam?problem=two-sum
   - Submissions: http://localhost:3001/submissions
   - Problems: http://localhost:3001/problems

## 🚀 Production Checklist

- [ ] Set `NEXT_PUBLIC_API_URL` to production backend URL
- [ ] Configure CORS on backend for frontend domain
- [ ] Set up Piston API (self-hosted or use managed service)
- [ ] Run database migrations
- [ ] Seed initial problems
- [ ] Test all execution endpoints
- [ ] Monitor execution timeouts and errors
- [ ] Set up error logging (Sentry, etc.)
- [ ] Configure rate limiting to prevent abuse

## 📚 Additional Resources

- [Backend API Documentation](../pretest-booth-be/docs/README.md)
- [Execution API Docs](../pretest-booth-be/docs/EXECUTION_API.md)
- [Submissions API Docs](../pretest-booth-be/docs/SUBMISSIONS_API.md)
- [Piston API Documentation](https://github.com/engineer-man/piston)

---

**Questions or Issues?** Check the [main documentation](./EXECUTION_INTEGRATION_SUMMARY.md) or create an issue.
