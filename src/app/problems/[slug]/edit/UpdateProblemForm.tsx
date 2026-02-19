"use client";

import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { problemsApiClient } from "@/lib/api/problems";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Difficulty, UpdateProblemRequest } from "@/lib/api/types";

interface StarterCodeEntry {
  language: string;
  code: string;
}

const DIFFICULTY_OPTIONS: {
  value: Difficulty;
  label: string;
  color: string;
}[] = [
  {
    value: "EASY",
    label: "Dễ",
    color: "bg-green-100 text-green-700 border-green-300",
  },
  {
    value: "MEDIUM",
    label: "Trung bình",
    color: "bg-yellow-100 text-yellow-700 border-yellow-300",
  },
  {
    value: "HARD",
    label: "Khó",
    color: "bg-red-100 text-red-700 border-red-300",
  },
];

const LANGUAGE_OPTIONS = [
  "javascript",
  "python",
  "java",
  "cpp",
  "c",
  "typescript",
];

interface UpdateProblemFormProps {
  problemSlug: string;
}

export default function UpdateProblemForm({
  problemSlug,
}: UpdateProblemFormProps) {
  const router = useRouter();
  const { accessToken, user } = useAuth();

  // Basic fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [constraints, setConstraints] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  // Limits
  const [timeLimit, setTimeLimit] = useState(1000);
  const [memoryLimit, setMemoryLimit] = useState(256);

  // Function signature
  const [functionName, setFunctionName] = useState("solution");
  const [outputType, setOutputType] = useState("int");
  const [params, setParams] = useState<{ name: string; type: string }[]>([
    { name: "", type: "" },
  ]);

  // Hints
  const [hints, setHints] = useState<string[]>([]);
  const [newHint, setNewHint] = useState("");

  // Starter code
  const [starterCodeEntries, setStarterCodeEntries] = useState<
    StarterCodeEntry[]
  >([]);
  const [showStarterCode, setShowStarterCode] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<"basic" | "signature" | "starter">(
    "basic",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isFormLoaded, setIsFormLoaded] = useState(false);

  // Fetch problem data
  const { data: problem, isLoading: isProblemLoading } = useQuery({
    queryKey: ["problem", problemSlug],
    queryFn: () =>
      problemsApiClient.getProblemBySlug(problemSlug, accessToken || undefined),
    enabled: !!accessToken,
  });

  // Check if user is authorized to edit (only creator and admin)
  const isAuthorized =
    user &&
    (user.id === problem?.creatorId || user.role === "ADMIN") &&
    ["LECTURER", "ADMIN"].includes(user.role);

  // Load problem data into form
  useEffect(() => {
    if (problem && !isFormLoaded) {
      setTitle(problem.title);
      setSlug(problem.slug);
      setDescription(problem.description);
      setDifficulty(problem.difficulty);
      setConstraints(problem.constraints || "");
      setIsPublished(problem.isPublished);
      setTimeLimit(problem.timeLimit);
      setMemoryLimit(problem.memoryLimit);
      setFunctionName(problem.functionName);
      setOutputType(problem.outputType);
      setHints(problem.hints || []);

      // Set params
      if (
        problem.argNames &&
        problem.argNames.length > 0 &&
        problem.inputTypes &&
        problem.inputTypes.length > 0
      ) {
        setParams(
          problem.argNames.map((name, index) => ({
            name,
            type: problem.inputTypes[index] || "",
          })),
        );
      }

      // Set starter code
      if (problem.starterCode && Object.keys(problem.starterCode).length > 0) {
        const entries: StarterCodeEntry[] = Object.entries(
          problem.starterCode,
        ).map(([language, code]) => ({
          language,
          code,
        }));
        setStarterCodeEntries(entries);
        setShowStarterCode(true);
      }

      setIsFormLoaded(true);
    }
  }, [problem, isFormLoaded]);

  // Auto-generate slug from title
  const generateSlug = useCallback((value: string) => {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }, []);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(value));
    }
  };

  // Hints management
  const addHint = () => {
    if (newHint.trim()) {
      setHints([...hints, newHint.trim()]);
      setNewHint("");
    }
  };

  const removeHint = (index: number) => {
    setHints(hints.filter((_, i) => i !== index));
  };

  // Params management
  const addParam = () => {
    setParams([...params, { name: "", type: "" }]);
  };

  const removeParam = (index: number) => {
    setParams(params.filter((_, i) => i !== index));
  };

  const updateParam = (
    index: number,
    field: "name" | "type",
    value: string,
  ) => {
    const updated = [...params];
    updated[index][field] = value;
    setParams(updated);
  };

  // Starter code management
  const addStarterCodeEntry = () => {
    const usedLangs = starterCodeEntries.map((e) => e.language);
    const available = LANGUAGE_OPTIONS.find((l) => !usedLangs.includes(l));
    if (available) {
      setStarterCodeEntries([
        ...starterCodeEntries,
        { language: available, code: "" },
      ]);
    }
  };

  const removeStarterCodeEntry = (index: number) => {
    setStarterCodeEntries(starterCodeEntries.filter((_, i) => i !== index));
  };

  const updateStarterCodeEntry = (
    index: number,
    field: "language" | "code",
    value: string,
  ) => {
    const updated = [...starterCodeEntries];
    updated[index][field] = value;
    setStarterCodeEntries(updated);
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: UpdateProblemRequest) => {
      if (!accessToken) throw new Error("Bạn cần đăng nhập");
      if (!problem?.id) throw new Error("Không tìm thấy bài tập");
      return problemsApiClient.updateProblem(problem.id, data, accessToken);
    },
    onSuccess: (updatedProblem) => {
      router.push(`/problems/${updatedProblem.slug}`);
    },
    onError: (error) => {
      setFormError(
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi cập nhật bài tập",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!accessToken) {
      setFormError("Bạn cần đăng nhập để cập nhật bài tập");
      return;
    }

    // Build starter code object
    const starterCode: Record<string, string> = {};
    starterCodeEntries.forEach((entry) => {
      if (entry.language && entry.code.trim()) {
        starterCode[entry.language] = entry.code;
      }
    });

    // Build params
    const validParams = params.filter((p) => p.name.trim() && p.type.trim());

    const data: UpdateProblemRequest = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim(),
      difficulty,
      constraints: constraints.trim() || undefined,
      hints: hints.length > 0 ? hints : undefined,
      timeLimit,
      memoryLimit,
      functionName: functionName.trim() || "solution",
      inputTypes: validParams.map((p) => p.type),
      outputType: outputType.trim() || "int",
      argNames: validParams.map((p) => p.name),
      isPublished,
      starterCode:
        Object.keys(starterCode).length > 0 ? starterCode : undefined,
    };

    updateMutation.mutate(data);
  };

  const tabs = [
    { key: "basic" as const, label: "Thông tin cơ bản", icon: "📝" },
    { key: "signature" as const, label: "Function Signature", icon: "⚙️" },
    { key: "starter" as const, label: "Starter Code", icon: "💻" },
  ];

  if (isProblemLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-navy-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải bài tập...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-red-600 font-medium mb-4">
            Không tìm thấy bài tập
          </p>
          <Link
            href="/problems"
            className="text-navy-600 hover:text-navy-700 font-medium"
          >
            Quay lại trang bài tập
          </Link>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-red-600 font-medium mb-4">
            Bạn không có quyền chỉnh sửa bài tập này.
          </p>
          <Link
            href={`/problems/${problem.slug}`}
            className="text-navy-600 hover:text-navy-700 font-medium"
          >
            Quay lại bài tập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-600">
            Chỉnh sửa bài tập
          </h1>
          <p className="text-gray-500 mt-1">
            Cập nhật thông tin bài tập lập trình
          </p>
        </div>
        <Link
          href={`/problems/${problem.slug}`}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          ← Quay lại
        </Link>
      </div>

      {/* Error display */}
      {(formError || updateMutation.isError) && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 font-medium">
            {formError ||
              updateMutation.error?.message ||
              "Đã xảy ra lỗi khi cập nhật bài tập"}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-white text-navy-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* ==================== BASIC INFO TAB ==================== */}
        {activeTab === "basic" && (
          <div className="space-y-6">
            {/* Title & Slug */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-navy-600 mb-4">
                Thông tin chung
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tiêu đề <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="VD: Two Sum"
                    required
                    maxLength={200}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="two-sum"
                    required
                    maxLength={200}
                    pattern="^[a-z0-9-]+$"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-gray-900 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Chỉ chứa chữ thường, số và dấu gạch ngang
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả chi tiết bài tập (hỗ trợ Markdown)..."
                    required
                    rows={8}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Difficulty & Limits */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-navy-600 mb-4">
                Cấu hình
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Độ khó
                  </label>
                  <div className="flex gap-2">
                    {DIFFICULTY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDifficulty(opt.value)}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition ${
                          difficulty === opt.value
                            ? opt.color + " ring-2 ring-offset-1 ring-current"
                            : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thời gian (ms)
                  </label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) =>
                      setTimeLimit(
                        Math.max(1, parseInt(e.target.value) || 1000),
                      )
                    }
                    min={1}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bộ nhớ (MB)
                  </label>
                  <input
                    type="number"
                    value={memoryLimit}
                    onChange={(e) =>
                      setMemoryLimit(
                        Math.max(1, parseInt(e.target.value) || 256),
                      )
                    }
                    min={1}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Constraints */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-navy-600 mb-4">
                Ràng buộc
              </h2>
              <textarea
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                placeholder="VD: 1 <= nums.length <= 10^4&#10;-10^9 <= nums[i] <= 10^9"
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-gray-900"
              />
            </div>

            {/* Hints */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-navy-600 mb-4">
                Gợi ý
              </h2>
              <div className="space-y-3">
                {hints.map((hint, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3"
                  >
                    <span className="text-blue-600 font-medium text-sm mt-0.5">
                      #{i + 1}
                    </span>
                    <p className="flex-1 text-gray-700 text-sm">{hint}</p>
                    <button
                      type="button"
                      onClick={() => removeHint(i)}
                      className="text-red-400 hover:text-red-600 transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newHint}
                    onChange={(e) => setNewHint(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addHint();
                      }
                    }}
                    placeholder="Nhập gợi ý..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={addHint}
                    className="px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition"
                  >
                    Thêm
                  </button>
                </div>
              </div>
            </div>

            {/* Publish toggle */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-navy-600">
                    Công khai
                  </h2>
                  <p className="text-sm text-gray-500">
                    Sinh viên có thể nhìn thấy bài tập này
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublished(!isPublished)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    isPublished ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                      isPublished ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== FUNCTION SIGNATURE TAB ==================== */}
        {activeTab === "signature" && (
          <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-navy-600 mb-1">
                Function Signature
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Định nghĩa hàm để tự động sinh driver code khi chạy bài tập
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên hàm
                </label>
                <input
                  type="text"
                  value={functionName}
                  onChange={(e) => setFunctionName(e.target.value)}
                  placeholder="solution"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-gray-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kiểu trả về
                </label>
                <input
                  type="text"
                  value={outputType}
                  onChange={(e) => setOutputType(e.target.value)}
                  placeholder="int"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-gray-900 font-mono"
                />
              </div>
            </div>

            {/* Parameters */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Tham số
                </label>
                <button
                  type="button"
                  onClick={addParam}
                  className="text-sm text-navy-600 hover:text-navy-700 font-medium transition"
                >
                  + Thêm tham số
                </button>
              </div>

              {params.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  Chưa có tham số nào
                </p>
              ) : (
                <div className="space-y-2">
                  {params.map((param, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <span className="text-sm text-gray-400 w-6 text-center">
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) => updateParam(i, "name", e.target.value)}
                        placeholder="Tên tham số"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-gray-900 font-mono text-sm"
                      />
                      <input
                        type="text"
                        value={param.type}
                        onChange={(e) => updateParam(i, "type", e.target.value)}
                        placeholder="Kiểu dữ liệu"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent text-gray-900 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeParam(i)}
                        className="text-red-400 hover:text-red-600 p-1 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                Preview
              </p>
              <code className="text-sm text-navy-700 font-mono">
                {outputType} {functionName}(
                {params
                  .filter((p) => p.name && p.type)
                  .map((p) => `${p.type} ${p.name}`)
                  .join(", ")}
                )
              </code>
            </div>
          </div>
        )}

        {/* ==================== STARTER CODE TAB ==================== */}
        {activeTab === "starter" && (
          <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-navy-600 mb-1">
                  Starter Code
                </h2>
                <p className="text-sm text-gray-500">
                  Code mẫu hiển thị cho sinh viên khi bắt đầu làm bài
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowStarterCode(!showStarterCode);
                  if (!showStarterCode && starterCodeEntries.length === 0) {
                    addStarterCodeEntry();
                  }
                }}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  showStarterCode ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    showStarterCode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {showStarterCode && (
              <div className="space-y-4">
                {starterCodeEntries.map((entry, i) => (
                  <div
                    key={i}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <select
                        value={entry.language}
                        onChange={(e) =>
                          updateStarterCodeEntry(i, "language", e.target.value)
                        }
                        className="text-sm font-medium text-gray-700 bg-transparent border-none focus:ring-0 cursor-pointer"
                      >
                        {LANGUAGE_OPTIONS.map((lang) => (
                          <option
                            key={lang}
                            value={lang}
                            disabled={starterCodeEntries.some(
                              (e, idx) => idx !== i && e.language === lang,
                            )}
                          >
                            {lang}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeStarterCodeEntry(i)}
                        className="text-red-400 hover:text-red-600 text-sm transition"
                      >
                        Xóa
                      </button>
                    </div>
                    <textarea
                      value={entry.code}
                      onChange={(e) =>
                        updateStarterCodeEntry(i, "code", e.target.value)
                      }
                      placeholder={`// Starter code for ${entry.language}`}
                      rows={6}
                      className="w-full px-4 py-3 border-none focus:ring-0 font-mono text-sm text-gray-900 resize-none"
                    />
                  </div>
                ))}

                {starterCodeEntries.length < LANGUAGE_OPTIONS.length && (
                  <button
                    type="button"
                    onClick={addStarterCodeEntry}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-navy-600 hover:border-navy-300 transition text-sm"
                  >
                    + Thêm ngôn ngữ
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== SUBMIT BUTTON ==================== */}
        <div className="mt-8 flex items-center justify-end gap-4">
          <Link
            href={`/problems/${problem.slug}`}
            className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={
              updateMutation.isPending ||
              !title.trim() ||
              !slug.trim() ||
              !description.trim()
            }
            className="px-8 py-2.5 bg-navy-600 text-white rounded-lg hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center gap-2"
          >
            {updateMutation.isPending ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Đang cập nhật...
              </>
            ) : (
              "Cập nhật bài tập"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
