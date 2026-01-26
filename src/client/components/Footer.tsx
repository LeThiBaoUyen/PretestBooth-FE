import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-navy-600 text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="font-bold text-lg mb-4">Về PRETEST BOOTH</h3>
            <p className="text-gray-300 text-sm">
              Nền tảng đánh giá năng lực sinh viên hiện đại, giúp các bạn chuẩn
              bị tốt nhất cho tương lai.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-bold text-lg mb-4">Liên kết</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition">
                  Giới thiệu
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition">
                  Tính năng
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-bold text-lg mb-4">Hỗ trợ</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>
                <Link href="#" className="hover:text-white transition">
                  Câu hỏi thường gặp
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition">
                  Liên hệ
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition">
                  Điều khoản dịch vụ
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-lg mb-4">Liên hệ</h3>
            <p className="text-gray-300 text-sm mb-2">📧 info@iuhcm.edu.vn</p>
            <p className="text-gray-300 text-sm mb-2">📞 1900 1234</p>
            <p className="text-gray-300 text-sm">
              📍 TP. Hồ Chí Minh, Việt Nam
            </p>
          </div>
        </div>

        <div className="border-t border-navy-500 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-300 text-sm">
              © {currentYear} PRETEST BOOTH. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link
                href="#"
                className="text-gray-300 hover:text-white transition"
              >
                Facebook
              </Link>
              <Link
                href="#"
                className="text-gray-300 hover:text-white transition"
              >
                Twitter
              </Link>
              <Link
                href="#"
                className="text-gray-300 hover:text-white transition"
              >
                Instagram
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
