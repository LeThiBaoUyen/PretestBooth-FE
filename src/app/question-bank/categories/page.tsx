"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Plus, Save, Trash2, PenSquare, Search } from "lucide-react";
import { useAuth } from "@/lib/hooks";
import { questionsApiClient } from "@/lib/api/questions";

export default function SubjectTopicManagementPage() {
  const { user, accessToken } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "LECTURER";

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [subjectKeyword, setSubjectKeyword] = useState("");
  const [topicKeyword, setTopicKeyword] = useState("");

  const [subjectName, setSubjectName] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);

  const [topicName, setTopicName] = useState("");
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const {
    data: subjects,
    isLoading: loadingSubjects,
    refetch: refetchSubjects,
  } = useQuery({
    queryKey: ["subjects-management"],
    queryFn: () => questionsApiClient.getSubjects(accessToken || undefined),
    enabled: Boolean(user),
  });

  const {
    data: topics,
    isLoading: loadingTopics,
    refetch: refetchTopics,
  } = useQuery({
    queryKey: ["topics-management", selectedSubjectId],
    queryFn: () => questionsApiClient.getTopicsBySubject(selectedSubjectId, accessToken || undefined),
    enabled: Boolean(user && selectedSubjectId),
  });

  const sortedSubjects = useMemo(() => {
    const q = subjectKeyword.trim().toLowerCase();
    const items = [...(subjects || [])].sort((a, b) => a.name.localeCompare(b.name, "vi"));
    if (!q) return items;
    return items.filter((s) => {
      const name = s.name.toLowerCase();
      const desc = (s.description || "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [subjects, subjectKeyword]);

  const filteredTopics = useMemo(() => {
    const q = topicKeyword.trim().toLowerCase();
    const items = topics || [];
    if (!q) return items;
    return items.filter((t) => t.name.toLowerCase().includes(q));
  }, [topics, topicKeyword]);

  const currentSubject = useMemo(() => {
    return sortedSubjects.find((s) => s.id === selectedSubjectId) || null;
  }, [sortedSubjects, selectedSubjectId]);

  const resetSubjectForm = () => {
    setSubjectName("");
    setSubjectDescription("");
    setEditingSubjectId(null);
  };

  const resetTopicForm = () => {
    setTopicName("");
    setEditingTopicId(null);
  };

  const handleSaveSubject = async () => {
    if (!canManage || !accessToken) return;

    const name = subjectName.trim();
    const description = subjectDescription.trim();
    if (!name) {
      alert("Tên môn học không được để trống");
      return;
    }

    setSaving(true);
    try {
      if (editingSubjectId) {
        await questionsApiClient.updateSubject(
          editingSubjectId,
          { name, description: description || null },
          accessToken,
        );
      } else {
        await questionsApiClient.createSubject(
          { name, description: description || null },
          accessToken,
        );
      }

      await refetchSubjects();
      resetSubjectForm();
    } catch (err: any) {
      alert(err.message || "Không thể lưu môn học");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    if (!canManage || !accessToken) return;
    if (!confirm(`Xóa môn học \"${name}\"?`)) return;

    setSaving(true);
    try {
      await questionsApiClient.deleteSubject(id, accessToken);
      if (selectedSubjectId === id) {
        setSelectedSubjectId("");
      }
      await refetchSubjects();
      await refetchTopics();
    } catch (err: any) {
      alert(err.message || "Không thể xóa môn học");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTopic = async () => {
    if (!canManage || !accessToken || !selectedSubjectId) return;

    const name = topicName.trim();
    if (!name) {
      alert("Tên chủ đề không được để trống");
      return;
    }

    setSaving(true);
    try {
      if (editingTopicId) {
        await questionsApiClient.updateTopic(editingTopicId, { name }, accessToken);
      } else {
        await questionsApiClient.createTopic(selectedSubjectId, { name }, accessToken);
      }

      await refetchTopics();
      await refetchSubjects();
      resetTopicForm();
    } catch (err: any) {
      alert(err.message || "Không thể lưu chủ đề");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTopic = async (id: string, name: string) => {
    if (!canManage || !accessToken) return;
    if (!confirm(`Xóa chủ đề \"${name}\"?`)) return;

    setSaving(true);
    try {
      await questionsApiClient.deleteTopic(id, accessToken);
      await refetchTopics();
      await refetchSubjects();
    } catch (err: any) {
      alert(err.message || "Không thể xóa chủ đề");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex flex-col">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-700">Quản lý Subject và Topic</h1>
          <p className="text-sm text-gray-600 mt-1">
            Quản trị cấu trúc phân loại để dùng thân thiện khi import Question/Problem (theo tên môn/chủ đề).
          </p>
          {!canManage && (
            <p className="text-xs text-amber-700 mt-1">Bạn đang ở chế độ xem, không có quyền chỉnh sửa.</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <FolderOpen className="w-5 h-5 mr-2 text-navy-600" />
                Subject
              </h2>
            </div>

            <div className="mb-4 flex items-center rounded-xl border border-slate-200 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={subjectKeyword}
                onChange={(e) => setSubjectKeyword(e.target.value)}
                placeholder="Lọc môn học theo tên/mô tả"
                className="ml-2 w-full border-0 p-0 text-sm outline-none"
              />
            </div>

            {canManage && (
              <div className="mb-4 rounded-xl border border-slate-200 p-3 space-y-3">
                <input
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Tên môn học"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <textarea
                  value={subjectDescription}
                  onChange={(e) => setSubjectDescription(e.target.value)}
                  placeholder="Mô tả môn học (tùy chọn)"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSubject}
                    disabled={saving}
                    className="inline-flex items-center rounded-lg bg-navy-600 px-3 py-2 text-xs font-bold text-white hover:bg-navy-700 disabled:opacity-60"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {editingSubjectId ? "Cập nhật Subject" : "Tạo Subject"}
                  </button>
                  {editingSubjectId && (
                    <button
                      onClick={resetSubjectForm}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
                    >
                      Hủy
                    </button>
                  )}
                </div>
              </div>
            )}

            {loadingSubjects ? (
              <div className="py-12 text-center text-gray-500">Đang tải subject...</div>
            ) : !sortedSubjects.length ? (
              <div className="py-12 text-center text-gray-500">Chưa có subject nào.</div>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-auto pr-1">
                {sortedSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className={`rounded-xl border p-3 ${selectedSubjectId === subject.id ? "border-navy-300 bg-navy-50" : "border-slate-200 bg-white"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => setSelectedSubjectId(subject.id)}
                        className="text-left"
                      >
                        <p className="font-semibold text-slate-900">{subject.name}</p>
                        {subject.description && <p className="mt-1 text-xs text-slate-600">{subject.description}</p>}
                        <p className="mt-1 text-[11px] text-slate-500">
                          Topics: {subject.topicCount || 0} | Questions: {subject.questionCount || 0}
                        </p>
                      </button>

                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingSubjectId(subject.id);
                              setSubjectName(subject.name || "");
                              setSubjectDescription(subject.description || "");
                            }}
                            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
                            title="Sửa subject"
                          >
                            <PenSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubject(subject.id, subject.name)}
                            className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                            title="Xóa subject"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Topic</h2>
              <span className="text-xs font-semibold text-slate-500">
                {currentSubject ? `Subject: ${currentSubject.name}` : "Chọn subject để quản lý topic"}
              </span>
            </div>

            {selectedSubjectId && (
              <div className="mb-4 flex items-center rounded-xl border border-slate-200 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={topicKeyword}
                  onChange={(e) => setTopicKeyword(e.target.value)}
                  placeholder="Lọc chủ đề theo tên"
                  className="ml-2 w-full border-0 p-0 text-sm outline-none"
                />
              </div>
            )}

            {canManage && selectedSubjectId && (
              <div className="mb-4 rounded-xl border border-slate-200 p-3 space-y-3">
                <input
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="Tên chủ đề"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveTopic}
                    disabled={saving}
                    className="inline-flex items-center rounded-lg bg-navy-600 px-3 py-2 text-xs font-bold text-white hover:bg-navy-700 disabled:opacity-60"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {editingTopicId ? "Cập nhật Topic" : "Tạo Topic"}
                  </button>
                  {editingTopicId && (
                    <button
                      onClick={resetTopicForm}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
                    >
                      Hủy
                    </button>
                  )}
                </div>
              </div>
            )}

            {!selectedSubjectId ? (
              <div className="py-16 text-center text-gray-500">Chọn một subject để xem topic.</div>
            ) : loadingTopics ? (
              <div className="py-16 text-center text-gray-500">Đang tải topic...</div>
            ) : !filteredTopics.length ? (
              <div className="py-16 text-center text-gray-500">Subject này chưa có topic nào.</div>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-auto pr-1">
                {filteredTopics.map((topic) => (
                  <div key={topic.id} className="rounded-xl border border-slate-200 p-3 bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{topic.name}</p>
                        <p className="text-[11px] text-slate-500">Questions: {topic.questionCount || 0}</p>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingTopicId(topic.id);
                              setTopicName(topic.name || "");
                            }}
                            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
                            title="Sửa topic"
                          >
                            <PenSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTopic(topic.id, topic.name)}
                            className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                            title="Xóa topic"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
