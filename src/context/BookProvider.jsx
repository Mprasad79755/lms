import { useCallback, useMemo, useState } from "react";
import BookContext from "./bookContext";
import sampleBooks from "../data/sampleBooks.json";
import sampleIssues from "../data/sampleIssues.json";
import sampleUsers from "../data/sampleUsers.json";
import {
  generateDemoTransactions,
  syncBooksStockWithIssues,
} from "../services/circulationService";

const normalizeBook = (book, activeIssuesCount = 0) => {
  const qty = Number(book.quantity) > 0 ? Number(book.quantity) : 1;
  const totalCopies =
    book.totalCopies !== undefined ? Math.max(1, Number(book.totalCopies)) : qty;

  let availableCopies;
  if (book.availableCopies !== undefined) {
    availableCopies = Math.max(0, Math.min(Number(book.availableCopies), totalCopies));
  } else {
    availableCopies = Math.max(0, totalCopies - activeIssuesCount);
  }

  return {
    ...book,
    totalCopies,
    availableCopies,
    quantity: availableCopies, // sync for any legacy display
    status: availableCopies > 0 ? "Available" : "Out of Stock",
  };
};

const readIssues = () => {
  try {
    const stored = localStorage.getItem("library_issues");
    if (!stored) {
      localStorage.setItem("library_issues", JSON.stringify(sampleIssues));
      return sampleIssues;
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("Stored issues must be an array.");
    return parsed;
  } catch (error) {
    console.error("Unable to load issues from storage:", error);
    return sampleIssues;
  }
};

const initializeSampleBooks = (issues = []) => {
  const initialBooks = sampleBooks.map((book) => {
    const activeCount = issues.filter(
      (issue) => String(issue.bookId) === String(book.id) && issue.status === "Issued"
    ).length;
    return normalizeBook(book, activeCount);
  });

  try {
    localStorage.setItem("books", JSON.stringify(initialBooks));
  } catch (error) {
    console.error("Unable to save sample books to local storage.", error);
  }

  return initialBooks;
};

const readBooks = (issues = []) => {
  try {
    const storedBooks = localStorage.getItem("books");
    if (!storedBooks) return initializeSampleBooks(issues);

    const books = JSON.parse(storedBooks);
    if (!Array.isArray(books) || books.length === 0) {
      return initializeSampleBooks(issues);
    }

    return books.map((book) => {
      const activeCount = issues.filter(
        (issue) => String(issue.bookId) === String(book.id) && issue.status === "Issued"
      ).length;
      return normalizeBook(book, activeCount);
    });
  } catch (error) {
    console.error("Unable to load books from local storage.", error);
    return [];
  }
};

// eslint-disable-next-line react/prop-types
export const BookProvider = ({ children }) => {
  const [issues, setIssues] = useState(readIssues);
  const [books, setBooks] = useState(() => readBooks(issues));

  const persistBooks = useCallback((updatedBooks) => {
    localStorage.setItem("books", JSON.stringify(updatedBooks));
    setBooks(updatedBooks);
  }, []);

  const persistIssues = useCallback((updatedIssues) => {
    localStorage.setItem("library_issues", JSON.stringify(updatedIssues));
    setIssues(updatedIssues);
  }, []);

  const addBook = useCallback(
    (book) => {
      const qty = Math.max(1, Number(book.quantity) || 1);
      const newBook = normalizeBook({
        ...book,
        totalCopies: qty,
        availableCopies: qty,
        quantity: qty,
        status: "Available",
      });
      persistBooks([...books, newBook]);
    },
    [books, persistBooks]
  );

  const importBooks = useCallback(
    (incomingBooks) => {
      const existingIds = new Set(books.map((book) => String(book.id)));
      const existingIsbns = new Set(
        books
          .map((book) => book.isbn?.trim().toLowerCase())
          .filter(Boolean)
      );

      const additions = incomingBooks
        .filter((book) => {
          const isbn = book.isbn?.trim().toLowerCase();
          if (existingIds.has(String(book.id)) || (isbn && existingIsbns.has(isbn))) {
            return false;
          }
          existingIds.add(String(book.id));
          if (isbn) existingIsbns.add(isbn);
          return true;
        })
        .map((book) => normalizeBook(book, 0));

      if (additions.length > 0) {
        persistBooks([...books, ...additions]);
      }

      return additions.length;
    },
    [books, persistBooks]
  );

  const updateBook = useCallback(
    (id, updates) => {
      let bookFound = false;
      const updatedBooks = books.map((book) => {
        if (String(book.id) !== String(id)) return book;

        bookFound = true;
        const totalCopies =
          updates.totalCopies !== undefined
            ? Math.max(1, Number(updates.totalCopies))
            : updates.quantity !== undefined
            ? Math.max(1, Number(updates.quantity))
            : book.totalCopies ?? 1;

        // If totalCopies changed, adjust availableCopies by the difference
        const diff = totalCopies - (book.totalCopies ?? totalCopies);
        let availableCopies =
          updates.availableCopies !== undefined
            ? Number(updates.availableCopies)
            : (book.availableCopies ?? totalCopies) + diff;

        availableCopies = Math.max(0, Math.min(availableCopies, totalCopies));

        return {
          ...book,
          ...updates,
          id: book.id,
          totalCopies,
          availableCopies,
          quantity: availableCopies,
          status: availableCopies > 0 ? "Available" : "Out of Stock",
        };
      });

      if (!bookFound) {
        throw new Error("The book to update could not be found.");
      }

      persistBooks(updatedBooks);
    },
    [books, persistBooks]
  );

  const deleteBook = useCallback(
    (id) => {
      // Check if book has active issues
      const hasActiveIssues = issues.some(
        (issue) => String(issue.bookId) === String(id) && issue.status === "Issued"
      );
      if (hasActiveIssues) {
        throw new Error(
          "Cannot delete this book because it currently has active issued copies. Please return them first."
        );
      }

      const updatedBooks = books.filter((book) => String(book.id) !== String(id));
      if (updatedBooks.length === books.length) {
        throw new Error("The book to delete could not be found.");
      }

      persistBooks(updatedBooks);
    },
    [books, issues, persistBooks]
  );

  /**
   * ISSUE A BOOK
   * Decrements availableCopies by 1, tracks issue record.
   * Keeps totalCopies intact.
   */
  const issueBook = useCallback(
    ({ bookId, userId, userName, issueDate, dueDate, remarks }) => {
      const bookIndex = books.findIndex((b) => String(b.id) === String(bookId));
      if (bookIndex === -1) {
        throw new Error("Selected book was not found in library.");
      }

      const targetBook = books[bookIndex];
      const currentAvailable = targetBook.availableCopies ?? Number(targetBook.quantity) ?? 0;

      if (currentAvailable <= 0) {
        throw new Error(`"${targetBook.title}" has no available copies left to issue.`);
      }

      const newAvailable = currentAvailable - 1;
      const updatedBook = {
        ...targetBook,
        availableCopies: newAvailable,
        quantity: newAvailable,
        status: newAvailable > 0 ? "Available" : "Out of Stock",
      };

      const newIssue = {
        id: `ISS-${Date.now().toString().slice(-6)}`,
        bookId: String(targetBook.id),
        bookTitle: targetBook.title || targetBook.name || "Untitled Book",
        bookAuthor: targetBook.author || "Unknown",
        bookIsbn: targetBook.isbn || "",
        userId: String(userId).trim(),
        userName: userName?.trim() || String(userId).trim(),
        issueDate: issueDate || new Date().toISOString().split("T")[0],
        dueDate: dueDate || "",
        returnDate: null,
        status: "Issued",
        remarks: remarks?.trim() || "",
        createdAt: new Date().toISOString(),
      };

      const updatedBooks = [...books];
      updatedBooks[bookIndex] = updatedBook;

      const updatedIssues = [newIssue, ...issues];

      persistBooks(updatedBooks);
      persistIssues(updatedIssues);

      return newIssue;
    },
    [books, issues, persistBooks, persistIssues]
  );

  /**
   * RETURN A BOOK
   * Increments availableCopies by 1 (up to totalCopies), marks issue as Returned.
   * Keeps totalCopies intact.
   */
  const returnBook = useCallback(
    (issueId) => {
      const issueIndex = issues.findIndex((i) => String(i.id) === String(issueId));
      if (issueIndex === -1) {
        throw new Error("Issue transaction not found.");
      }

      const currentIssue = issues[issueIndex];
      if (currentIssue.status === "Returned") {
        throw new Error("This book has already been marked as returned.");
      }

      const updatedIssue = {
        ...currentIssue,
        status: "Returned",
        returnDate: new Date().toISOString(),
      };

      // Find the corresponding book to increment available copies
      const bookIndex = books.findIndex((b) => String(b.id) === String(currentIssue.bookId));
      let updatedBooks = books;

      if (bookIndex !== -1) {
        const targetBook = books[bookIndex];
        const total = targetBook.totalCopies ?? Number(targetBook.quantity) ?? 1;
        const currentAvailable = targetBook.availableCopies ?? 0;
        const newAvailable = Math.min(total, currentAvailable + 1);

        const updatedBook = {
          ...targetBook,
          availableCopies: newAvailable,
          quantity: newAvailable,
          status: "Available",
        };

        updatedBooks = [...books];
        updatedBooks[bookIndex] = updatedBook;
        persistBooks(updatedBooks);
      }

      const updatedIssues = [...issues];
      updatedIssues[issueIndex] = updatedIssue;
      persistIssues(updatedIssues);

      return updatedIssue;
    },
    [books, issues, persistBooks, persistIssues]
  );

  const getIssuesForBook = useCallback(
    (bookId) => issues.filter((i) => String(i.bookId) === String(bookId)),
    [issues]
  );

  const getIssuesForUser = useCallback(
    (userId) =>
      issues.filter(
        (i) => i.userId.toLowerCase() === String(userId).trim().toLowerCase()
      ),
    [issues]
  );

  /**
   * GENERATE FAKE / DEMO TRANSACTIONS
   * Creates a rich batch of 50 realistic issued, overdue, and returned records.
   * Automatically synchronizes each book's total and available copies.
   */
  const generateFakeTransactions = useCallback(
    (customUsers = [], count = 50) => {
      const targetBooks = books.length > 0 ? books : sampleBooks;
      const targetUsers = customUsers.length > 0 ? customUsers : sampleUsers;

      const newTransactions = generateDemoTransactions(targetBooks, targetUsers, count);
      const updatedBooks = syncBooksStockWithIssues(targetBooks, newTransactions);

      persistBooks(updatedBooks);
      persistIssues(newTransactions);

      const todayStr = new Date().toISOString().split("T")[0];
      const active = newTransactions.filter((t) => t.status === "Issued").length;
      const overdue = newTransactions.filter(
        (t) => t.status === "Issued" && t.dueDate && t.dueDate < todayStr
      ).length;
      const returned = newTransactions.filter((t) => t.status === "Returned").length;

      return {
        total: newTransactions.length,
        active,
        overdue,
        returned,
      };
    },
    [books, persistBooks, persistIssues]
  );

  /**
   * CLEAR ALL TRANSACTIONS
   * Removes all loan issues and resets availableCopies back to totalCopies for all books.
   */
  const clearIssues = useCallback(() => {
    const restoredBooks = books.map((b) => {
      const total =
        b.totalCopies !== undefined
          ? Math.max(1, Number(b.totalCopies))
          : Math.max(1, Number(b.quantity) || 1);
      return {
        ...b,
        totalCopies: total,
        availableCopies: total,
        quantity: total,
        status: "Available",
      };
    });

    persistBooks(restoredBooks);
    persistIssues([]);
    return true;
  }, [books, persistBooks, persistIssues]);

  const value = useMemo(
    () => ({
      books,
      issues,
      addBook,
      importBooks,
      updateBook,
      deleteBook,
      issueBook,
      returnBook,
      getIssuesForBook,
      getIssuesForUser,
      generateFakeTransactions,
      clearIssues,
    }),
    [
      books,
      issues,
      addBook,
      importBooks,
      updateBook,
      deleteBook,
      issueBook,
      returnBook,
      getIssuesForBook,
      getIssuesForUser,
      generateFakeTransactions,
      clearIssues,
    ]
  );

  return <BookContext.Provider value={value}>{children}</BookContext.Provider>;
};
