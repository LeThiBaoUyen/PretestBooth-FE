"use client";

import { useState } from "react";

interface InputProps {
  type?: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  pattern?: string;
  error?: string;
}

export function FormInput({
  type = "text",
  name,
  placeholder,
  value,
  onChange,
  required = false,
  pattern,
  error,
}: InputProps) {
  return (
    <div>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        pattern={pattern}
        className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-navy-400 transition ${
          error
            ? "border-red-500 bg-red-50"
            : "border-gray-300 bg-white focus:border-navy-600"
        }`}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}

interface SubmitButtonProps {
  text: string;
  isLoading?: boolean;
}

export function SubmitButton({ text, isLoading = false }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="w-full bg-navy-600 hover:bg-navy-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2"
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
          Đang xử lý...
        </>
      ) : (
        text
      )}
    </button>
  );
}
