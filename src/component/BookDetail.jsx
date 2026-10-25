import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { books, issues, returnBook } = useBooks();
  const { settings } = useLibrarySettings();

  const [confirmReturnIssue, setConfirmReturnIssue] = useState(null);
  const [activeTab, setActiveTab] = useState("loans"); // 'loans' | 'history' | 'about'

  // Find book
  const book = useMemo(
    () => books.find((b) => String(b.id) === String(id)),
    [books, id]
  );

  // Issues specifically for this book
  const bookIssues = useMemo(() => {
    if (!book) return [];
    return issues.filter((i) => String(i.bookId) === String(book.id));
  }, [issues, book]);

  // Calculations & Trends
  const totalCopies = book ? (book.totalCopies ?? Number(book.quantity) ?? 1) : 0;
  const availableCopies = book ? (book.availableCopies ?? 0) : 0;
  const activeLoans = useMemo(
    () => bookIssues.filter((i) => i.status === "Issued"),
    [bookIssues]
  );
  const returnedHistory = useMemo(
    () => bookIssues.filter((i) => i.status === "Returned"),
    [bookIssues]
  );
  const overdueLoans = useMemo(
    () => activeLoans.filter((i) => isOverdue(i.dueDate, i.status)),
    [activeLoans]
  );

  const totalHistoricalCirculation = bookIssues.length;
  const utilizationPercentage =
    totalCopies > 0
      ? Math.min(100, Math.round(((totalCopies - availableCopies) / totalCopies) * 100))
      : 0;

  // Handle Return
  const handleReturnConfirm = () => {
    if (!confirmReturnIssue) return;
    try {
      returnBook(confirmReturnIssue.id);
      toast.success(
        `"${confirmReturnIssue.bookTitle}" returned successfully by ${
          confirmReturnIssue.userName || confirmReturnIssue.userId
        }!`
      );
      setConfirmReturnIssue(null);
    } catch (error) {
      toast.error(error.message || "Could not process return.");
    }
  };

  if (!book) {
    return (
      <main className="app-page">
        <div className="app-container text-center py-5">
          <div className="surface-card p-5">
            <i className="bi bi-journal-x display-3 text-secondary mb-3 d-block" />
            <h3 className="fw-bold mb-2">Book Not Found</h3>
            <p className="text-secondary mb-4">
              The book you are looking for does not exist or may have been removed.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/list-books")}
            >
              <i className="bi bi-arrow-left me-2" />
              Back to Collection
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app-page">
      <div className="app-container">
        {/* Navigation Breadcrumb / Top Bar */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => navigate("/list-books")}
          >
            <i className="bi bi-arrow-left me-2" />
            Back to Book Collection
          </button>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-primary px-3"
              disabled={availableCopies <= 0}
              onClick={() => navigate(`/issue-book?bookId=${book.id}`)}
            >
              <i className="bi bi-journal-arrow-up me-2" />
              {availableCopies > 0 ? "Issue This Title" : "Out of Stock"}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary px-3"
              onClick={() => navigate("/return-book")}
            >
              <i className="bi bi-arrow-return-left me-2" />
              Return Desk
            </button>
          </div>
        </div>

        {/* HERO TITLE CARD */}
        <div className="surface-card p-4 p-md-5 mb-4 position-relative overflow-hidden">
          <div className="row g-4 align-items-center">
            {/* Book Icon / Cover Art */}
            <div className="col-12 col-md-auto text-center text-md-start">
              <div
                className="rounded-4 bg-primary text-white d-inline-flex align-items-center justify-content-center shadow-sm"
                style={{
                  width: 110,
                  height: 140,
                  background: "linear-gradient(135deg, #365fe8 0%, #1e3bb3 100%)",
                }}
              >
                <div className="text-center">
                  <i className="bi bi-book-half display-5 d-block mb-1" />
                  <span style={{ fontSize: "0.68rem", letterSpacing: "0.08em" }} className="text-uppercase fw-bold opacity-75">
                    {book.category || "BOOK"}
                  </span>
                </div>
              </div>
            </div>

            {/* Book Title & Main Details */}
            <div className="col-12 col-md">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span
                  className={`badge rounded-pill px-3 py-2 ${
                    availableCopies <= 0
                      ? "bg-danger-subtle text-danger"
                      : availableCopies < totalCopies
                      ? "bg-warning-subtle text-warning-emphasis"
                      : "bg-success-subtle text-success"
                  }`}
                >
                  <i
                    className={`bi ${
                      availableCopies <= 0
                        ? "bi-exclamation-octagon"
                        : availableCopies < totalCopies
                        ? "bi-hourglass-split"
                        : "bi-check2-circle"
                    } me-1`}
                  />
                  {availableCopies <= 0
                    ? "Out of Stock (All Issued)"
                    : availableCopies < totalCopies
                    ? "Partially Available"
                    : "Fully Available"}
                </span>
                {book.category && (
                  <span className="badge bg-light text-dark border">
                    <i className="bi bi-tag me-1" />
                    {book.category}
                  </span>
                )}
                {book.isbn && (
                  <span className="badge bg-light text-secondary border font-monospace">
                    ISBN: {book.isbn}
                  </span>
                )}
              </div>

              <h1 className="page-title mb-2 fs-2 fw-bold text-dark">
                {book.title || book.name}
              </h1>

              <p className="text-secondary fs-6 mb-3">
                <i className="bi bi-person-fill text-primary me-2" />
                Authored by <strong className="text-dark">{book.author || "Unknown Author"}</strong>
                {book.publisher && (
                  <>
                    <span className="mx-2">·</span>
                    <i className="bi bi-building me-1" /> Published by {book.publisher}
                  </>
                )}
                {book.publishedYear && (
                  <>
                    <span className="mx-2">·</span>
                    <i className="bi bi-calendar3 me-1" /> Year: {book.publishedYear}
                  </>
                )}
              </p>

              {book.description && (
                <p className="text-muted small mb-0" style={{ maxWidth: 760 }}>
                  {book.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* CIRCULATION TRENDS & INVENTORY METRICS */}
        <section aria-label="Book Circulation Trends" className="mb-4">
          <div className="row g-3">
            {/* Total Inventory */}
            <div className="col-6 col-lg-3">
              <div className="surface-card p-3 p-md-4 h-100">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-secondary small fw-semibold">Total Stock</span>
                  <span className="rounded-3 p-2 bg-primary-subtle text-primary">
                    <i className="bi bi-layers-fill fs-5" />
                  </span>
                </div>
                <div className="fs-3 fw-bold text-dark">{totalCopies}</div>
                <span className="text-secondary small">Total copies owned</span>
              </div>
            </div>

            {/* Available on Shelf */}
            <div className="col-6 col-lg-3">
              <div className="surface-card p-3 p-md-4 h-100">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-secondary small fw-semibold">Available on Shelf</span>
                  <span className="rounded-3 p-2 bg-success-subtle text-success">
                    <i className="bi bi-check2-circle fs-5" />
                  </span>
                </div>
                <div className={`fs-3 fw-bold ${availableCopies > 0 ? "text-success" : "text-danger"}`}>
                  {availableCopies}
                </div>
                <span className="text-secondary small">
                  Ready to be issued immediately
                </span>
              </div>
            </div>

            {/* Currently Issued */}
            <div className="col-6 col-lg-3">
              <div className="surface-card p-3 p-md-4 h-100">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-secondary small fw-semibold">Currently Issued</span>
                  <span className="rounded-3 p-2 bg-warning-subtle text-warning-emphasis">
                    <i className="bi bi-journal-arrow-up fs-5" />
                  </span>
                </div>
                <div className="fs-3 fw-bold text-dark">{activeLoans.length}</div>
                <span className="text-secondary small">
                  {overdueLoans.length > 0 ? (
                    <strong className="text-danger">
                      <i className="bi bi-exclamation-circle me-1" />
                      {overdueLoans.length} overdue
                    </strong>
                  ) : (
                    "Active borrower loans"
                  )}
                </span>
              </div>
            </div>

            {/* Lifetime Issues */}
            <div className="col-6 col-lg-3">
              <div className="surface-card p-3 p-md-4 h-100">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-secondary small fw-semibold">Circulation Trend</span>
                  <span className="rounded-3 p-2 bg-info-subtle text-info-emphasis">
                    <i className="bi bi-graph-up-arrow fs-5" />
                  </span>
                </div>
                <div className="fs-3 fw-bold text-dark">{totalHistoricalCirculation}</div>
                <span className="text-secondary small">
                  Total times checked out
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* INVENTORY UTILIZATION PROGRESS BAR */}
        <div className="surface-card p-4 mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="fw-semibold text-dark small">
              <i className="bi bi-pie-chart me-2 text-primary" />
              Copy Utilization & Shelf Availability
            </span>
            <span className="small fw-bold">
              {availableCopies} of {totalCopies} Available ({100 - utilizationPercentage}%)
            </span>
          </div>
          <div className="progress" style={{ height: 12 }}>
            <div
              className="progress-bar bg-primary"
              role="progressbar"
              style={{ width: `${utilizationPercentage}%` }}
              aria-valuenow={utilizationPercentage}
              aria-valuemin="0"
              aria-valuemax="100"
              title={`Issued: ${activeLoans.length}`}
            />
            <div
              className="progress-bar bg-success"
              role="progressbar"
              style={{ width: `${100 - utilizationPercentage}%` }}
              aria-valuenow={100 - utilizationPercentage}
              aria-valuemin="0"
              aria-valuemax="100"
              title={`Available: ${availableCopies}`}
            />
          </div>
          <div className="d-flex justify-content-between align-items-center mt-2 small text-secondary">
            <span>
              <i className="bi bi-circle-fill text-primary me-1" style={{ fontSize: "0.6rem" }} />
              Borrowed ({activeLoans.length} copies)
            </span>
            <span>
              <i className="bi bi-circle-fill text-success me-1" style={{ fontSize: "0.6rem" }} />
              In Library ({availableCopies} copies)
            </span>
          </div>
        </div>

        {/* CIRCULATION TABS & DETAILS */}
        <div className="surface-card overflow-hidden">
          {/* Tabs Navigation */}
          <div className="border-bottom px-4 pt-3 bg-light">
            <ul className="nav nav-tabs border-0" role="tablist">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${
                    activeTab === "loans" ? "active text-primary" : "text-secondary"
                  }`}
                  onClick={() => setActiveTab("loans")}
                >
                  <i className="bi bi-journal-arrow-up me-2" />
                  Active Loans ({activeLoans.length})
                  {overdueLoans.length > 0 && (
                    <span className="badge bg-danger ms-2">{overdueLoans.length} Overdue</span>
                  )}
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${
                    activeTab === "history" ? "active text-primary" : "text-secondary"
                  }`}
                  onClick={() => setActiveTab("history")}
                >
                  <i className="bi bi-clock-history me-2" />
                  Returned History ({returnedHistory.length})
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${
                    activeTab === "about" ? "active text-primary" : "text-secondary"
                  }`}
                  onClick={() => setActiveTab("about")}
                >
                  <i className="bi bi-info-circle me-2" />
                  Book Specs & Metadata
                </button>
              </li>
            </ul>
          </div>

          {/* TAB 1: ACTIVE LOANS */}
          {activeTab === "loans" && (
            <div className="p-0">
              {activeLoans.length === 0 ? (
                <div className="p-5 text-center text-secondary">
                  <i className="bi bi-bookmark-check display-4 text-success d-block mb-3" />
                  <h6 className="fw-bold text-dark mb-1">All copies are in stock!</h6>
                  <p className="text-secondary small mb-3">
                    No active loan records currently exist for this title.
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary px-3"
                    onClick={() => navigate(`/issue-book?bookId=${book.id}`)}
                  >
                    <i className="bi bi-journal-arrow-up me-1" />
                    Issue This Book Now
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table dashboard-table align-middle mb-0">
                    <thead>
                      <tr>
                        <th scope="col" className="ps-4">Issue ID</th>
                        <th scope="col">Borrower Details</th>
                        <th scope="col">Issue Date</th>
                        <th scope="col">Due Date</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="pe-4 text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeLoans.map((loan) => {
                        const late = isOverdue(loan.dueDate, loan.status);
                        const daysLate = late ? getDaysOverdue(loan.dueDate) : 0;
                        return (
                          <tr key={loan.id}>
                            <td className="ps-4">
                              <span className="font-monospace fw-bold text-dark">
                                #{loan.id}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <span className="rounded-circle bg-light border p-1 d-inline-flex">
                                  <i className="bi bi-person text-secondary" />
                                </span>
                                <div>
                                  <strong className="text-dark d-block">
                                    {loan.userName || loan.userId}
                                  </strong>
                                  <span className="badge bg-light text-secondary border">
                                    ID: {loan.userId}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="text-secondary small">
                              {formatDate(loan.issueDate)}
                            </td>
                            <td>
                              <span className={late ? "text-danger fw-bold" : "text-dark"}>
                                {formatDate(loan.dueDate)}
                              </span>
                              {late && (
                                <span className="badge bg-danger-subtle text-danger ms-2">
                                  {daysLate} {daysLate === 1 ? "day" : "days"} late
                                </span>
                              )}
                            </td>
                            <td>
                              {late ? (
                                <span className="badge bg-danger-subtle text-danger rounded-pill">
                                  Overdue
                                </span>
                              ) : (
                                <span className="badge bg-warning-subtle text-warning-emphasis rounded-pill">
                                  Active Loan
                                </span>
                              )}
                            </td>
                            <td className="pe-4 text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-success px-3 fw-semibold"
                                onClick={() => setConfirmReturnIssue(loan)}
                              >
                                <i className="bi bi-arrow-return-left me-1" />
                                Return Book
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RETURNED HISTORY */}
          {activeTab === "history" && (
            <div className="p-0">
              {returnedHistory.length === 0 ? (
                <div className="p-5 text-center text-secondary">
                  <i className="bi bi-clock-history display-5 text-secondary d-block mb-3" />
                  <h6 className="fw-bold text-dark mb-1">No return records yet</h6>
                  <p className="text-secondary small mb-0">
                    Past returned transactions for this title will be archived here.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table dashboard-table align-middle mb-0">
                    <thead>
                      <tr>
                        <th scope="col" className="ps-4">Issue ID</th>
                        <th scope="col">Returned By</th>
                        <th scope="col">Issued On</th>
                        <th scope="col">Returned On</th>
                        <th scope="col" className="pe-4">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnedHistory.map((item) => (
                        <tr key={item.id}>
                          <td className="ps-4 font-monospace fw-semibold text-dark">
                            #{item.id}
                          </td>
                          <td>
                            <strong>{item.userName || item.userId}</strong>
                            <span className="text-secondary small d-block">
                              ID: {item.userId}
                            </span>
                          </td>
                          <td className="text-secondary small">
                            {formatDate(item.issueDate)}
                          </td>
                          <td>
                            <span className="text-success small fw-semibold">
                              <i className="bi bi-check2 me-1" />
                              {formatDate(item.returnDate)}
                            </span>
                          </td>
                          <td className="pe-4 text-secondary small">
                            {item.remarks || "Standard return"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SPECIFICATIONS */}
          {activeTab === "about" && (
            <div className="p-4 p-md-5">
              <div className="row g-4">
                <div className="col-12 col-md-6">
                  <h6 className="fw-bold small text-uppercase text-secondary mb-3">
                    Bibliographic Details
                  </h6>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-secondary">Full Title</span>
                      <strong className="text-dark">{book.title || book.name}</strong>
                    </li>
                    <li className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-secondary">Author</span>
                      <span className="text-dark">{book.author || "—"}</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-secondary">Category / Genre</span>
                      <span className="text-dark">{book.category || "General"}</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-secondary">ISBN Number</span>
                      <span className="font-monospace text-dark">{book.isbn || "—"}</span>
                    </li>
                  </ul>
                </div>

                <div className="col-12 col-md-6">
                  <h6 className="fw-bold small text-uppercase text-secondary mb-3">
                    Library Catalog Details
                  </h6>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-secondary">Publisher</span>
                      <span className="text-dark">{book.publisher || "—"}</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-secondary">Publication Year</span>
                      <span className="text-dark">{book.publishedYear || "—"}</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-secondary">Internal ID</span>
                      <span className="font-monospace text-dark">{book.id}</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-secondary">Added to Library</span>
                      <span className="text-dark">{formatDate(book.createdAt)}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RETURN CONFIRMATION MODAL */}
        {confirmReturnIssue && (
          <>
            <div
              className="modal fade show d-block"
              tabIndex="-1"
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setConfirmReturnIssue(null);
              }}
            >
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow">
                  <div className="modal-body text-center p-4 p-md-5">
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle text-success mb-3"
                      style={{ width: 64, height: 64 }}
                    >
                      <i className="bi bi-arrow-return-left fs-2" />
                    </div>
                    <h5 className="fw-bold mb-2">Confirm Return</h5>
                    <p className="text-secondary small mb-3">
                      Accept return of <strong>{confirmReturnIssue.bookTitle}</strong> from{" "}
                      <strong>{confirmReturnIssue.userName || confirmReturnIssue.userId}</strong>?
                    </p>
                    <div className="bg-light p-3 rounded-3 text-start small mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-secondary">Due Date:</span>
                        <span>{formatDate(confirmReturnIssue.dueDate)}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-secondary">Return Date:</span>
                        <span className="text-success fw-bold">Today</span>
                      </div>
                    </div>
                    <div className="d-flex justify-content-center gap-2">
                      <button
                        type="button"
                        className="btn btn-light border px-4"
                        onClick={() => setConfirmReturnIssue(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-success px-4"
                        onClick={handleReturnConfirm}
                      >
                        Confirm Return
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

export default BookDetail;
