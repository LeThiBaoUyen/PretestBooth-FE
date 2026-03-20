import { redirect } from "next/navigation";

export default function QuestionsRedirect() {
  redirect("/question-bank/questions");
}
