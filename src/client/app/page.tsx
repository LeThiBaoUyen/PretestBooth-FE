import Header from "@/client/components/Header";
import Footer from "@/client/components/Footer";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-rose-50 via-white to-rose-100 min-h-screen pt-20 pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div>
                <h1 className="text-5xl md:text-6xl font-bold text-navy-600 mb-6 leading-tight">
                  PRETEST BOOTH
                </h1>
                <p className="text-2xl md:text-3xl text-navy-500 font-semibold mb-4">
                  Đánh giá năng lực sinh viên
                </p>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  Nền tảng đánh giá toàn diện giúp sinh viên Đại học Công nghiệp
                  TP.HCM phát triển kỹ năng, kiến thức và tự tin trong hành
                  trình học tập.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/register"
                    className="bg-navy-600 text-white px-8 py-4 rounded-lg hover:bg-navy-700 transition font-bold text-lg text-center"
                  >
                    Bắt đầu ngay
                  </Link>
                  <Link
                    href="#about"
                    className="border-2 border-navy-600 text-navy-600 px-8 py-4 rounded-lg hover:bg-navy-50 transition font-bold text-lg text-center"
                  >
                    Tìm hiểu thêm
                  </Link>
                </div>
              </div>

              {/* Right Hero Image */}
              <div className="relative">
                <div className="bg-gradient-to-br from-navy-400 to-navy-600 rounded-2xl p-8 shadow-2xl">
                  <div className="relative rounded-xl overflow-hidden aspect-square">
                    <img
                      src="/assets/hero.png"
                      alt="Sinh viên sẵn sàng"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-navy-600 mb-4">
                Tính năng nổi bật
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Những công cụ giúp bạn đạt được mục tiêu học tập
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-gradient-to-br from-rose-50 to-white p-8 rounded-xl border-2 border-rose-200 hover:shadow-lg transition">
                <div className="text-5xl mb-4">📊</div>
                <h3 className="text-2xl font-bold text-navy-600 mb-3">
                  Đánh giá Toàn diện
                </h3>
                <p className="text-gray-600">
                  Kiểm tra kiến thức, kỹ năng và năng lực chuyên môn một cách
                  chi tiết
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-gradient-to-br from-navy-50 to-white p-8 rounded-xl border-2 border-navy-200 hover:shadow-lg transition">
                <div className="text-5xl mb-4">⚡</div>
                <h3 className="text-2xl font-bold text-navy-600 mb-3">
                  Nhanh chóng & Hiệu quả
                </h3>
                <p className="text-gray-600">
                  Nhận kết quả ngay lập tức với phân tích chi tiết và đề xuất
                  cải thiện
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-gradient-to-br from-rose-50 to-white p-8 rounded-xl border-2 border-rose-200 hover:shadow-lg transition">
                <div className="text-5xl mb-4">🎯</div>
                <h3 className="text-2xl font-bold text-navy-600 mb-3">
                  Hướng dẫn rõ ràng
                </h3>
                <p className="text-gray-600">
                  Có kế hoạch phát triển cá nhân dựa trên kết quả đánh giá của
                  bạn
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-navy-600 to-navy-700 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              Sẵn sàng khám phá tiềm năng của bạn?
            </h2>
            <p className="text-xl text-gray-100 mb-8">
              Tham gia cộng đồng hàng nghìn sinh viên đã cải thiện kỹ năng của
              mình
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-4 rounded-lg font-bold text-lg transition"
              >
                Đăng ký miễn phí
              </Link>
              <Link
                href="/login"
                className="bg-white hover:bg-gray-100 text-navy-600 px-8 py-4 rounded-lg font-bold text-lg transition"
              >
                Đã có tài khoản? Đăng nhập
              </Link>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-20 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white p-12 rounded-2xl shadow-lg">
              <h2 className="text-4xl font-bold text-navy-600 mb-8">
                Về PRETEST BOOTH
              </h2>
              <div className="space-y-6 text-gray-700 text-lg">
                <p>
                  PRETEST BOOTH là nền tảng đánh giá năng lực sinh viên hiện đại
                  được phát triển bởi Đại học Công nghiệp TP.HCM nhằm hỗ trợ các
                  bạn sinh viên trong quá trình học tập và phát triển kỹ năng.
                </p>
                <p>
                  Với các công cụ đánh giá toàn diện, phân tích chi tiết và
                  hướng dẫn cá nhân hóa, chúng tôi giúp bạn hiểu rõ hơn về năng
                  lực của mình và lập kế hoạch phát triển hiệu quả.
                </p>
                <p>
                  Mục tiêu của chúng tôi là tạo ra một môi trường học tập tích
                  cực nơi mỗi sinh viên có thể phát triển hết tiềm năng của
                  mình.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
