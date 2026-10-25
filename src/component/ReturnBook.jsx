import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useBooks } from "../context/useBooks";
import { useLibrarySettings } from "../context/useLibrarySettings";

const isOverdue = (dueDate, status) => {
  if (status === "Returned") return false;
  if (!dueDate) return false;
  const today = new Date().toISOString().split("T")[0];
  return dueDate < today;
};

const getDaysOverdue = (dueDate) => {
  if (!dueDate) return 0;
  const today = new Date(new Date().toISOString().split("T")[0]);
  const due = new Date(dueDate);
  const diffTime = today - due;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const ReturnBook = () => {
  const navigate = useNavigate();
  const { issues, returnBook, books } = useBooks();
  const { settings } = useLibrarySettings();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Issued"); // Default to active 'Issued'
  const [sortBy, setSortBy] = useState("due-asc");
  const [confirmIssue, setConfirmIssue] = useState(null); // Selected issue for return confirmation
  const [isProcessing, setIsProcessing] = useState(false);

  // Statistics
  const activeIssuesCount = useMemo(
    () => issues.filter((i) => i.status === "Issued").length,
    [issues]
  );

  const overdueIssuesCount = useMemo(
    () => issues.filter((i) => isOverdue(i.dueDate, i.status)).length,
    [issues]
  );

  const returnedCount = useMemo(
    () => issues.filter((i) => i.status === "Returned").length,
    [issues]
  );

  // Filtered and Sorted Issues
  const filteredIssues = useMemo(() => {
    let result = issues.filter((issue) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        [
          issue.id,
          issue.bookTitle,
          issue.bookAuthor,
          issue.bookIsbn,
          issue.userId,
          issue.userName,
          issue.remarks,
        ].some((val) => String(val || "").toLowerCase().includes(q));

      let matchesStatus = true;
      if (statusFilter === "Issued") {
        matchesStatus = issue.status === "Issued";
      } else if (statusFilter === "Overdue") {
        matchesStatus = isOverdue(issue.dueDate, issue.status);
      } else if (statusFilter === "Returned") {
        matchesStatus = issue.status === "Returned";
      }

      return matchesSearch && matchesStatus;
    });

    result = [...result];

    switch (sortBy) {
      case "due-asc":
        result.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
        break;
      case "due-desc":
        result.sort((a, b) => (b.dueDate || "").localeCompare(a.dueDate || ""));
        break;
      case "issue-desc":
        result.sort((a, b) =>
          new Date(b.issueDate || b.createdAt || 0).getTime() -
          new Date(a.issueDate || a.createdAt || 0).getTime()
        );
        break;
      case "issue-asc":
        result.sort((a, b) =>
          new Date(a.issueDate || a.createdAt || 0).getTime() -
          new Date(b.issueDate || b.createdAt || 0).getTime()
        );
        break;
      case "book-asc":
        result.sort((a, b) => (a.bookTitle || "").localeCompare(b.bookTitle || ""));
        break;
      case "user-asc":
        result.sort((a, b) => (a.userId || "").localeCompare(b.userId || ""));
        break;
      default:
        break;
    }

    return result;
  }, [issues, search, statusFilter, sortBy]);

  // Handle Return Confirmation
  const handleConfirmReturn = () => {
    if (!confirmIssue) return;

    setIsProcessing(true);
    try {
      const updated = returnBook(confirmIssue.id);
      toast.success(
        `"${updated.bookTitle}" has been successfully returned by ${updated.userName || updated.userId}!`
      );
      setConfirmIssue(null);
    } catch (error) {
      console.error("Return failed:", error);
      toast.error(error.message || "Could not process return. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const closeConfirmationModal = () => {
    if (!isProcessing) {
      setConfirmIssue(null);
    }
  };

  return (
    <main className="app-page">
      <div className="app-container">
        {/* Page Header */}
        <header className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
          <div>
            <p className="page-eyebrow">{settings.libraryName} · Circulation Desk</p>
            <h1 className="page-title">Return Books</h1>
            <p className="page-description">
              Manage all active issues, monitor due dates, and process book returns with instant inventory updates.
            </p>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-primary px-3"
              onClick={() => navigate("/issue-book")}
            >
              <i className="bi bi-journal-arrow-up me-2" aria-hidden="true" />
              Issue a Book
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary px-3"
              onClick={() => navigate("/list-books")}
            >
              <i className="bi bi-collection me-2" aria-hidden="true" />
              Books
            </button>
          </div>
        </header>

        {/* Top Summary Metrics */}
        <section aria-label="Issues Summary" className="mb-4">
          <div className="row g-3">
            <div className="col-6 col-lg-3">
              <div
                className="surface-card p-3 d-flex align-items-center gap-3 cursor-pointer"
                style={{ cursor: "pointer" }}
                onClick={() => setStatusFilter("Issued")}
              >
                <div
                  className="rounded-3 bg-warning-subtle text-warning-emphasis d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 48, height: 48 }}
                >
                  <i className="bi bi-journal-arrow-up fs-4" />
                </div>
                <div>
                  <span className="text-secondary small d-block">Active Issues</span>
                  <span className="fs-4 fw-bold text-dark">{activeIssuesCount}</span>
                </div>
              </div>
            </div>

            <div className="col-6 col-lg-3">
              <div
                className="surface-card p-3 d-flex align-items-center gap-3"
                style={{ cursor: "pointer" }}
                onClick={() => setStatusFilter("Overdue")}
              >
                <div
                  className="rounded-3 bg-danger-subtle text-danger d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 48, height: 48 }}
                >
                  <i className="bi bi-clock-history fs-4" />
                </div>
                <div>
                  <span className="text-secondary small d-block">Overdue Books</span>
                  <span className="fs-4 fw-bold text-danger">{overdueIssuesCount}</span>
                </div>
              </div>
            </div>

            <div className="col-6 col-lg-3">
              <div
                className="surface-card p-3 d-flex align-items-center gap-3"
                style={{ cursor: "pointer" }}
                onClick={() => setStatusFilter("Returned")}
              >
                <div
                  className="rounded-3 bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 48, height: 48 }}
                >
                  <i className="bi bi-bookmark-check fs-4" />
                </div>
                <div>
                  <span className="text-secondary small d-block">Total Returns</span>
                  <span className="fs-4 fw-bold text-success">{returnedCount}</span>
                </div>
              </div>
            </div>

            <div className="col-6 col-lg-3">
              <div
                className="surface-card p-3 d-flex align-items-center gap-3"
                style={{ cursor: "pointer" }}
                onClick={() => setStatusFilter("All")}
              >
                <div
                  className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 48, height: 48 }}
                >
                  <i className="bi bi-arrow-left-right fs-4" />
                </div>
                <div>
                  <span className="text-secondary small d-block">All Records</span>
                  <span className="fs-4 fw-bold text-dark">{issues.length}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filter and Search Bar */}
        <section className="surface-card p-3 mb-4">
          <div className="row g-3 align-items-center">
            {/* Search Input */}
            <div className="col-12 col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search text-secondary" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by book, borrower, user ID, or issue ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setSearch("")}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Status Filter Buttons */}
            <div className="col-12 col-md-4">
              <div className="btn-group w-100" role="group">
                <button
                  type="button"
                  className={`btn btn-sm ${
                    statusFilter === "Issued" ? "btn-primary" : "btn-outline-secondary"
                  }`}
                  onClick={() => setStatusFilter("Issued")}
                >
                  Active ({activeIssuesCount})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${
                    statusFilter === "Overdue" ? "btn-danger" : "btn-outline-secondary"
                  }`}
                  onClick={() => setStatusFilter("Overdue")}
                >
                  Overdue ({overdueIssuesCount})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${
                    statusFilter === "Returned" ? "btn-success" : "btn-outline-secondary"
                  }`}
                  onClick={() => setStatusFilter("Returned")}
                >
                  Returned ({returnedCount})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${
                    statusFilter === "All" ? "btn-secondary" : "btn-outline-secondary"
                  }`}
                  onClick={() => setStatusFilter("All")}
                >
                  All ({issues.length})
                </button>
              </div>
            </div>

            {/* Sort Options */}
            <div className="col-12 col-md-3">
              <select
                className="form-select form-select-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="due-asc">Due Date (Earliest / Urgent)</option>
                <option value="due-desc">Due Date (Latest)</option>
                <option value="issue-desc">Issue Date (Newest first)</option>
                <option value="issue-asc">Issue Date (Oldest first)</option>
                <option value="book-asc">Book Title (A-Z)</option>
                <option value="user-asc">User ID (A-Z)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Issues List Table / Empty State */}
        {filteredIssues.length === 0 ? (
          <div className="surface-card p-5 text-center">
            <i className="bi bi-journal-check display-3 text-secondary mb-3 d-block" />
            <h5 className="fw-bold">No issue records found</h5>
            <p className="text-secondary mb-4">
              {search || statusFilter !== "All"
                ? "Try clearing your search term or switching the status filter tab."
                : "No books have been issued yet."}
            </p>
            <div className="d-flex justify-content-center gap-2">
              {(search || statusFilter !== "All") && (
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("All");
                  }}
                >
                  Reset Filters
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate("/issue-book")}
              >
                <i className="bi bi-journal-arrow-up me-2" />
                Issue a Book Now
              </button>
            </div>
          </div>
        ) : (
          <div className="surface-card overflow-hidden">
            <div className="table-responsive">
              <table className="table dashboard-table align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Issue ID & Date</th>
                    <th scope="col">Book Information</th>
                    <th scope="col">Borrower Details</th>
                    <th scope="col">Due Date</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-end">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.map((issue) => {
                    const overdue = isOverdue(issue.dueDate, issue.status);
                    const daysLate = overdue ? getDaysOverdue(issue.dueDate) : 0;
                    const isReturned = issue.status === "Returned";

                    // Check live available copies of this book for helpful tooltip/display
                    const book = books.find((b) => String(b.id) === String(issue.bookId));

                    return (
                      <tr key={issue.id}>
                        {/* Issue ID and Date */}
                        <td>
                          <span className="fw-bold font-monospace text-dark d-block">
                            #{issue.id}
                          </span>
                          <span className="text-secondary small">
                            Issued: {formatDate(issue.issueDate)}
                          </span>
                        </td>

                        {/* Book Information */}
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="rounded-2 bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{ width: 34, height: 34 }}
                            >
                              <i className="bi bi-book fs-6" />
                            </div>
                            <div>
                              <strong className="text-dark d-block">
                                {issue.bookTitle}
                              </strong>
                              <span className="text-secondary small">
                                {issue.bookAuthor || "Unknown"}
                                {issue.bookIsbn && ` · ISBN: ${issue.bookIsbn}`}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Borrower Details */}
                        <td>
                          <div>
                            <span className="badge bg-light text-dark border me-1">
                              {issue.userId}
                            </span>
                            <span className="fw-semibold text-dark">
                              {issue.userName || issue.userId}
                            </span>
                          </div>
                          {issue.remarks && (
                            <span
                              className="text-secondary small d-block text-truncate"
                              style={{ maxWidth: 220 }}
                              title={issue.remarks}
                            >
                              <i className="bi bi-chat-left-text me-1" />
                              {issue.remarks}
                            </span>
                          )}
                        </td>

                        {/* Due Date & Overdue Indicator */}
                        <td>
                          <div>
                            <span
                              className={`fw-semibold ${
                                overdue ? "text-danger" : "text-dark"
                              }`}
                            >
                              {formatDate(issue.dueDate)}
                            </span>
                            {overdue && (
                              <span className="badge bg-danger-subtle text-danger ms-2">
                                <i className="bi bi-exclamation-triangle-fill me-1" />
                                {daysLate} {daysLate === 1 ? "day" : "days"} overdue
                              </span>
                            )}
                          </div>
                          {isReturned && issue.returnDate && (
                            <span className="text-success small d-block">
                              <i className="bi bi-check-circle me-1" />
                              Returned on {formatDate(issue.returnDate)}
                            </span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td>
                          {isReturned ? (
                            <span className="badge rounded-pill bg-success-subtle text-success">
                              <i className="bi bi-check2 me-1" />
                              Returned
                            </span>
                          ) : overdue ? (
                            <span className="badge rounded-pill bg-danger-subtle text-danger">
                              <i className="bi bi-clock-history me-1" />
                              Overdue
                            </span>
                          ) : (
                            <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis">
                              <i className="bi bi-journal-arrow-up me-1" />
                              Active Issue
                            </span>
                          )}
                        </td>

                        {/* Action Column */}
                        <td className="text-end">
                          {isReturned ? (
                            <span className="badge bg-light text-secondary border px-3 py-2">
                              <i className="bi bi-check-all me-1 text-success" />
                              Completed
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-outline-success btn-sm px-3 fw-semibold"
                              onClick={() => setConfirmIssue(issue)}
                              title="Click to return this book"
                            >
                              <i className="bi bi-arrow-return-left me-1" />
                              Return Book
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RETURN CONFIRMATION MODAL */}
        {confirmIssue && (
          <>
            <div
              className="modal fade show d-block"
              tabIndex="-1"
              role="dialog"
              aria-modal="true"
              aria-labelledby="returnModalTitle"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeConfirmationModal();
              }}
            >
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow">
                  <div className="modal-body text-center p-4 p-md-5">
                    {/* Return Icon */}
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle text-success mb-3"
                      style={{ width: 68, height: 68 }}
                    >
                      <i className="bi bi-arrow-return-left fs-2" />
                    </div>

                    <h4 className="fw-bold mb-2" id="returnModalTitle">
                      Confirm Book Return
                    </h4>

                    <p className="text-secondary mb-3">
                      Are you sure you want to mark this book as returned by the borrower?
                    </p>

                    {/* Transaction Details Box */}
                    <div className="bg-light p-3 rounded-3 border text-start mb-3">
                      <div className="mb-2">
                        <span className="text-secondary small d-block">Book Title</span>
                        <strong className="text-dark fs-6">
                          {confirmIssue.bookTitle}
                        </strong>
                        <span className="text-secondary small d-block">
                          by {confirmIssue.bookAuthor || "Unknown"}
                        </span>
                      </div>

                      <div className="row g-2 pt-2 border-top">
                        <div className="col-6">
                          <span className="text-secondary small d-block">Borrower</span>
                          <strong className="text-dark small">
                            {confirmIssue.userName || confirmIssue.userId}
                          </strong>
                          <span className="text-muted d-block" style={{ fontSize: "0.78rem" }}>
                            ID: {confirmIssue.userId}
                          </span>
                        </div>
                        <div className="col-6">
                          <span className="text-secondary small d-block">Issue Date</span>
                          <span className="text-dark small">
                            {formatDate(confirmIssue.issueDate)}
                          </span>
                        </div>
                      </div>

                      <div className="row g-2 pt-2 border-top mt-2">
                        <div className="col-6">
                          <span className="text-secondary small d-block">Due Date</span>
                          <span
                            className={`small fw-semibold ${
                              isOverdue(confirmIssue.dueDate, confirmIssue.status)
                                ? "text-danger"
                                : "text-dark"
                            }`}
                          >
                            {formatDate(confirmIssue.dueDate)}
                          </span>
                        </div>
                        <div className="col-6">
                          <span className="text-secondary small d-block">Return Date</span>
                          <span className="text-success small fw-semibold">
                            Today ({formatDate(new Date())})
                          </span>
                        </div>
                      </div>

                      {isOverdue(confirmIssue.dueDate, confirmIssue.status) && (
                        <div className="alert alert-danger py-2 px-3 mt-3 mb-0 small">
                          <i className="bi bi-exclamation-octagon me-1" />
                          <strong>Overdue Notice:</strong> This title is{" "}
                          {getDaysOverdue(confirmIssue.dueDate)} days past due.
                        </div>
                      )}
                    </div>

                    <p className="small text-muted mb-4">
                      <i className="bi bi-info-circle me-1" />
                      Returning this title will automatically increase the available copies count by 1 in the catalog.
                    </p>

                    {/* Actions */}
                    <div className="d-flex justify-content-center gap-2">
                      <button
                        type="button"
                        className="btn btn-light border px-4"
                        onClick={closeConfirmationModal}
                        disabled={isProcessing}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-success px-4 fw-semibold"
                        onClick={handleConfirmReturn}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm me-2"
                              role="status"
                              aria-hidden="true"
                            />
                            Updating...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check2-circle me-2" />
                            Confirm Return
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-backdrop fade show" />
          </>
        )}
      </div>
    </main>
  );
};

export default ReturnBook;
