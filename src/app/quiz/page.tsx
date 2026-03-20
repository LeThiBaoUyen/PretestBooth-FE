import { Suspense } from "react";
import QuizScreen from "@/components/quiz/QuizScreen";

export default function QuizPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Đang tải...
        </div>
      }
    >
      <QuizScreen />
    </Suspense>
  );
}
