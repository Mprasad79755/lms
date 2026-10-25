import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useBooks } from "../context/useBooks";
import { useLibrarySettings } from "../context/useLibrarySettings";
import { getUsers, searchUsers } from "../services/userService";

const getTodayDate = () => new Date().toISOString().split("T")[0];

const getFutureDate = (daysAhead) => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split("T")[0];
};

const IssueBook = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedBookId = searchParams.get("bookId");

  const { books, issueBook } = useBooks();
  const { settings } = useLibrarySettings();

  // Book Selection State
  const [bookQuery, setBookQuery] = useState("");
  const [selectedBookId, setSelectedBookId] = useState(preselectedBookId || "");

  // User Selection State
  const [userMode, setUserMode] = useState("search"); // 'search' | 'manual'
  const [userQuery, setUserQuery] = useState("");
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [selectedUserObj, setSelectedUserObj] = useState(null);

  // Issue Dates & Remarks
  const [issueDate, setIssueDate] = useState(getTodayDate());
  const [dueDate, setDueDate] = useState(() => getFutureDate(14));
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastIssuedRecord, setLastIssuedRecord] = useState(null);

  // Find currently selected book object
  const selectedBook = useMemo(
    () => books.find((b) => String(b.id) === String(selectedBookId)) || null,
    [books, selectedBookId]
  );

  // Filter books matching search query
  const filteredBooks = useMemo(() => {
    const q = bookQuery.trim().toLowerCase();
    if (!q) return books.slice(0, 8); // show initial 8 books

    return books.filter((book) =>
      [book.title, book.name, book.author, book.isbn, book.category].some((val) =>
        String(val || "").toLowerCase().includes(q)
      )
    );
  }, [books, bookQuery]);

  // Filter users matching search query
  const availableUsers = useMemo(() => {
    return searchUsers(userQuery);
  }, [userQuery]);

  // Handle selecting a user from the registered list
  const handleSelectUser = (user) => {
    setSelectedUserObj(user);
    setUserId(user.id);
    setUserName(user.name);
  };

  // Clear user selection
  const handleClearUser = () => {
    setSelectedUserObj(null);
    setUserId("");
    setUserName("");
  };

  // Submit Issue
  const handleIssueSubmit = (e) => {
    e.preventDefault();

    if (!selectedBook) {
      toast.error("Please search and select a book to issue.");
      return;
    }

    const available = selectedBook.availableCopies ?? Number(selectedBook.quantity) ?? 0;
    if (available <= 0) {
      toast.error(`"${selectedBook.title}" is currently out of stock (0 copies available).`);
      return;
    }

    if (!userId.trim()) {
      toast.error("Please specify a User ID (type any ID or select a user).");
      return;
    }

    if (!issueDate) {
      toast.error("Please specify an issue date.");
      return;
    }

    if (!dueDate) {
      toast.error("Please specify a return due date.");
      return;
    }

    if (new Date(dueDate) < new Date(issueDate)) {
      toast.error("Due date cannot be earlier than the issue date.");
      return;
    }

    setIsSubmitting(true);

    try {
      const issueRecord = issueBook({
        bookId: selectedBook.id,
        userId: userId.trim(),
        userName: userName.trim() || userId.trim(),
        issueDate,
        dueDate,
        remarks: remarks.trim(),
      });

      toast.success(
        `"${selectedBook.title}" successfully issued to ${userName.trim() || userId.trim()}!`
      );

      setLastIssuedRecord(issueRecord);

      // Reset form for next issue
      setSelectedBookId("");
      handleClearUser();
      setRemarks("");
      setDueDate(getFutureDate(14));
    } catch (error) {
      console.error("Failed to issue book:", error);
      toast.error(error.message || "Could not complete book issue. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="app-page">
      <div className="app-container">
        {/* Page Header */}
        <header className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
          <div>
            <p className="page-eyebrow">{settings.libraryName} · Circulation Desk</p>
            <h1 className="page-title">Issue a Book</h1>
            <p className="page-description">
              Search and select a book, assign it to a member by ID or name, and record the issue.
            </p>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary px-3"
              onClick={() => navigate("/return-book")}
            >
              <i className="bi bi-arrow-return-left me-2" aria-hidden="true" />
              Go to Return Desk
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary px-3"
              onClick={() => navigate("/list-books")}
            >
              <i className="bi bi-collection me-2" aria-hidden="true" />
              View All Books
            </button>
          </div>
        </header>

        {/* Success Banner if book was just issued */}
        {lastIssuedRecord && (
          <div className="alert alert-success d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 p-3 shadow-sm border-0">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44 }}
              >
                <i className="bi bi-check2 fs-4" />
              </div>
              <div>
                <strong className="d-block text-success-emphasis">
                  Transaction Recorded: #{lastIssuedRecord.id}
                </strong>
                <span className="small text-secondary">
                  <strong>{lastIssuedRecord.bookTitle}</strong> issued to{" "}
                  <strong>{lastIssuedRecord.userName}</strong> ({lastIssuedRecord.userId}).
                  Due on: <strong>{lastIssuedRecord.dueDate}</strong>.
                </span>
              </div>
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-success btn-sm px-3"
                onClick={() => navigate("/return-book")}
              >
                <i className="bi bi-arrow-return-left me-1" />
                View in Return Page
              </button>
              <button
                type="button"
                className="btn btn-outline-success btn-sm px-3"
                onClick={() => setLastIssuedRecord(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleIssueSubmit}>
          <div className="row g-4">
            {/* LEFT COLUMN: Book Selection & User Assignment */}
            <div className="col-12 col-lg-7">
              {/* SECTION 1: BOOK SELECTION */}
              <div className="surface-card mb-4 p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center"
                      style={{ width: 28, height: 28, fontSize: "0.85rem" }}
                    >
                      1
                    </span>
                    <h5 className="fw-bold mb-0">Select Book</h5>
                  </div>
                  {selectedBook && (
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-decoration-none p-0"
                      onClick={() => setSelectedBookId("")}
                    >
                      <i className="bi bi-x-circle me-1" /> Change Book
                    </button>
                  )}
                </div>

                {/* If book is selected, show highlighted selection card */}
                {selectedBook ? (
                  <div className="p-3 rounded-3 bg-light border border-primary-subtle">
                    <div className="d-flex align-items-start gap-3">
                      <div
                        className="rounded-3 bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 48, height: 48 }}
                      >
                        <i className="bi bi-book fs-4" />
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start">
                          <h6 className="fw-bold text-dark mb-1">
                            {selectedBook.title || selectedBook.name}
                          </h6>
                          <span
                            className={`badge ${
                              (selectedBook.availableCopies ?? 0) > 0
                                ? "bg-success-subtle text-success"
                                : "bg-danger-subtle text-danger"
                            }`}
                          >
                            {(selectedBook.availableCopies ?? 0) > 0
                              ? "Ready to Issue"
                              : "Out of Stock"}
                          </span>
                        </div>
                        <p className="text-secondary small mb-2">
                          <i className="bi bi-person me-1" />
                          {selectedBook.author || "Unknown Author"}
                          {selectedBook.category && (
                            <>
                              <span className="mx-2">·</span>
                              <i className="bi bi-tag me-1" />
                              {selectedBook.category}
                            </>
                          )}
                          {selectedBook.isbn && (
                            <>
                              <span className="mx-2">·</span>
                              <span>ISBN: {selectedBook.isbn}</span>
                            </>
                          )}
                        </p>

                        <div className="d-flex align-items-center gap-3 pt-2 border-top">
                          <div>
                            <span className="text-secondary small d-block">Available</span>
                            <span className="fw-bold text-success fs-6">
                              {selectedBook.availableCopies ?? 0}
                            </span>
                          </div>
                          <div className="vr" />
                          <div>
                            <span className="text-secondary small d-block">Total Copies</span>
                            <span className="fw-bold text-dark fs-6">
                              {selectedBook.totalCopies ?? selectedBook.quantity ?? 1}
                            </span>
                          </div>
                          {(selectedBook.availableCopies ?? 0) <= 0 && (
                            <span className="ms-auto text-danger small fw-semibold">
                              <i className="bi bi-exclamation-triangle me-1" />
                              Cannot issue: All copies are currently checked out
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Book Search Bar */}
                    <div className="input-group mb-3">
                      <span className="input-group-text bg-white">
                        <i className="bi bi-search text-secondary" />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search books by title, author, category, or ISBN..."
                        value={bookQuery}
                        onChange={(e) => setBookQuery(e.target.value)}
                      />
                      {bookQuery && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setBookQuery("")}
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Book Search Results */}
                    <div
                      className="border rounded-3 overflow-hidden"
                      style={{ maxHeight: 310, overflowY: "auto" }}
                    >
                      {filteredBooks.length === 0 ? (
                        <div className="p-4 text-center text-secondary">
                          <i className="bi bi-search fs-2 d-block mb-2 text-muted" />
                          No books found matching &quot;{bookQuery}&quot;.
                        </div>
                      ) : (
                        <ul className="list-group list-group-flush mb-0">
                          {filteredBooks.map((book) => {
                            const avail =
                              book.availableCopies ?? Number(book.quantity) ?? 0;
                            const total =
                              book.totalCopies ?? Number(book.quantity) ?? 1;
                            const isAvailable = avail > 0;

                            return (
                              <li
                                key={book.id}
                                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3"
                              >
                                <div>
                                  <h6 className="fw-semibold text-dark mb-1">
                                    {book.title || book.name}
                                  </h6>
                                  <div className="text-secondary small d-flex flex-wrap gap-2 align-items-center">
                                    <span>
                                      <i className="bi bi-person me-1" />
                                      {book.author}
                                    </span>
                                    {book.category && (
                                      <span className="badge bg-light text-secondary border">
                                        {book.category}
                                      </span>
                                    )}
                                    {book.isbn && <span>ISBN: {book.isbn}</span>}
                                  </div>
                                </div>

                                <div className="d-flex align-items-center gap-3 ms-2">
                                  <div className="text-end">
                                    <span
                                      className={`badge ${
                                        isAvailable
                                          ? "bg-success-subtle text-success"
                                          : "bg-danger-subtle text-danger"
                                      }`}
                                    >
                                      {avail} / {total} Available
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary px-3"
                                    disabled={!isAvailable}
                                    onClick={() => setSelectedBookId(String(book.id))}
                                    title={
                                      isAvailable
                                        ? "Select this book for issue"
                                        : "No copies available"
                                    }
                                  >
                                    Select
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: USER ASSIGNMENT */}
              <div className="surface-card p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center"
                      style={{ width: 28, height: 28, fontSize: "0.85rem" }}
                    >
                      2
                    </span>
                    <h5 className="fw-bold mb-0">Borrower / User Details</h5>
                  </div>
                  {userId && (
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-decoration-none p-0"
                      onClick={handleClearUser}
                    >
                      <i className="bi bi-x-circle me-1" /> Change User
                    </button>
                  )}
                </div>

                {/* If user is selected or entered */}
                {userId ? (
                  <div className="p-3 rounded-3 bg-light border border-success-subtle mb-3">
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 44, height: 44 }}
                      >
                        <i className="bi bi-person-check fs-4" />
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-center">
                          <h6 className="fw-bold text-dark mb-0">
                            {userName || "Member"}
                          </h6>
                          <span className="badge bg-primary-subtle text-primary">
                            User ID: {userId}
                          </span>
                        </div>
                        {selectedUserObj && (
                          <div className="text-secondary small mt-1">
                            <span>{selectedUserObj.department}</span>
                            {selectedUserObj.email && (
                              <>
                                <span className="mx-2">·</span>
                                <span>{selectedUserObj.email}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Navigation Tabs between Search & Manual Input */}
                    <div className="btn-group w-100 mb-3" role="group">
                      <button
                        type="button"
                        className={`btn btn-sm ${
                          userMode === "search" ? "btn-primary" : "btn-outline-secondary"
                        }`}
                        onClick={() => setUserMode("search")}
                      >
                        <i className="bi bi-people me-1" /> Search Member Directory
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${
                          userMode === "manual" ? "btn-primary" : "btn-outline-secondary"
                        }`}
                        onClick={() => setUserMode("manual")}
                      >
                        <i className="bi bi-pencil-square me-1" /> Enter Custom User ID
                      </button>
                    </div>

                    {userMode === "search" ? (
                      <div>
                        <div className="input-group mb-2">
                          <span className="input-group-text bg-white">
                            <i className="bi bi-search text-secondary" />
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Search by User ID, Name, Department, or Email..."
                            value={userQuery}
                            onChange={(e) => setUserQuery(e.target.value)}
                          />
                        </div>

                        <div
                          className="border rounded-3 overflow-hidden"
                          style={{ maxHeight: 220, overflowY: "auto" }}
                        >
                          {availableUsers.length === 0 ? (
                            <div className="p-3 text-center text-secondary small">
                              No matching user found. You can switch to &quot;Enter Custom
                              User ID&quot; tab to type any ID directly.
                            </div>
                          ) : (
                            <ul className="list-group list-group-flush mb-0">
                              {availableUsers.map((user) => (
                                <li
                                  key={user.id}
                                  className="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-2 px-3"
                                >
                                  <div>
                                    <strong className="text-dark d-block">
                                      {user.name}
                                    </strong>
                                    <span className="text-secondary small">
                                      <span className="badge bg-light text-dark border me-2">
                                        {user.id}
                                      </span>
                                      {user.department}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => handleSelectUser(user)}
                                  >
                                    Assign
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Manual User ID Entry (Flexible for future user module integration) */
                      <div className="bg-light p-3 rounded-3 border">
                        <div className="alert alert-info py-2 px-3 small mb-3">
                          <i className="bi bi-info-circle me-1" />
                          <strong>Flexible User Entry:</strong> You can enter any User ID or
                          name without restrictions. Later, this connects directly with your
                          User Module.
                        </div>

                        <div className="row g-2">
                          <div className="col-12 col-sm-6">
                            <label className="form-label small fw-semibold">
                              User ID / Card Number <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="e.g. USR-105 or 2026-CS-42"
                              value={userId}
                              onChange={(e) => setUserId(e.target.value)}
                              required
                            />
                          </div>
                          <div className="col-12 col-sm-6">
                            <label className="form-label small fw-semibold">
                              Member / Student Name (Optional)
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="e.g. John Doe"
                              value={userName}
                              onChange={(e) => setUserName(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Issue Schedule & Final Confirmation */}
            <div className="col-12 col-lg-5">
              <div className="surface-card p-4 sticky-top" style={{ top: 88 }}>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span
                    className="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center"
                    style={{ width: 28, height: 28, fontSize: "0.85rem" }}
                  >
                    3
                  </span>
                  <h5 className="fw-bold mb-0">Issue Schedule & Notes</h5>
                </div>

                {/* Dates */}
                <div className="mb-3">
                  <label htmlFor="issueDate" className="form-label small fw-semibold">
                    Issue Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    id="issueDate"
                    className="form-control"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="dueDate" className="form-label small fw-semibold">
                    Return Due Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    id="dueDate"
                    className="form-control"
                    value={dueDate}
                    min={issueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                  <div className="d-flex gap-1 mt-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm py-0 px-2"
                      style={{ fontSize: "0.75rem" }}
                      onClick={() => setDueDate(getFutureDate(7))}
                    >
                      +7 Days
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm py-0 px-2"
                      style={{ fontSize: "0.75rem" }}
                      onClick={() => setDueDate(getFutureDate(14))}
                    >
                      +14 Days (Standard)
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm py-0 px-2"
                      style={{ fontSize: "0.75rem" }}
                      onClick={() => setDueDate(getFutureDate(30))}
                    >
                      +30 Days
                    </button>
                  </div>
                </div>

                {/* Remarks */}
                <div className="mb-4">
                  <label htmlFor="remarks" className="form-label small fw-semibold">
                    Remarks / Notes (Optional)
                  </label>
                  <textarea
                    id="remarks"
                    className="form-control"
                    rows="2"
                    placeholder="e.g. Semester project reference, exam preparation..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>

                {/* Summary Box */}
                <div className="bg-light p-3 rounded-3 border mb-4">
                  <h6 className="fw-bold small text-secondary text-uppercase mb-2">
                    Issue Summary
                  </h6>
                  <div className="d-flex justify-content-between small py-1 border-bottom">
                    <span className="text-secondary">Selected Book:</span>
                    <strong className="text-dark text-truncate ms-2" style={{ maxWidth: 190 }}>
                      {selectedBook?.title || selectedBook?.name || "None selected"}
                    </strong>
                  </div>
                  <div className="d-flex justify-content-between small py-1 border-bottom">
                    <span className="text-secondary">Assigned User:</span>
                    <strong className="text-dark">
                      {userId ? `${userId} ${userName ? `(${userName})` : ""}` : "None"}
                    </strong>
                  </div>
                  <div className="d-flex justify-content-between small py-1 border-bottom">
                    <span className="text-secondary">Issue Date:</span>
                    <span className="text-dark">{issueDate || "Today"}</span>
                  </div>
                  <div className="d-flex justify-content-between small py-1">
                    <span className="text-secondary">Due Date:</span>
                    <strong className="text-primary">{dueDate || "Not set"}</strong>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fs-6 fw-semibold"
                  disabled={
                    isSubmitting ||
                    !selectedBook ||
                    (selectedBook.availableCopies ?? 0) <= 0 ||
                    !userId.trim()
                  }
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      />
                      Processing Issue...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-journal-arrow-up me-2" />
                      Issue Book Now
                    </>
                  )}
                </button>

                {(!selectedBook || !userId.trim()) && (
                  <p className="text-muted text-center small mt-2 mb-0">
                    {!selectedBook
                      ? "Select a book from the left to proceed."
                      : "Enter or select a user to proceed."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
};

export default IssueBook;
