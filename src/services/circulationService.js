import sampleBooks from "../data/sampleBooks.json";
import sampleUsers from "../data/sampleUsers.json";

/**
 * Returns a date string (YYYY-MM-DD) offset by a given number of days from today.
 */
export const getRelativeDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
};

/**
 * Returns an ISO timestamp string offset by a given number of days from today.
 */
export const getRelativeTimestamp = (offsetDays = 0, hour = 14, minute = 30) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const activeRemarks = [
  "Semester core subject reference book",
  "Lab assignment and programming exercises",
  "Faculty recommended reading for mid-term",
  "Data structures algorithm practice",
  "Extended loan for honors research project",
  "Competitive programming and GATE reference",
  "Computer networks protocol design study",
  "Database management systems semester course",
  "Operating systems internals & threads review",
  "Machine learning model tuning project",
  "Discrete mathematics theorem proof sets",
  "VLSI circuit design laboratory reference",
  "Signals & systems Fourier transform practice",
  "Thermodynamics principles for mechanical stream",
  "Financial management cases & ledger review",
  "Organizational leadership and business study",
  "Bioinformatics genomics sequence research",
  "Environmental engineering water resources paper",
];

const overdueRemarks = [
  "Overdue by 4 days - student notified via email",
  "Overdue by 8 days - first automated notice sent",
  "Critical overdue notice - please contact circulation desk",
  "Seminar reference - overdue renewal request pending",
  "Overdue by 12 days - patron SMS reminder dispatched",
  "Lab reference overdue - replacement fine initiated",
  "Overdue by 6 days - department advisor notified",
  "Final reminder issued to return to library desk",
  "Semester project reference overdue by 10 days",
  "Book recall notice sent - overdue by 15 days",
];

const returnedRemarks = [
  "Returned on time in pristine condition",
  "Returned via library drop-box; verified clean",
  "Returned on due date; barcode verified",
  "Returned in good shape; spine inspected",
  "Returned after semester end exams",
  "Returned on time; all pages intact",
  "Returned early before due date",
  "Returned in excellent condition - no markings",
  "Returned on time by student representative",
  "Renewed once, returned in clean condition",
  "Returned with minor shelf wear; approved",
  "Returned on due date; RFID tag checked",
  "Returned following final project presentation",
  "Returned on time via central drop box",
  "Returned in great condition after lab exam",
  "Returned on schedule; circulation cleared",
  "Returned on time with companion CD/DVD",
  "Returned early; account cleared for semester",
  "Returned in good order - stamped returned",
  "Returned after campus placement preparations",
  "Returned on time with renewal receipt",
  "Returned promptly; patron clearance issued",
];

/**
 * Generates a rich batch of 50 circulation transactions (Active, Overdue, Returned)
 * distributed across the books and 50 registered Indian users.
 */
export const generateDemoTransactions = (booksList = [], usersList = [], count = 50) => {
  const books = booksList.length > 0 ? booksList : sampleBooks;
  const users = usersList.length > 0 ? usersList : sampleUsers;

  const getBook = (index) => books[index % books.length];
  const getUser = (index) => users[index % users.length];

  // We distribute 50 transactions as:
  // - 18 Active (on time, due in 3 to 22 days)
  // - 10 Overdue (due 2 to 16 days ago, status Issued)
  // - 22 Returned (completed historical loans with return timestamps)
  const items = [];

  // 1. ACTIVE LOANS (18)
  for (let i = 0; i < 18; i++) {
    const issueOffset = -((i % 7) + 2); // -2 to -8 days ago
    const dueOffset = ((i * 3) % 18) + 5; // +5 to +22 days in future
    items.push({
      type: "active",
      bookIdx: i,
      userIdx: i,
      issueOffset,
      dueOffset,
      isReturned: false,
      remarks: activeRemarks[i % activeRemarks.length],
    });
  }

  // 2. OVERDUE LOANS (10)
  for (let i = 0; i < 10; i++) {
    const dueOffset = -(((i * 2) % 15) + 2); // -2 to -16 days in past
    const issueOffset = dueOffset - 14; // issued 14 days before due
    items.push({
      type: "overdue",
      bookIdx: (i + 3) % books.length,
      userIdx: i + 18, // users 18 to 27
      issueOffset,
      dueOffset,
      isReturned: false,
      remarks: overdueRemarks[i % overdueRemarks.length],
    });
  }

  // 3. RETURNED LOANS (22)
  for (let i = 0; i < 22; i++) {
    const returnOffset = -((i * 2) + 1); // returned 1 to 43 days ago
    const dueOffset = returnOffset + ((i % 3) - 1); // due near return date
    const issueOffset = dueOffset - 14; // issued 14 days before due
    items.push({
      type: "returned",
      bookIdx: (i + 5) % books.length,
      userIdx: (i + 28) % users.length, // users 28 to 49
      issueOffset,
      dueOffset,
      returnOffset,
      isReturned: true,
      remarks: returnedRemarks[i % returnedRemarks.length],
    });
  }

  // Slice to requested count (default 50)
  const selected = items.slice(0, count);

  return selected.map((item, idx) => {
    const book = getBook(item.bookIdx);
    const user = getUser(item.userIdx);
    const id = `ISS-30${String(idx + 1).padStart(2, "0")}`;

    const issueDate = getRelativeDate(item.issueOffset);
    const dueDate = getRelativeDate(item.dueOffset);
    const returnDate = item.isReturned
      ? getRelativeTimestamp(item.returnOffset, 14, 30)
      : null;

    return {
      id,
      bookId: String(book.id),
      bookTitle: book.title || book.name || "Untitled Book",
      bookAuthor: book.author || "Unknown Author",
      bookIsbn: book.isbn || "",
      userId: String(user.id),
      userName: user.name || String(user.id),
      issueDate,
      dueDate,
      returnDate,
      status: item.isReturned ? "Returned" : "Issued",
      remarks: item.remarks,
      createdAt: getRelativeTimestamp(item.issueOffset, 9, 30),
    };
  });
};

/**
 * Re-synchronizes book shelf counts (availableCopies, status, quantity)
 * against an array of circulation issues.
 */
export const syncBooksStockWithIssues = (booksList, issuesList) => {
  return booksList.map((book, idx) => {
    const activeCount = issuesList.filter(
      (issue) => String(issue.bookId) === String(book.id) && issue.status === "Issued"
    ).length;

    const existingTotal =
      book.totalCopies !== undefined
        ? Math.max(1, Number(book.totalCopies))
        : Math.max(1, Number(book.quantity) || 1);

    // Make book index 4 (sample-5) out of stock if active issues exist, so zero-stock behavior can be tested
    let totalCopies;
    if (idx === 4 && activeCount > 0) {
      totalCopies = activeCount; // completely out of stock (availableCopies = 0)
    } else {
      totalCopies = Math.max(existingTotal, activeCount + 2); // ensure healthy shelf availability
    }

    const availableCopies = Math.max(0, totalCopies - activeCount);

    return {
      ...book,
      totalCopies,
      availableCopies,
      quantity: availableCopies,
      status: availableCopies > 0 ? "Available" : "Out of Stock",
    };
  });
};
