import { useNavigate } from "react-router-dom";
import { useBooks } from "../context/useBooks";
import { useLibrarySettings } from "../context/useLibrarySettings";

const Dashboard = () => {
  const navigate = useNavigate();
  const { books, issues } = useBooks();
  const { settings } = useLibrarySettings();

  const totalCopies = books.reduce(
    (total, book) => total + (book.totalCopies ?? Number(book.quantity) ?? 1),
    0
  );

  const availableCopies = books.reduce(
    (total, book) =>
      total +
      (book.availableCopies ??
        (book.status === "Issued" ? 0 : Number(book.quantity) ?? 1)),
    0
  );

  const activeIssues = issues.filter((i) => i.status === "Issued");
  const issuedCount = activeIssues.length;

  const todayStr = new Date().toISOString().split("T")[0];
  const overdueCount = activeIssues.filter(
    (i) => i.dueDate && i.dueDate < todayStr
  ).length;

  const stats = [
    {
      title: "Total Copies",
      count: totalCopies,
      icon: "bi bi-book",
      color: "primary",
      background: "bg-primary-subtle text-primary",
    },
    {
      title: "Unique Titles",
      count: books.length,
      icon: "bi bi-collection",
      color: "info",
      background: "bg-info-subtle text-info-emphasis",
    },
    {
      title: "Available on Shelf",
      count: availableCopies,
      icon: "bi bi-bookmark-check",
      color: "success",
      background: "bg-success-subtle text-success",
    },
    {
      title: "Currently Issued",
      count: issuedCount,
      icon: "bi bi-journal-arrow-up",
      color: "warning",
      background: "bg-warning-subtle text-warning-emphasis",
    },
  ];

  const recentBooks = [...books]
    .sort(
      (first, second) =>
        new Date(second.createdAt || 0).getTime() -
        new Date(first.createdAt || 0).getTime()
    )
    .slice(0, 5);

  const recentActiveIssues = [...activeIssues]
    .sort(
      (first, second) =>
        new Date(second.issueDate || second.createdAt || 0).getTime() -
        new Date(first.issueDate || first.createdAt || 0).getTime()
    )
    .slice(0, 5);

  return (
    <main className="app-page">
      <div className="app-container">
        {/* Header */}
        <header className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4 mb-lg-5">
          <div>
            <p className="page-eyebrow">{settings.libraryName}</p>
            <h1 className="page-title">Library Overview</h1>
            <p className="page-description">
              {settings.description ||
                "A clear snapshot of your collection, inventory, and circulation."}
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary px-3"
              onClick={() => navigate("/issue-book")}
            >
              <i className="bi bi-journal-arrow-up me-2" aria-hidden="true" />
              Issue Book
            </button>
            <button
              type="button"
              className="btn btn-outline-success px-3"
              onClick={() => navigate("/return-book")}
            >
              <i className="bi bi-arrow-return-left me-2" aria-hidden="true" />
              Return Book
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary px-3"
              onClick={() => navigate("/add-book")}
            >
              <i className="bi bi-plus-lg me-2" aria-hidden="true" />
              Add Book
            </button>
          </div>
        </header>

        {/* Collection & Circulation Summary */}
        <section aria-label="Collection summary" className="mb-4 mb-lg-5">
          <div className="row g-3">
            {stats.map((stat) => (
              <div className="col-6 col-xl-3" key={stat.title}>
                <article className="surface-card dashboard-stat">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="dashboard-stat-label">{stat.title}</span>
                    <span className={`dashboard-stat-icon ${stat.background}`}>
                      <i className={stat.icon} aria-hidden="true" />
                    </span>
                  </div>
                  <p className="dashboard-stat-value">{stat.count}</p>
                </article>
              </div>
            ))}
          </div>
        </section>

        {/* Overdue alert banner if any */}
        {overdueCount > 0 && (
          <div className="alert alert-danger d-flex align-items-center justify-content-between mb-4 p-3 shadow-sm border-0">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill fs-4 text-danger" />
              <div>
                <strong>Overdue Notice:</strong> There{" "}
                {overdueCount === 1
                  ? "is 1 book past its due date."
                  : `are ${overdueCount} books past their due dates.`}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-danger btn-sm px-3"
              onClick={() => navigate("/return-book")}
            >
              Review Overdue
            </button>
          </div>
        )}

        <div className="row g-4 mb-5">
          {/* Active Borrowers / Recent Issues */}
          <div className="col-12 col-xl-6">
            <section className="surface-card h-100" aria-labelledby="active-issues-title">
              <div className="dashboard-section-heading d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="h5 fw-bold mb-1" id="active-issues-title">
                    Active Issues
                  </h2>
                  <p className="small text-secondary mb-0">
                    {activeIssues.length
                      ? `${activeIssues.length} book(s) currently with borrowers.`
                      : "No books are currently issued."}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() => navigate("/return-book")}
                >
                  Manage Returns
                  <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
                </button>
              </div>

              {recentActiveIssues.length === 0 ? (
                <div className="p-4 text-center text-secondary">
                  <i className="bi bi-check-circle fs-3 text-success d-block mb-2" />
                  All books are in library stock.
                  <div className="mt-3">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => navigate("/issue-book")}
                    >
                      <i className="bi bi-journal-arrow-up me-1" />
                      Issue a book now
                    </button>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table dashboard-table mb-0">
                    <thead>
                      <tr>
                        <th scope="col" className="ps-4">Book</th>
                        <th scope="col">User</th>
                        <th scope="col">Due Date</th>
                        <th scope="col" className="pe-4 text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentActiveIssues.map((issue) => {
                        const isLate = issue.dueDate && issue.dueDate < todayStr;
                        return (
                          <tr key={issue.id}>
                            <td className="book-title-cell ps-4">
                              <span className="fw-semibold text-dark d-block text-truncate" style={{ maxWidth: 170 }}>
                                {issue.bookTitle}
                              </span>
                              <span className="text-secondary small font-monospace">
                                #{issue.id}
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border me-1">
                                {issue.userId}
                              </span>
                              <span className="small text-dark">{issue.userName}</span>
                            </td>
                            <td>
                              <span className={isLate ? "text-danger fw-bold" : "text-dark"}>
                                {issue.dueDate || "—"}
                              </span>
                              {isLate && (
                                <span className="badge bg-danger-subtle text-danger ms-1">
                                  Late
                                </span>
                              )}
                            </td>
                            <td className="pe-4 text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-success py-1 px-2"
                                onClick={() => navigate("/return-book")}
                              >
                                <i className="bi bi-arrow-return-left me-1" />
                                Return
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* Recently Added Books */}
          <div className="col-12 col-xl-6">
            <section className="surface-card h-100" aria-labelledby="recent-books-title">
              <div className="dashboard-section-heading d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="h5 fw-bold mb-1" id="recent-books-title">
                    Recently Added Books
                  </h2>
                  <p className="small text-secondary mb-0">
                    Latest additions in your catalog.
                  </p>
                </div>
                {books.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm px-3"
                    onClick={() => navigate("/list-books")}
                  >
                    View All Books
                    <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
                  </button>
                )}
              </div>

              {recentBooks.length === 0 ? (
                <div className="p-4 text-center text-secondary">
                  <i className="bi bi-journal-bookmark fs-3 text-secondary d-block mb-2" />
                  No books added yet.
                  <div className="mt-3">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => navigate("/add-book")}
                    >
                      <i className="bi bi-plus-lg me-1" />
                      Add a book
                    </button>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table dashboard-table mb-0">
                    <thead>
                      <tr>
                        <th scope="col" className="ps-4">Book</th>
                        <th scope="col">Author</th>
                        <th scope="col">Available</th>
                        <th scope="col" className="pe-4 text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBooks.map((book, index) => {
                        const avail = book.availableCopies ?? Number(book.quantity) ?? 0;
                        const total = book.totalCopies ?? Number(book.quantity) ?? 1;
                        return (
                          <tr key={book.id ?? `${book.title}-${index}`}>
                            <td className="book-title-cell ps-4">
                              <span className="fw-semibold text-dark d-block text-truncate" style={{ maxWidth: 170 }}>
                                {book.title || book.name || "Untitled book"}
                              </span>
                              <span className="text-secondary small">
                                {book.category || "—"}
                              </span>
                            </td>
                            <td className="text-secondary small">{book.author || "Unknown"}</td>
                            <td>
                              <span
                                className={`badge ${
                                  avail > 0
                                    ? "bg-success-subtle text-success"
                                    : "bg-danger-subtle text-danger"
                                }`}
                              >
                                {avail} / {total}
                              </span>
                            </td>
                            <td className="pe-4 text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary py-1 px-2"
                                disabled={avail <= 0}
                                onClick={() => navigate(`/issue-book?bookId=${book.id}`)}
                                title={avail > 0 ? "Issue this book" : "Out of stock"}
                              >
                                <i className="bi bi-journal-arrow-up me-1" />
                                Issue
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>

      </div>
    </main>
  );
};

export default Dashboard;
