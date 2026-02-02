import React from "react";

interface ExamSetSelectorProps {
  examSets: string[];
  selectedExamSet: string;
  onSelect: (examSet: string) => void;
}

const ExamSetSelector: React.FC<ExamSetSelectorProps> = ({
  examSets,
  selectedExamSet,
  onSelect,
}) => {
  return (
    <div className="mb-6">
      <label className="block text-navy-700 font-semibold mb-2">
        Chọn bộ đề
      </label>
      <select
        className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700"
        value={selectedExamSet}
        onChange={(e) => onSelect(e.target.value)}
        disabled={examSets.length === 0}
      >
        <option value="">-- Chọn bộ đề --</option>
        {examSets.map((set) => (
          <option key={set} value={set}>
            {set}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ExamSetSelector;
