import React from "react";

interface ImportQuestionThemeProps {
  onImport: (file: File) => void;
}

const ImportQuestionTheme: React.FC<ImportQuestionThemeProps> = ({
  onImport,
}) => {
  return (
    <div className="mb-6">
      <label className="block text-navy-700 font-semibold mb-2">
        Tự import bộ câu hỏi
      </label>
      <input
        type="file"
        accept=".csv,.xlsx,.json"
        className="block w-full text-sm text-navy-700 border border-navy-200 rounded-lg cursor-pointer bg-white focus:outline-none focus:ring-2 focus:ring-navy-400"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onImport(e.target.files[0]);
          }
        }}
      />
      <p className="text-xs text-gray-500 mt-1">
        Hỗ trợ định dạng: CSV, Excel, JSON
      </p>
    </div>
  );
};

export default ImportQuestionTheme;
