import { useContext } from "react";
import BookContext from "./bookContext";

export const useIssues = () => {
  const context = useContext(BookContext);
  if (!context) {
    throw new Error("useIssues must be used within a BookProvider.");
  }

  return {
    issues: context.issues,
    issueBook: context.issueBook,
    returnBook: context.returnBook,
    books: context.books,
    getIssuesForBook: context.getIssuesForBook,
    getIssuesForUser: context.getIssuesForUser,
    generateFakeTransactions: context.generateFakeTransactions,
    clearIssues: context.clearIssues,
  };
};
