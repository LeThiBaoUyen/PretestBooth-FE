"use client";

import { useState, useEffect } from "react";
import { FolderTree, Folder, Plus, Trash2 } from "lucide-react";
import Footer from "@/components/Footer";
import { useAuth } from "@/lib/hooks";
import { httpClient } from "@/lib/api/httpClient";

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: Category[];
}

export default function CategoryTreePage() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "LECTURER";
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Simple flatten / build tree locally assuming an endpoint returns all categories
  const fetchCategories = async () => {
    try {
      // Assuming a GET /api/categories exists as part of Phase 1
      const data = await httpClient.get<Category[]>("/api/categories");
      
      // Build tree
      const root: Category[] = [];
      const map = new Map<string, Category>();
      data.forEach(c => map.set(c.id, { ...c, children: [] }));
      
      data.forEach(c => {
        if (c.parentId) {
          map.get(c.parentId)?.children?.push(map.get(c.id)!);
        } else {
          root.push(map.get(c.id)!);
        }
      });
      setCategories(root);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]);

  const handleCreateNode = async (parentId: string | null) => {
    const name = prompt("Nhập tên danh mục mới:");
    if (!name) return;

    try {
      await httpClient.post("/api/categories", {
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        parentId
      });
      fetchCategories();
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Xóa danh mục này?")) return;
    try {
      await httpClient.delete(`/api/categories/${id}`);
      fetchCategories();
    } catch(e: any) {
      alert("Lỗi: " + e.message);
    }
  }

  const renderTree = (cats: Category[], depth = 0) => {
    return cats.map(c => (
      <div key={c.id} className="w-full">
        <div 
          className="flex items-center justify-between py-3 px-4 hover:bg-navy-50 border-b border-gray-100 transition group"
          style={{ paddingLeft: `${depth * 2 + 1}rem` }}
        >
          <div className="flex items-center">
            {c.children && c.children.length > 0 ? (
              <FolderTree className="w-5 h-5 text-navy-600 mr-3" />
            ) : (
              <Folder className="w-5 h-5 text-gray-400 mr-3" />
            )}
            <span className="font-bold text-gray-800">{c.name}</span>
            <span className="ml-3 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">/{c.slug}</span>
          </div>
          {canManage && (
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition">
              <button onClick={() => handleCreateNode(c.id)} className="p-1.5 text-navy-600 hover:bg-navy-100 rounded" title="Thêm danh mục con">
                <Plus className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Xóa">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        {c.children && c.children.length > 0 && (
          <div className="w-full">
            {renderTree(c.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy-600">Cây Danh Mục (Category Tree)</h1>
            <p className="text-gray-500 text-sm mt-1">Phân loại câu hỏi đa tầng, không giới hạn độ sâu.</p>
            {!canManage && (
              <p className="text-xs text-amber-700 mt-1">Bạn đang ở chế độ xem, chỉ giảng viên/quản trị viên mới có thể chỉnh sửa.</p>
            )}
          </div>
          {canManage && (
            <button 
              onClick={() => handleCreateNode(null)}
              className="flex items-center bg-navy-600 hover:bg-navy-700 text-white px-4 py-2 rounded-lg font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Thêm Danh Mục Gốc
            </button>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-gray-500">Đang tải cấu trúc danh mục...</div>
          ) : categories.length === 0 ? (
            <div className="p-20 text-center text-gray-500 border-2 border-dashed border-gray-200 m-4 rounded-xl">
              <FolderTree className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              Chưa có danh mục nào. Hãy tạo danh mục gốc đầu tiên!
            </div>
          ) : (
            <div className="divide-y divide-gray-100 flex flex-col">
              {renderTree(categories)}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
