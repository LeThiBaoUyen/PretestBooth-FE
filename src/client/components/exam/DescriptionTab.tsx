"use client";

import type { Problem } from "./types";

interface DescriptionTabProps {
  problem: Problem;
}

export default function DescriptionTab({ problem }: DescriptionTabProps) {
  const getDifficultyStyle = () => {
    switch (problem.difficulty) {
      case "Easy":
        return "bg-green-100 text-green-700 border-green-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Hard":
        return "bg-red-100 text-red-700 border-red-200";
    }
  };

  return (
    <div className="space-y-6 p-5">
      {/* Problem Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          {problem.id}. {problem.title}
        </h1>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyStyle()}`}
        >
          {problem.difficulty}
        </span>
      </div>

      {/* Description */}
      <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
        {problem.description.split("**").map((part, i) =>
          i % 2 === 1 ? (
            <code
              key={i}
              className="bg-navy-50 px-1.5 py-0.5 rounded text-navy-700 font-mono text-sm"
            >
              {part}
            </code>
          ) : (
            part
          ),
        )}
      </div>

      {/* Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Ví dụ</h3>
        {problem.examples.map((example, index) => (
          <div
            key={index}
            className="bg-gray-50 rounded-xl p-4 border border-gray-200"
          >
            <p className="text-navy-600 font-semibold mb-3">
              Ví dụ {index + 1}:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="text-gray-500 font-medium min-w-[60px]">
                  Input:
                </span>
                <code className="text-gray-800 font-mono bg-white px-2 py-1 rounded border border-gray-200">
                  {example.input}
                </code>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 font-medium min-w-[60px]">
                  Output:
                </span>
                <code className="text-gray-800 font-mono bg-white px-2 py-1 rounded border border-gray-200">
                  {example.output}
                </code>
              </div>
              {example.explanation && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="text-gray-500 font-medium">
                    Giải thích:{" "}
                  </span>
                  <span className="text-gray-700">{example.explanation}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Constraints */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Ràng buộc</h3>
        <ul className="space-y-2">
          {problem.constraints.map((constraint, index) => (
            <li key={index} className="flex items-start gap-2 text-gray-700">
              <span className="text-navy-600 mt-1">•</span>
              <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                {constraint}
              </code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
