import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useBooks } from "../context/useBooks";
import { useUsers } from "../context/useUsers";
import { useLibrarySettings } from "../context/useLibrarySettings";

const getTodayDate = () => new Date().toISOString().split("T")[0];

const getFutureDate = (daysAhead) => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split("T")[0];
};

const formatDateNice = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const calculateDurationDays = (startStr, endStr) => {
  if (!startStr || !endStr) return 0;
  try {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  } catch {
    return 0;
  }
};

const IssueBook = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialBookId = searchParams.get("bookId") || "";
  const initialUserId = searchParams.get("userId") || "";

  const { books, issueBook } = useBooks();
  const { users } = useUsers();
  const { settings } = useLibrarySettings();

  // Wizard Step: 1 = Book, 2 = User, 3 = Schedule, 4 = Review
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Book Selection State
  const [bookQuery, setBookQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedBookId, setSelectedBookId] = useState(initialBookId);

  // Step 2: User Selection State
  const [userMode, setUserMode] = useState("search"); // 'search' | 'manual'
  const [userQuery, setUserQuery] = useState("");
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [selectedUserObj, setSelectedUserObj] = useState(null);

  // Step 3: Dates & Remarks State
  const [issueDate, setIssueDate] = useState(getTodayDate());
  const [dueDate, setDueDate] = useState(() => getFutureDate(14));
  const [selectedPresetDays, setSelectedPresetDays] = useState(14);
  const [remarks, setRemarks] = useState("");

  // Step 4: Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedResult, setIssuedResult] = useState(null);

  // If initialBookId exists, preselect and move to step 1 selection
  useEffect(() => {
    if (initialBookId) {
      setSelectedBookId(initialBookId);
    }
  }, [initialBookId]);

  // If initialUserId exists, preselect user
  useEffect(() => {
    if (initialUserId && users.length > 0) {
      const match = users.find(
        (u) => u.id.toLowerCase() === initialUserId.toLowerCase()
      );
      if (match) {
        setUserId(match.id);
        setUserName(match.name);
        setSelectedUserObj(match);
      } else {
        setUserId(initialUserId);
      }
    }
  }, [initialUserId, users]);

  // Currently selected book object
  const selectedBook = useMemo(
    () => books.find((b) => String(b.id) === String(selectedBookId)) || null,
    [books, selectedBookId]
  );

  // Categories list
  const categories = useMemo(
    () => ["All", ...new Set(books.map((b) => b.category).filter(Boolean))].sort(),
    [books]
  );

  // Filtered books
  const filteredBooks = useMemo(() => {
    const q = bookQuery.trim().toLowerCase();
    return books.filter((b) => {
      const matchesCategory =
        categoryFilter === "All" || b.category === categoryFilter;
      const matchesSearch =
        !q ||
        [b.title, b.name, b.author, b.isbn, b.category].some((val) =>
          String(val || "").toLowerCase().includes(q)
        );
      return matchesCategory && matchesSearch;
    });
  }, [books, bookQuery, categoryFilter]);

  // Filtered Users directly from UserContext
  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.id, u.name, u.email, u.department, u.role, u.phone].some((val) =>
        String(val || "").toLowerCase().includes(q)
      )
    );
  }, [users, userQuery]);

  // Handle Preset Click
  const handleApplyPreset = (days) => {
    setSelectedPresetDays(days);
    setDueDate(getFutureDate(days));
  };

  // Step 1 Validation & Next
  const handleProceedToStep2 = () => {
    if (!selectedBook) {
      toast.error("Please choose a book from the list to continue.");
      return;
    }
    const avail = selectedBook.availableCopies ?? Number(selectedBook.quantity) ?? 0;
    if (avail <= 0) {
      toast.error(`"${selectedBook.title}" is out of stock (0 copies available).`);
      return;
    }
    setCurrentStep(2);
  };

  // Step 2 Validation & Next
  const handleProceedToStep3 = () => {
    if (!userId.trim()) {
      toast.error("Please enter or select a User ID.");
      return;
    }
    setCurrentStep(3);
  };

  // Step 3 Validation & Next
  const handleProceedToStep4 = () => {
    if (!issueDate) {
      toast.error("Please select an issue date.");
      return;
    }
    if (!dueDate) {
      toast.error("Please select a return due date.");
      return;
    }
    if (dueDate < issueDate) {
      toast.error("Due date cannot be earlier than issue date.");
      return;
    }
    setCurrentStep(4);
  };

  // Step 4 Final Submission
  const handleFinalSubmit = () => {
    if (!selectedBook || !userId.trim() || !issueDate || !dueDate) {
      toast.error("Missing required details to issue book.");
      return;
    }

    setIsSubmitting(true);
    try {
      const issue = issueBook({
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
      setIssuedResult(issue);
    } catch (error) {
      toast.error(error.message || "Failed to issue book.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset and issue another
  const handleResetForNewIssue = () => {
    setIssuedResult(null);
    setSelectedBookId("");
    setUserId("");
    setUserName("");
    setSelectedUserObj(null);
    setRemarks("");
    setIssueDate(getTodayDate());
    setDueDate(getFutureDate(14));
    setSelectedPresetDays(14);
    setCurrentStep(1);
  };

  const stepsMeta = [
    { number: 1, title: "Select Title", icon: "bi-book" },
    { number: 2, title: "Borrower Info", icon: "bi-person-badge" },
    { number: 3, title: "Loan Schedule", icon: "bi-calendar3" },
    { number: 4, title: "Review & Confirm", icon: "bi-shield-check" },
  ];

  return (
    <main className="app-page">
      <div className="app-container" style={{ maxWidth: 1040 }}>
        {/* Page Top Header */}
        <header className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
          <div>
            <p className="page-eyebrow">{settings.libraryName} · Circulation Desk</p>
            <h1 className="page-title">Issue a Book</h1>
            <p className="page-description">
              Follow the guided steps below to verify availability, assign a member, and issue a loan.
            </p>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary px-3"
              onClick={() => navigate("/return-book")}
            >
              <i className="bi bi-arrow-return-left me-2" />
              Return Desk
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary px-3"
              onClick={() => navigate("/list-books")}
            >
              <i className="bi bi-collection me-2" />
              All Books
            </button>
          </div>
        </header>

        {/* STEP PROGRESS BAR */}
        {!issuedResult && (
          <div className="surface-card p-3 p-md-4 mb-4">
            <div className="row g-2 align-items-center text-center">
              {stepsMeta.map((s) => {
                const isCompleted = currentStep > s.number;
                const isCurrent = currentStep === s.number;
                return (
                  <div className="col-3" key={s.number}>
                    <div
                      className={`p-2 rounded-3 transition-all ${
                        isCurrent
                          ? "bg-primary text-white shadow-sm"
                          : isCompleted
                          ? "bg-success-subtle text-success cursor-pointer"
                          : "text-muted"
                      }`}
                      style={{ cursor: isCompleted ? "pointer" : "default" }}
                      onClick={() => isCompleted && setCurrentStep(s.number)}
                      title={isCompleted ? `Click to return to Step ${s.number}` : undefined}
                    >
                      <div className="d-flex align-items-center justify-content-center gap-2">
                        <span
                          className={`rounded-circle d-inline-flex align-items-center justify-content-center fw-bold`}
                          style={{
                            width: 26,
                            height: 26,
                            fontSize: "0.8rem",
                            background: isCurrent
                              ? "rgba(255,255,255,0.25)"
                              : isCompleted
                              ? "#198754"
                              : "#e9ecef",
                            color: isCompleted ? "#fff" : undefined,
                          }}
                        >
                          {isCompleted ? <i className="bi bi-check-lg" /> : s.number}
                        </span>
                        <span className="fw-semibold small d-none d-md-inline">
                          {s.title}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUCCESS RECEIPT STATE */}
        {issuedResult ? (
          <div className="surface-card p-5 text-center shadow-sm">
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success text-white mb-3 shadow"
              style={{ width: 78, height: 78 }}
            >
              <i className="bi bi-check-lg display-4" />
            </div>

            <h2 className="fw-bold text-dark mb-2">Book Issued Successfully!</h2>
            <p className="text-secondary fs-6 mb-4">
              Loan record has been registered and inventory count has been automatically adjusted.
            </p>

            {/* Receipt Box */}
            <div
              className="bg-light p-4 rounded-4 border mx-auto text-start mb-4"
              style={{ maxWidth: 540 }}
            >
              <div className="d-flex justify-content-between align-items-center pb-3 border-bottom mb-3">
                <span className="text-secondary small fw-bold text-uppercase">
                  Transaction Receipt
                </span>
                <span className="badge bg-primary-subtle text-primary font-monospace">
                  #{issuedResult.id}
                </span>
              </div>

              <div className="mb-3">
                <span className="text-secondary small d-block">Issued Title</span>
                <strong className="fs-6 text-dark">{issuedResult.bookTitle}</strong>
                <span className="text-secondary small d-block">
                  by {issuedResult.bookAuthor}
                </span>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <span className="text-secondary small d-block">Borrower</span>
                  <strong className="text-dark">
                    {issuedResult.userName || issuedResult.userId}
                  </strong>
                  <span className="text-muted small d-block">ID: {issuedResult.userId}</span>
                </div>
                <div className="col-6">
                  <span className="text-secondary small d-block">Due Date</span>
                  <strong className="text-primary">{formatDateNice(issuedResult.dueDate)}</strong>
                </div>
              </div>

              <div className="p-2 rounded-3 bg-white border small text-muted">
                <i className="bi bi-info-circle text-primary me-1" />
                Available shelf stock for this title was reduced by 1. Return anytime from the Return Desk.
              </div>
            </div>

            {/* Actions */}
            <div className="d-flex flex-wrap justify-content-center gap-3">
              <button
                type="button"
                className="btn btn-primary px-4 py-2"
                onClick={handleResetForNewIssue}
              >
                <i className="bi bi-plus-circle me-2" />
                Issue Another Book
              </button>
              <button
                type="button"
                className="btn btn-outline-success px-4 py-2"
                onClick={() => navigate("/return-book")}
              >
                <i className="bi bi-arrow-return-left me-2" />
                Open Return Desk
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary px-4 py-2"
                onClick={() => navigate(`/books/${issuedResult.bookId}`)}
              >
                <i className="bi bi-pie-chart me-2" />
                View Book Trends
              </button>
            </div>
          </div>
        ) : (
          /* MULTI-STEP WIZARD CONTENT */
          <div>
            {/* ================= STEP 1: SELECT BOOK ================= */}
            {currentStep === 1 && (
              <div className="surface-card p-4 p-md-5">
                <div className="d-flex justify-content-between align-items-center pb-3 border-bottom mb-4">
                  <div>
                    <span className="badge bg-primary-subtle text-primary mb-1">Step 1 of 4</span>
                    <h3 className="fw-bold text-dark mb-0">Choose a Book to Issue</h3>
                  </div>
                  {selectedBook && (
                    <span className="badge bg-success-subtle text-success px-3 py-2">
                      <i className="bi bi-check2 me-1" /> 1 Title Selected
                    </span>
                  )}
                </div>

                {/* Selected Book Banner if already chosen */}
                {selectedBook && (
                  <div className="p-4 rounded-4 bg-light border border-primary-subtle mb-4 shadow-sm">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="rounded-3 bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: 56, height: 56 }}
                        >
                          <i className="bi bi-book-half fs-3" />
                        </div>
                        <div>
                          <span className="badge bg-primary mb-1">Selected Book</span>
                          <h5 className="fw-bold text-dark mb-1">
                            {selectedBook.title || selectedBook.name}
                          </h5>
                          <span className="text-secondary small">
                            by {selectedBook.author || "Unknown"}
                            {selectedBook.category && ` · ${selectedBook.category}`}
                            {selectedBook.isbn && ` · ISBN: ${selectedBook.isbn}`}
                          </span>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-3">
                        <div className="text-end">
                          <span className="text-secondary small d-block">Shelf Stock</span>
                          <span className="fw-bold fs-5 text-success">
                            {selectedBook.availableCopies ?? 0}
                            <span className="text-muted fs-6">
                              {" "}
                              / {selectedBook.totalCopies ?? selectedBook.quantity ?? 1} Copies
                            </span>
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => setSelectedBookId("")}
                        >
                          <i className="bi bi-x-circle me-1" />
                          Change
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Search Bar & Category Filters */}
                <div className="row g-3 mb-4">
                  <div className="col-12 col-md-7">
                    <div className="input-group">
                      <span className="input-group-text bg-white">
                        <i className="bi bi-search text-secondary" />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search books by title, author, category, ISBN..."
                        value={bookQuery}
                        onChange={(e) => setBookQuery(e.target.value)}
                        autoFocus
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
                  </div>

                  <div className="col-12 col-md-5">
                    <select
                      className="form-select"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat === "All" ? "All Categories" : cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Books Grid */}
                <div
                  className="border rounded-4 p-2 overflow-auto mb-4"
                  style={{ maxHeight: 380 }}
                >
                  {filteredBooks.length === 0 ? (
                    <div className="p-5 text-center text-secondary">
                      <i className="bi bi-search fs-2 text-muted d-block mb-2" />
                      No books found matching &quot;{bookQuery}&quot;.
                    </div>
                  ) : (
                    <div className="row g-2">
                      {filteredBooks.map((b) => {
                        const isSelected = String(b.id) === String(selectedBookId);
                        const avail = b.availableCopies ?? Number(b.quantity) ?? 0;
                        const total = b.totalCopies ?? Number(b.quantity) ?? 1;
                        const isAvailable = avail > 0;

                        return (
                          <div className="col-12 col-md-6" key={b.id}>
                            <div
                              className={`p-3 rounded-3 border h-100 transition-all ${
                                isSelected
                                  ? "border-primary bg-primary-subtle shadow-sm"
                                  : isAvailable
                                  ? "bg-white hover-shadow"
                                  : "bg-light opacity-75"
                              }`}
                              style={{
                                cursor: isAvailable ? "pointer" : "not-allowed",
                              }}
                              onClick={() => isAvailable && setSelectedBookId(String(b.id))}
                            >
                              <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                                <h6 className="fw-bold text-dark mb-1 text-truncate">
                                  {b.title || b.name}
                                </h6>
                                <span
                                  className={`badge ${
                                    isAvailable
                                      ? "bg-success-subtle text-success"
                                      : "bg-danger-subtle text-danger"
                                  }`}
                                >
                                  {avail} / {total}
                                </span>
                              </div>
                              <p className="text-secondary small mb-2">
                                <i className="bi bi-person me-1" />
                                {b.author || "Unknown"}
                                {b.category && ` · ${b.category}`}
                              </p>
                              <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                                <span className="small text-muted font-monospace">
                                  {b.isbn ? `ISBN: ${b.isbn}` : `#${b.id}`}
                                </span>
                                {isSelected ? (
                                  <span className="badge bg-primary">
                                    <i className="bi bi-check2 me-1" /> Selected
                                  </span>
                                ) : isAvailable ? (
                                  <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm py-0 px-2"
                                    style={{ fontSize: "0.8rem" }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedBookId(String(b.id));
                                    }}
                                  >
                                    Select
                                  </button>
                                ) : (
                                  <span className="text-danger small fw-semibold">
                                    Out of stock
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer Navigation */}
                <div className="d-flex justify-content-end gap-2 pt-3 border-top">
                  <button
                    type="button"
                    className="btn btn-primary px-4 py-2 fw-semibold"
                    disabled={!selectedBook || (selectedBook.availableCopies ?? 0) <= 0}
                    onClick={handleProceedToStep2}
                  >
                    Continue to Borrower Info
                    <i className="bi bi-arrow-right ms-2" />
                  </button>
                </div>
              </div>
            )}

            {/* ================= STEP 2: SELECT USER ================= */}
            {currentStep === 2 && (
              <div className="surface-card p-4 p-md-5">
                <div className="d-flex justify-content-between align-items-center pb-3 border-bottom mb-4">
                  <div>
                    <span className="badge bg-primary-subtle text-primary mb-1">Step 2 of 4</span>
                    <h3 className="fw-bold text-dark mb-0">Assign Member / Borrower</h3>
                  </div>
                  {userId && (
                    <span className="badge bg-success-subtle text-success px-3 py-2">
                      <i className="bi bi-check2 me-1" /> Member Assigned
                    </span>
                  )}
                </div>

                {/* Selected User Preview */}
                {userId && (
                  <div className="p-4 rounded-4 bg-light border border-success-subtle mb-4 shadow-sm">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: 52, height: 52 }}
                        >
                          <i className="bi bi-person-check fs-3" />
                        </div>
                        <div>
                          <span className="badge bg-success mb-1">Assigned Borrower</span>
                          <h5 className="fw-bold text-dark mb-0">
                            {userName || "Member"}
                          </h5>
                          <span className="text-secondary small">
                            User ID: <strong className="font-monospace text-dark">{userId}</strong>
                            {selectedUserObj?.department && ` · ${selectedUserObj.department}`}
                            {selectedUserObj?.role && ` (${selectedUserObj.role})`}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => {
                          setUserId("");
                          setUserName("");
                          setSelectedUserObj(null);
                        }}
                      >
                        <i className="bi bi-x-circle me-1" />
                        Change
                      </button>
                    </div>
                  </div>
                )}

                {/* Tabs to Choose: Directory vs Manual Entry */}
                <div className="btn-group w-100 mb-4" role="group">
                  <button
                    type="button"
                    className={`btn py-2 ${
                      userMode === "search" ? "btn-primary" : "btn-outline-secondary"
                    }`}
                    onClick={() => setUserMode("search")}
                  >
                    <i className="bi bi-people me-2" />
                    Search Member Directory ({users.length})
                  </button>
                  <button
                    type="button"
                    className={`btn py-2 ${
                      userMode === "manual" ? "btn-primary" : "btn-outline-secondary"
                    }`}
                    onClick={() => setUserMode("manual")}
                  >
                    <i className="bi bi-pencil-square me-2" />
                    Enter Custom User ID (Freeform)
                  </button>
                </div>

                {userMode === "search" ? (
                  <div>
                    <div className="input-group mb-3">
                      <span className="input-group-text bg-white">
                        <i className="bi bi-search text-secondary" />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by User ID, Name, Department, or Email..."
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        autoFocus
                      />
                      {userQuery && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setUserQuery("")}
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div
                      className="border rounded-4 p-2 overflow-auto mb-4"
                      style={{ maxHeight: 320 }}
                    >
                      {filteredUsers.length === 0 ? (
                        <div className="p-4 text-center text-secondary small">
                          No matching member found. You can switch to &quot;Enter Custom User
                          ID&quot; tab to type any identifier directly!
                        </div>
                      ) : (
                        <div className="row g-2">
                          {filteredUsers.map((u) => {
                            const isSelected = u.id === userId;
                            return (
                              <div className="col-12 col-md-6" key={u.id}>
                                <div
                                  className={`p-3 rounded-3 border h-100 cursor-pointer transition-all ${
                                    isSelected
                                      ? "border-primary bg-primary-subtle shadow-sm"
                                      : "bg-white hover-shadow"
                                  }`}
                                  onClick={() => {
                                    setUserId(u.id);
                                    setUserName(u.name);
                                    setSelectedUserObj(u);
                                  }}
                                >
                                  <div className="d-flex justify-content-between align-items-start mb-1">
                                    <strong className="text-dark">{u.name}</strong>
                                    <span className="badge bg-light text-dark border font-monospace">
                                      {u.id}
                                    </span>
                                  </div>
                                  <div className="text-secondary small mb-2">
                                    <span>{u.department}</span>
                                    {u.role && ` · ${u.role}`}
                                  </div>
                                  <div className="text-end pt-2 border-top">
                                    {isSelected ? (
                                      <span className="badge bg-success">
                                        <i className="bi bi-check2 me-1" /> Assigned
                                      </span>
                                    ) : (
                                      <span className="text-primary small fw-semibold">
                                        Click to Assign
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Manual User ID entry */
                  <div className="bg-light p-4 rounded-4 border mb-4">
                    <div className="alert alert-info py-2 px-3 small mb-3">
                      <i className="bi bi-info-circle me-1" />
                      <strong>Flexible Identification:</strong> No format check is enforced.
                      You can type any student ID, staff code, or name here. This can later
                      be hooked directly to your User Module.
                    </div>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold small">
                          User ID / Card Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. USR-901, CS2026-04, or john_doe"
                          value={userId}
                          onChange={(e) => setUserId(e.target.value)}
                          autoFocus
                          required
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold small">
                          Borrower Name (Optional)
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

                {/* Footer Navigation */}
                <div className="d-flex justify-content-between pt-3 border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-3"
                    onClick={() => setCurrentStep(1)}
                  >
                    <i className="bi bi-arrow-left me-2" />
                    Back to Book Selection
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary px-4 py-2 fw-semibold"
                    disabled={!userId.trim()}
                    onClick={handleProceedToStep3}
                  >
                    Continue to Schedule
                    <i className="bi bi-arrow-right ms-2" />
                  </button>
                </div>
              </div>
            )}

            {/* ================= STEP 3: SCHEDULE DATES ================= */}
            {currentStep === 3 && (
              <div className="surface-card p-4 p-md-5">
                <div className="d-flex justify-content-between align-items-center pb-3 border-bottom mb-4">
                  <div>
                    <span className="badge bg-primary-subtle text-primary mb-1">Step 3 of 4</span>
                    <h3 className="fw-bold text-dark mb-0">Loan Dates & Duration</h3>
                  </div>
                  <span className="badge bg-info-subtle text-info-emphasis px-3 py-2">
                    <i className="bi bi-clock me-1" />
                    {calculateDurationDays(issueDate, dueDate)} Days Loan
                  </span>
                </div>

                <div className="row g-4 mb-4">
                  {/* Issue Date */}
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold small">
                      Issue Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control form-control-lg"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      required
                    />
                    <span className="text-secondary small mt-1 d-block">
                      Date when title is delivered to member.
                    </span>
                  </div>

                  {/* Due Date */}
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold small">
                      Return Due Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control form-control-lg"
                      value={dueDate}
                      min={issueDate}
                      onChange={(e) => {
                        setDueDate(e.target.value);
                        setSelectedPresetDays(null);
                      }}
                      required
                    />
                    <span className="text-secondary small mt-1 d-block">
                      Expected return date to the library.
                    </span>
                  </div>
                </div>

                {/* Duration Presets */}
                <div className="bg-light p-3 rounded-4 border mb-4">
                  <label className="form-label fw-semibold small text-uppercase text-secondary d-block mb-2">
                    Quick Duration Presets
                  </label>
                  <div className="d-flex flex-wrap gap-2">
                    {[
                      { days: 7, label: "7 Days (1 Week)" },
                      { days: 14, label: "14 Days (Standard)" },
                      { days: 21, label: "21 Days (3 Weeks)" },
                      { days: 30, label: "30 Days (1 Month)" },
                      { days: 90, label: "90 Days (Semester)" },
                    ].map((p) => (
                      <button
                        type="button"
                        key={p.days}
                        className={`btn btn-sm ${
                          selectedPresetDays === p.days
                            ? "btn-primary shadow-sm"
                            : "btn-outline-secondary bg-white"
                        }`}
                        onClick={() => handleApplyPreset(p.days)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Remarks / Loan Notes */}
                <div className="mb-4">
                  <label className="form-label fw-semibold small">
                    Circulation Remarks / Notes (Optional)
                  </label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="e.g. Reference copy for final exam, lab project..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                  <div className="d-flex flex-wrap gap-1 mt-2">
                    {["Course Study", "Semester Project", "Exam Prep", "Faculty Reference"].map(
                      (tag) => (
                        <button
                          type="button"
                          key={tag}
                          className="btn btn-outline-secondary btn-sm py-0 px-2"
                          style={{ fontSize: "0.75rem" }}
                          onClick={() =>
                            setRemarks((prev) => (prev ? `${prev}, ${tag}` : tag))
                          }
                        >
                          + {tag}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Footer Navigation */}
                <div className="d-flex justify-content-between pt-3 border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-3"
                    onClick={() => setCurrentStep(2)}
                  >
                    <i className="bi bi-arrow-left me-2" />
                    Back to Borrower Info
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary px-4 py-2 fw-semibold"
                    onClick={handleProceedToStep4}
                  >
                    Review & Confirm
                    <i className="bi bi-arrow-right ms-2" />
                  </button>
                </div>
              </div>
            )}

            {/* ================= STEP 4: REVIEW & CONFIRM ================= */}
            {currentStep === 4 && (
              <div className="surface-card p-4 p-md-5">
                <div className="d-flex justify-content-between align-items-center pb-3 border-bottom mb-4">
                  <div>
                    <span className="badge bg-success-subtle text-success mb-1">Step 4 of 4</span>
                    <h3 className="fw-bold text-dark mb-0">Review & Finalize Issue</h3>
                  </div>
                  <span className="text-secondary small">Almost done!</span>
                </div>

                {/* Receipt Preview Card */}
                <div className="p-4 rounded-4 bg-light border mb-4 shadow-sm">
                  <h6 className="fw-bold text-uppercase text-secondary small mb-3">
                    Summary Verification
                  </h6>

                  <div className="row g-4">
                    {/* Book Card */}
                    <div className="col-12 col-md-6">
                      <div className="p-3 rounded-3 bg-white border h-100">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <span className="text-secondary small fw-bold text-uppercase">
                            1. Selected Title
                          </span>
                          <button
                            type="button"
                            className="btn btn-link p-0 text-decoration-none small"
                            onClick={() => setCurrentStep(1)}
                          >
                            Edit
                          </button>
                        </div>
                        <h6 className="fw-bold text-dark mb-1">
                          {selectedBook?.title || selectedBook?.name}
                        </h6>
                        <span className="text-secondary small d-block mb-2">
                          by {selectedBook?.author || "Unknown"}
                          {selectedBook?.category && ` · ${selectedBook?.category}`}
                        </span>
                        <div className="badge bg-success-subtle text-success">
                          Shelf stock after issue:{" "}
                          <strong>{(selectedBook?.availableCopies ?? 1) - 1}</strong> of{" "}
                          {selectedBook?.totalCopies ?? selectedBook?.quantity ?? 1}
                        </div>
                      </div>
                    </div>

                    {/* Member Card */}
                    <div className="col-12 col-md-6">
                      <div className="p-3 rounded-3 bg-white border h-100">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <span className="text-secondary small fw-bold text-uppercase">
                            2. Borrower Details
                          </span>
                          <button
                            type="button"
                            className="btn btn-link p-0 text-decoration-none small"
                            onClick={() => setCurrentStep(2)}
                          >
                            Edit
                          </button>
                        </div>
                        <h6 className="fw-bold text-dark mb-1">
                          {userName || userId}
                        </h6>
                        <span className="badge bg-light text-dark border font-monospace mb-2">
                          User ID: {userId}
                        </span>
                        {selectedUserObj?.department && (
                          <span className="text-muted small d-block">
                            Department: {selectedUserObj.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Schedule Card */}
                  <div className="p-3 rounded-3 bg-white border mt-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="text-secondary small fw-bold text-uppercase">
                        3. Schedule Timeline
                      </span>
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none small"
                        onClick={() => setCurrentStep(3)}
                      >
                        Edit
                      </button>
                    </div>

                    <div className="row g-2 align-items-center">
                      <div className="col-5">
                        <span className="text-secondary small d-block">Issue Date</span>
                        <strong className="text-dark">{formatDateNice(issueDate)}</strong>
                      </div>
                      <div className="col-2 text-center">
                        <i className="bi bi-arrow-right text-primary fs-5" />
                        <span className="small text-muted d-block" style={{ fontSize: "0.75rem" }}>
                          {calculateDurationDays(issueDate, dueDate)} Days
                        </span>
                      </div>
                      <div className="col-5 text-end">
                        <span className="text-secondary small d-block">Return Due Date</span>
                        <strong className="text-primary">{formatDateNice(dueDate)}</strong>
                      </div>
                    </div>

                    {remarks && (
                      <div className="mt-2 pt-2 border-top small text-secondary">
                        <i className="bi bi-chat-left-text me-1 text-primary" />
                        <strong>Notes:</strong> {remarks}
                      </div>
                    )}
                  </div>
                </div>

                {/* Final Notice */}
                <div className="alert alert-primary d-flex align-items-center gap-2 py-2 px-3 small mb-4">
                  <i className="bi bi-info-circle-fill fs-5" />
                  <span>
                    Clicking <strong>&quot;Confirm & Issue Book&quot;</strong> will decrement
                    the available book copies in stock and log the transaction for tracking.
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="d-flex justify-content-between pt-3 border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-3"
                    disabled={isSubmitting}
                    onClick={() => setCurrentStep(3)}
                  >
                    <i className="bi bi-arrow-left me-2" />
                    Back to Schedule
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary px-5 py-2 fw-semibold fs-6 shadow-sm"
                    disabled={isSubmitting}
                    onClick={handleFinalSubmit}
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
                        Confirm & Issue Book Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default IssueBook;
