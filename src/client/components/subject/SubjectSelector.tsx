import React from "react";

interface SubjectSelectorProps {
  subjects: string[];
  selectedSubject: string;
  onSelect: (subject: string) => void;
}

const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  subjects,
  selectedSubject,
  onSelect,
}) => {
  return (
    <div className="mb-6">
      <label className="block text-navy-700 font-semibold mb-2">
        Chọn môn học
      </label>
      <select
        className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-400 bg-white text-navy-700"
        value={selectedSubject}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="">-- Chọn môn học --</option>
        {subjects.map((subject) => (
          <option key={subject} value={subject}>
            {subject}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SubjectSelector;
