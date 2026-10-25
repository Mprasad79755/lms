import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useUsers } from "../context/useUsers";
import { useBooks } from "../context/useBooks";
import { useLibrarySettings } from "../context/useLibrarySettings";

const avatarGradients = [
  "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)",
  "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
  "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
  "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)",
  "linear-gradient(135deg, #14b8a6 0%, #059669 100%)",
];

const getAvatarGradient = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % avatarGradients.length;
  return avatarGradients[index];
};

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

const UserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getUserById, updateUser } = useUsers();
  const { issues, returnBook } = useBooks();
  const { settings } = useLibrarySettings();

  const [activeTab, setActiveTab] = useState("loans"); // 'loans' | 'history' | 'profile'
  const [confirmReturnIssue, setConfirmReturnIssue] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  // Retrieve user
  const user = useMemo(() => {
    return getUserById(id);
  }, [id, getUserById]);

  // Retrieve this user's issues
  const userIssues = useMemo(() => {
    const targetId = String(id || "").toLowerCase();
    return issues.filter((i) => String(i.userId).toLowerCase() === targetId);
  }, [issues, id]);

  const activeLoans = useMemo(
    () => userIssues.filter((i) => i.status === "Issued"),
    [userIssues]
  );

  const returnedHistory = useMemo(
    () => userIssues.filter((i) => i.status === "Returned"),
    [userIssues]
  );

  const overdueLoans = useMemo(
    () => activeLoans.filter((i) => isOverdue(i.dueDate, i.status)),
    [activeLoans]
  );

  // Handle Return from User Profile
  const handleReturnConfirm = () => {
    if (!confirmReturnIssue) return;
    try {
      returnBook(confirmReturnIssue.id);
      toast.success(
        `"${confirmReturnIssue.bookTitle}" successfully returned by ${user.name}!`
      );
      setConfirmReturnIssue(null);
    } catch (error) {
      toast.error(error.message || "Failed to return book.");
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      updateUser(editingUser.id, editingUser);
      toast.success("Member profile updated successfully.");
      setEditingUser(null);
    } catch (error) {
      toast.error(error.message || "Failed to update profile.");
    }
  };

  if (!user) {
    return (
      <main className="app-page">
        <div className="app-container text-center py-5">
          <div className="surface-card p-5">
            <i className="bi bi-person-x display-3 text-secondary mb-3 d-block" />
            <h3 className="fw-bold mb-2">Member Not Found</h3>
            <p className="text-secondary mb-4">
              The requested library patron record could not be found.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/users")}
            >
              <i className="bi bi-arrow-left me-2" />
              Back to Member Directory
            </button>
          </div>
        </div>
      </main>
    );
  }

  const avatarGradient = getAvatarGradient(user.name);

  return (
    <main className="app-page">
      <div className="app-container">
        {/* Navigation Breadcrumb */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => navigate("/users")}
          >
            <i className="bi bi-arrow-left me-2" />
            Back to Member Directory
          </button>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-primary px-3"
              onClick={() => navigate(`/issue-book?userId=${user.id}`)}
            >
              <i className="bi bi-journal-arrow-up me-2" />
              Issue Book to {user.name.split(" ")[0]}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary px-3"
              onClick={() => setEditingUser({ ...user })}
            >
              <i className="bi bi-pencil me-2" />
              Edit Profile
            </button>
          </div>
        </div>

        {/* PROFILE HERO CARD */}
        <div className="surface-card p-4 p-md-5 mb-4 position-relative overflow-hidden border-0 shadow-sm">
          <div className="row g-4 align-items-center">
            {/* Avatar */}
            <div className="col-12 col-md-auto text-center text-md-start">
              <div
                className="rounded-circle text-white d-inline-flex align-items-center justify-content-center shadow"
                style={{
                  width: 96,
                  height: 96,
                  fontSize: "2.4rem",
                  fontWeight: "bold",
                  background: avatarGradient,
                }}
              >
                {user.name.charAt(0)}
              </div>
            </div>

            {/* Profile Information */}
            <div className="col-12 col-md">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span className="badge bg-primary-subtle text-primary font-monospace px-3 py-1 fs-6">
                  {user.id}
                </span>
                <span className="badge bg-light text-dark border px-3 py-1 fs-6">
                  {user.role || "Student"}
                </span>
                {overdueLoans.length > 0 ? (
                  <span className="badge bg-danger-subtle text-danger px-3 py-1">
                    <i className="bi bi-exclamation-triangle-fill me-1" />
                    {overdueLoans.length} Overdue Book(s)
                  </span>
                ) : (
                  <span className="badge bg-success-subtle text-success px-3 py-1">
                    <i className="bi bi-check-circle me-1" />
                    Good Library Standing
                  </span>
                )}
              </div>

              <h1 className="page-title mb-2 fs-2 fw-bold text-dark">{user.name}</h1>

              <div className="d-flex flex-wrap gap-3 text-secondary small">
                <span>
                  <i className="bi bi-building me-1 text-primary" />
                  <strong>{user.department}</strong>
                </span>
                {user.email && (
                  <span>
                    <i className="bi bi-envelope me-1 text-primary" />
                    {user.email}
                  </span>
                )}
                {user.phone && (
                  <span>
                    <i className="bi bi-telephone me-1 text-primary" />
                    {user.phone}
                  </span>
                )}
                {user.joinedDate && (
                  <span>
                    <i className="bi bi-calendar3 me-1 text-primary" />
                    Member since {formatDate(user.joinedDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BORROWING STATS METRICS */}
        <section aria-label="Patron circulation metrics" className="mb-4">
          <div className="row g-3">
            {/* Active Loans */}
            <div className="col-6 col-lg-3">
              <div className="surface-card p-3 p-md-4 h-100 border-0 shadow-sm">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-secondary small fw-semibold">Currently Borrowed</span>
                  <span className="rounded-3 p-2 bg-warning-subtle text-warning-emphasis">
                    <i className="bi bi-journal-arrow-up fs-5" />
                  </span>
                </div>
                <div className="fs-3 fw-bold text-dark">{activeLoans.length}</div>
                <span className="text-secondary small">
                  {activeLoans.length === 1 ? "Book with patron" : "Books with patron"}
                </span>
              </div>
            </div>

            {/* Overdue */}
            <div className="col-6 col-lg-3">
              <div className="surface-card p-3 p-md-4 h-100 border-0 shadow-sm">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-secondary small fw-semibold">Overdue Items</span>
                  <span className="rounded-3 p-2 bg-danger-subtle text-danger">
                    <i className="bi bi-clock-history fs-5" />
                  </span>
                </div>
                <div
                  className={`fs-3 fw-bold ${
                    overdueLoans.length > 0 ? "text-danger" : "text-success"
                  }`}
                >
                  {overdueLoans.length}
                </div>
                <span className="text-secondary small">
                  {overdueLoans.length > 0 ? "Past return due date" : "No overdue items"}
                </span>
              </div>
            </div>

            {/* Returned */}
            <div className="col-6 col-lg-3">
              <div className="surface-card p-3 p-md-4 h-100 border-0 shadow-sm">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-secondary small fw-semibold">Returned Books</span>
                  <span className="rounded-3 p-2 bg-success-subtle text-success">
                    <i className="bi bi-bookmark-check fs-5" />
                  </span>
                </div>
                <div className="fs-3 fw-bold text-success">{returnedHistory.length}</div>
                <span className="text-secondary small">Completed borrowings</span>
              </div>
            </div>

            {/* Total Lifetime */}
            <div className="col-6 col-lg-3">
              <div className="surface-card p-3 p-md-4 h-100 border-0 shadow-sm">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-secondary small fw-semibold">Lifetime Loans</span>
                  <span className="rounded-3 p-2 bg-primary-subtle text-primary">
                    <i className="bi bi-arrow-left-right fs-5" />
                  </span>
                </div>
                <div className="fs-3 fw-bold text-dark">{userIssues.length}</div>
                <span className="text-secondary small">Total checkouts on record</span>
              </div>
            </div>
          </div>
        </section>

        {/* BORROWING HISTORY & TABS */}
        <div className="surface-card overflow-hidden border-0 shadow-sm">
          {/* Tab Header */}
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
                    activeTab === "profile" ? "active text-primary" : "text-secondary"
                  }`}
                  onClick={() => setActiveTab("profile")}
                >
                  <i className="bi bi-person-lines-fill me-2" />
                  Patron Card & Notes
                </button>
              </li>
            </ul>
          </div>

          {/* TAB 1: ACTIVE LOANS */}
          {activeTab === "loans" && (
            <div className="p-0">
              {activeLoans.length === 0 ? (
                <div className="p-5 text-center text-secondary">
                  <i className="bi bi-check-circle display-4 text-success d-block mb-3" />
                  <h6 className="fw-bold text-dark mb-1">No active loans</h6>
                  <p className="text-secondary small mb-3">
                    {user.name} currently does not have any borrowed books.
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary px-3"
                    onClick={() => navigate(`/issue-book?userId=${user.id}`)}
                  >
                    <i className="bi bi-journal-arrow-up me-1" />
                    Issue a Book Now
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table dashboard-table align-middle mb-0">
                    <thead>
                      <tr>
                        <th scope="col" className="ps-4">Issue ID</th>
                        <th scope="col">Book Information</th>
                        <th scope="col">Issued On</th>
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
                            <td className="ps-4 font-monospace fw-bold text-dark">
                              #{loan.id}
                            </td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className="rounded-2 bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                                  style={{ width: 34, height: 34 }}
                                >
                                  <i className="bi bi-book fs-6" />
                                </div>
                                <div>
                                  <strong
                                    className="text-dark d-block cursor-pointer"
                                    onClick={() => navigate(`/books/${loan.bookId}`)}
                                    title="Click to view book details"
                                  >
                                    {loan.bookTitle}
                                  </strong>
                                  <span className="text-secondary small">
                                    by {loan.bookAuthor}
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
                  <h6 className="fw-bold text-dark mb-1">No completed returns yet</h6>
                  <p className="text-secondary small mb-0">
                    When {user.name} returns borrowed books, they will be archived here.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table dashboard-table align-middle mb-0">
                    <thead>
                      <tr>
                        <th scope="col" className="ps-4">Issue ID</th>
                        <th scope="col">Book Title</th>
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
                            <strong
                              className="text-dark d-block cursor-pointer"
                              onClick={() => navigate(`/books/${item.bookId}`)}
                            >
                              {item.bookTitle}
                            </strong>
                            <span className="text-secondary small">
                              by {item.bookAuthor}
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
                            {item.remarks || "Returned in good condition"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PATRON CARD & NOTES */}
          {activeTab === "profile" && (
            <div className="p-4 p-md-5">
              <div className="row g-4">
                <div className="col-12 col-md-6">
                  <h6 className="fw-bold small text-uppercase text-secondary mb-3">
                    Institutional Record
                  </h6>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-secondary">Primary User ID</span>
                      <strong className="font-monospace text-dark">{user.id}</strong>
                    </li>
                    <li className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-secondary">Full Name</span>
                      <span className="text-dark fw-semibold">{user.name}</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-secondary">Department / Faculty</span>
                      <span className="text-dark">{user.department}</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-secondary">Institutional Role</span>
                      <span className="badge bg-light text-dark border">{user.role}</span>
                    </li>
                  </ul>
                </div>

                <div className="col-12 col-md-6">
                  <h6 className="fw-bold small text-uppercase text-secondary mb-3">
                    Library Membership Standing
                  </h6>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-secondary">Account Status</span>
                      <span className="badge bg-success-subtle text-success">
                        Active & In Good Standing
                      </span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-secondary">Official Email</span>
                      <span className="text-dark">{user.email || "Not registered"}</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-secondary">Phone Contact</span>
                      <span className="text-dark">{user.phone || "Not registered"}</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between px-0 py-2">
                      <span className="text-secondary">Registered Date</span>
                      <span className="text-dark">{formatDate(user.joinedDate)}</span>
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
                    <h5 className="fw-bold mb-2">Process Book Return</h5>
                    <p className="text-secondary small mb-3">
                      Accept return of <strong>{confirmReturnIssue.bookTitle}</strong> from{" "}
                      <strong>{user.name}</strong>?
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

        {/* EDIT PROFILE MODAL */}
        {editingUser && (
          <>
            <div
              className="modal fade show d-block"
              tabIndex="-1"
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setEditingUser(null);
              }}
            >
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow">
                  <form onSubmit={handleEditSubmit}>
                    <div className="modal-header">
                      <h5 className="modal-title fw-bold">Edit Member Information</h5>
                      <button
                        type="button"
                        className="btn-close"
                        onClick={() => setEditingUser(null)}
                      />
                    </div>
                    <div className="modal-body p-4">
                      <div className="row g-3">
                        <div className="col-12 col-sm-6">
                          <label className="form-label small fw-semibold">User ID</label>
                          <input
                            type="text"
                            className="form-control bg-light font-monospace"
                            value={editingUser.id}
                            disabled
                          />
                        </div>

                        <div className="col-12 col-sm-6">
                          <label className="form-label small fw-semibold">Role</label>
                          <select
                            className="form-select"
                            value={editingUser.role}
                            onChange={(e) =>
                              setEditingUser({ ...editingUser, role: e.target.value })
                            }
                          >
                            <option value="Student">Student</option>
                            <option value="Faculty">Faculty</option>
                            <option value="Research Scholar">Research Scholar</option>
                            <option value="Staff">Library Staff</option>
                          </select>
                        </div>

                        <div className="col-12">
                          <label className="form-label small fw-semibold">
                            Full Name <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={editingUser.name}
                            onChange={(e) =>
                              setEditingUser({ ...editingUser, name: e.target.value })
                            }
                            required
                          />
                        </div>

                        <div className="col-12">
                          <label className="form-label small fw-semibold">
                            Department <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={editingUser.department}
                            onChange={(e) =>
                              setEditingUser({
                                ...editingUser,
                                department: e.target.value,
                              })
                            }
                            required
                          />
                        </div>

                        <div className="col-12 col-sm-6">
                          <label className="form-label small fw-semibold">Email</label>
                          <input
                            type="email"
                            className="form-control"
                            value={editingUser.email}
                            onChange={(e) =>
                              setEditingUser({ ...editingUser, email: e.target.value })
                            }
                          />
                        </div>

                        <div className="col-12 col-sm-6">
                          <label className="form-label small fw-semibold">Phone</label>
                          <input
                            type="tel"
                            className="form-control"
                            value={editingUser.phone}
                            onChange={(e) =>
                              setEditingUser({ ...editingUser, phone: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-light border"
                        onClick={() => setEditingUser(null)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary px-4">
                        Save Changes
                      </button>
                    </div>
                  </form>
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

export default UserDetail;
