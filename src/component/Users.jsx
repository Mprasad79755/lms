import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useUsers } from "../context/useUsers";
import { useBooks } from "../context/useBooks";
import { useLibrarySettings } from "../context/useLibrarySettings";

const emptyUser = {
  id: "",
  name: "",
  email: "",
  phone: "",
  department: "",
  role: "Student",
};

// Distinctive colorful avatar gradients based on user's name or role
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

const ITEMS_PER_PAGE = 12;

const Users = () => {
  const navigate = useNavigate();
  const { users, addUser, updateUser, deleteUser } = useUsers();
  const { issues } = useBooks();
  const { settings } = useLibrarySettings();

  // View state: 'grid' or 'table'
  const [viewMode, setViewMode] = useState("grid");

  // Search, Filters & Sorting
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name-asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [newUser, setNewUser] = useState(emptyUser);
  const [formErrors, setFormErrors] = useState({});

  // Active loans map by userId
  const activeLoansCountByUser = useMemo(() => {
    const counts = {};
    issues.forEach((issue) => {
      if (issue.status === "Issued") {
        const uId = String(issue.userId).toLowerCase();
        counts[uId] = (counts[uId] || 0) + 1;
      }
    });
    return counts;
  }, [issues]);

  // Unique departments for filter dropdown
  const departments = useMemo(() => {
    return [
      "All",
      ...new Set(users.map((u) => u.department).filter(Boolean)),
    ].sort();
  }, [users]);

  // Role Counts for quick filter pills
  const roleCounts = useMemo(() => {
    const counts = { All: users.length, Student: 0, Faculty: 0, "Research Scholar": 0, Staff: 0 };
    users.forEach((u) => {
      if (counts[u.role] !== undefined) {
        counts[u.role]++;
      }
    });
    return counts;
  }, [users]);

  // Overall Statistics
  const totalUsers = users.length;
  const activeBorrowersCount = useMemo(() => {
    return Object.keys(activeLoansCountByUser).length;
  }, [activeLoansCountByUser]);

  // Filtered & Sorted Users
  const filteredUsers = useMemo(() => {
    let result = users.filter((user) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        [user.name, user.id, user.email, user.department, user.phone, user.role].some(
          (val) => String(val || "").toLowerCase().includes(q)
        );

      const matchesRole = roleFilter === "All" || user.role === roleFilter;
      const matchesDept = deptFilter === "All" || user.department === deptFilter;

      return matchesSearch && matchesRole && matchesDept;
    });

    result = [...result];

    switch (sortBy) {
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "id-asc":
        result.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
        break;
      case "id-desc":
        result.sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
        break;
      case "loans-desc":
        result.sort(
          (a, b) =>
            (activeLoansCountByUser[b.id.toLowerCase()] || 0) -
            (activeLoansCountByUser[a.id.toLowerCase()] || 0)
        );
        break;
      default:
        break;
    }

    return result;
  }, [users, search, roleFilter, deptFilter, sortBy, activeLoansCountByUser]);

  // Pagination Calculations
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter, val) => {
    setter(val);
    setCurrentPage(1);
  };

  // Add User Validation
  const validateUserForm = (data, isEditing = false) => {
    const errors = {};
    if (!isEditing && !data.id?.trim()) {
      errors.id = "User ID is required.";
    }
    if (!data.name?.trim()) {
      errors.name = "Full Name is required.";
    }
    if (!data.department?.trim()) {
      errors.department = "Department is required.";
    }
    return errors;
  };

  // Handle Add User
  const handleAddSubmit = (e) => {
    e.preventDefault();
    const errors = validateUserForm(newUser, false);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      addUser(newUser);
      toast.success(`Member "${newUser.name}" added successfully!`);
      setShowAddModal(false);
      setNewUser(emptyUser);
      setFormErrors({});
    } catch (error) {
      toast.error(error.message || "Failed to add member.");
    }
  };

  // Handle Edit User
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingUser) return;
    const errors = validateUserForm(editingUser, true);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      updateUser(editingUser.id, editingUser);
      toast.success(`Member "${editingUser.name}" updated successfully!`);
      setEditingUser(null);
      setFormErrors({});
    } catch (error) {
      toast.error(error.message || "Failed to update member.");
    }
  };

  // Handle Delete User
  const handleDeleteConfirm = () => {
    if (!deletingUser) return;
    try {
      deleteUser(deletingUser.id, issues);
      toast.success(`Member "${deletingUser.name}" has been removed.`);
      setDeletingUser(null);
    } catch (error) {
      toast.error(error.message || "Failed to delete member.");
    }
  };

  return (
    <main className="app-page">
      <div className="app-container">
        {/* HERO / HEADER */}
        <header className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary-subtle text-primary text-uppercase px-2 py-1 fw-bold" style={{ fontSize: "0.72rem" }}>
                Directory
              </span>
              <span className="text-secondary small">· {settings.libraryName}</span>
            </div>
            <h1 className="page-title mt-1 mb-1">Library Patrons & Members</h1>
            <p className="page-description mb-0">
              Manage accounts, issue books, and monitor borrowing activity across all departments.
            </p>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              type="button"
              className="btn btn-primary px-3 py-2 fw-semibold shadow-sm"
              onClick={() => {
                setNewUser({
                  ...emptyUser,
                  id: `USR-${1000 + users.length + 1}`,
                });
                setFormErrors({});
                setShowAddModal(true);
              }}
            >
              <i className="bi bi-person-plus-fill me-2" />
              Add New Patron
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary px-3 py-2"
              onClick={() => navigate("/settings")}
              title="Import or restore member dataset"
            >
              <i className="bi bi-cloud-arrow-up me-2" />
              Import Data
            </button>
          </div>
        </header>

        {/* STATS OVERVIEW CARDS */}
        <section aria-label="Patron statistics" className="mb-4">
          <div className="row g-3">
            <div className="col-6 col-lg-3">
              <div className="surface-card p-3 p-md-4 h-100 d-flex justify-content-between align-items-center">
                <div>
                  <span className="text-secondary small fw-semibold d-block">Registered Patrons</span>
                  <div className="fs-3 fw-bold text-dark mt-1">{totalUsers}</div>
                  <span className="text-muted" style={{ fontSize: "0.78rem" }}>Across all faculties</span>
                </div>
                <div
                  className="rounded-4 bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 50, height: 50 }}
                >
                  <i className="bi bi-people-fill fs-4" />
                </div>
              </div>
            </div>

            <div className="col-6 col-lg-3">
              <div className="surface-card p-3 p-md-4 h-100 d-flex justify-content-between align-items-center">
                <div>
                  <span className="text-secondary small fw-semibold d-block">Student Body</span>
                  <div className="fs-3 fw-bold text-dark mt-1">{roleCounts.Student}</div>
                  <span className="text-muted" style={{ fontSize: "0.78rem" }}>Undergrads & Postgrads</span>
                </div>
                <div
                  className="rounded-4 bg-info-subtle text-info-emphasis d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 50, height: 50 }}
                >
                  <i className="bi bi-mortarboard-fill fs-4" />
                </div>
              </div>
            </div>

            <div className="col-6 col-lg-3">
              <div className="surface-card p-3 p-md-4 h-100 d-flex justify-content-between align-items-center">
                <div>
                  <span className="text-secondary small fw-semibold d-block">Faculty & Scholars</span>
                  <div className="fs-3 fw-bold text-dark mt-1">
                    {roleCounts.Faculty + roleCounts["Research Scholar"]}
                  </div>
                  <span className="text-muted" style={{ fontSize: "0.78rem" }}>Professors & Researchers</span>
                </div>
                <div
                  className="rounded-4 bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 50, height: 50 }}
                >
                  <i className="bi bi-person-badge-fill fs-4" />
                </div>
              </div>
            </div>

            <div className="col-6 col-lg-3">
              <div className="surface-card p-3 p-md-4 h-100 d-flex justify-content-between align-items-center">
                <div>
                  <span className="text-secondary small fw-semibold d-block">Active Loans</span>
                  <div className="fs-3 fw-bold text-dark mt-1">{activeBorrowersCount}</div>
                  <span className="text-muted" style={{ fontSize: "0.78rem" }}>Patrons holding books</span>
                </div>
                <div
                  className="rounded-4 bg-warning-subtle text-warning-emphasis d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 50, height: 50 }}
                >
                  <i className="bi bi-journal-arrow-up fs-4" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FILTER BAR & CONTROLS */}
        <section className="surface-card p-3 p-md-4 mb-4 shadow-sm">
          {/* Quick Role Filter Pills */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pb-3 mb-3 border-bottom">
            <div className="d-flex flex-wrap gap-1">
              {[
                { role: "All", label: "All Members", count: roleCounts.All },
                { role: "Student", label: "Students", count: roleCounts.Student },
                { role: "Faculty", label: "Faculty", count: roleCounts.Faculty },
                { role: "Research Scholar", label: "Researchers", count: roleCounts["Research Scholar"] },
                { role: "Staff", label: "Staff", count: roleCounts.Staff },
              ].map((pill) => {
                const isActive = roleFilter === pill.role;
                return (
                  <button
                    key={pill.role}
                    type="button"
                    className={`btn btn-sm px-3 rounded-pill fw-semibold transition-all ${
                      isActive
                        ? "btn-primary shadow-sm"
                        : "btn-outline-secondary border-0 bg-light text-secondary"
                    }`}
                    onClick={() => handleFilterChange(setRoleFilter, pill.role)}
                  >
                    {pill.label}
                    <span
                      className={`badge rounded-pill ms-2 ${
                        isActive ? "bg-white text-primary" : "bg-white text-secondary border"
                      }`}
                      style={{ fontSize: "0.72rem" }}
                    >
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* View Mode Switcher (Grid vs Table) */}
            <div className="btn-group btn-group-sm bg-light p-1 rounded-3" role="group">
              <button
                type="button"
                className={`btn btn-sm rounded-2 ${
                  viewMode === "grid"
                    ? "btn-white bg-white text-primary fw-bold shadow-sm"
                    : "text-secondary border-0"
                }`}
                onClick={() => setViewMode("grid")}
                title="Grid view"
              >
                <i className="bi bi-grid-fill me-1" /> Grid
              </button>
              <button
                type="button"
                className={`btn btn-sm rounded-2 ${
                  viewMode === "table"
                    ? "btn-white bg-white text-primary fw-bold shadow-sm"
                    : "text-secondary border-0"
                }`}
                onClick={() => setViewMode("table")}
                title="Compact table view"
              >
                <i className="bi bi-list-ul me-1" /> Table
              </button>
            </div>
          </div>

          {/* Search, Department & Sorting Bar */}
          <div className="row g-3 align-items-center">
            {/* Search Input */}
            <div className="col-12 col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-secondary" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search by name, ID, email, or department..."
                  value={search}
                  onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary border-start-0"
                    onClick={() => handleFilterChange(setSearch, "")}
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                )}
              </div>
            </div>

            {/* Department Filter */}
            <div className="col-6 col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-white text-secondary">
                  <i className="bi bi-building" />
                </span>
                <select
                  className="form-select"
                  value={deptFilter}
                  onChange={(e) => handleFilterChange(setDeptFilter, e.target.value)}
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept === "All" ? "All Departments" : dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="col-6 col-md-3">
              <div className="input-group">
                <span className="input-group-text bg-white text-secondary">
                  <i className="bi bi-sort-down" />
                </span>
                <select
                  className="form-select"
                  value={sortBy}
                  onChange={(e) => handleFilterChange(setSortBy, e.target.value)}
                >
                  <option value="name-asc">Name (A → Z)</option>
                  <option value="name-desc">Name (Z → A)</option>
                  <option value="id-asc">User ID (Lowest first)</option>
                  <option value="id-desc">User ID (Highest first)</option>
                  <option value="loans-desc">Most Active Loans</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Tags */}
          {(search || roleFilter !== "All" || deptFilter !== "All") && (
            <div className="d-flex align-items-center gap-2 mt-3 pt-2 border-top small text-secondary">
              <span>Filtering by:</span>
              {search && (
                <span className="badge bg-light text-dark border">
                  Query: &quot;{search}&quot;
                </span>
              )}
              {roleFilter !== "All" && (
                <span className="badge bg-light text-dark border">
                  Role: {roleFilter}
                </span>
              )}
              {deptFilter !== "All" && (
                <span className="badge bg-light text-dark border">
                  Dept: {deptFilter}
                </span>
              )}
              <button
                type="button"
                className="btn btn-link btn-sm text-decoration-none p-0 ms-auto"
                onClick={() => {
                  setSearch("");
                  setRoleFilter("All");
                  setDeptFilter("All");
                  setCurrentPage(1);
                }}
              >
                Clear all filters
              </button>
            </div>
          )}
        </section>

        {/* EMPTY STATE */}
        {filteredUsers.length === 0 ? (
          <div className="surface-card p-5 text-center shadow-sm">
            <i className="bi bi-person-x display-3 text-secondary mb-3 d-block" />
            <h5 className="fw-bold text-dark">No members found</h5>
            <p className="text-secondary small mb-4">
              {search || roleFilter !== "All" || deptFilter !== "All"
                ? "Try adjusting your search query or clearing the selected filters."
                : "No members are currently registered in the directory."}
            </p>
            <div className="d-flex justify-content-center gap-2">
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => {
                  setSearch("");
                  setRoleFilter("All");
                  setDeptFilter("All");
                  setCurrentPage(1);
                }}
              >
                Reset Filters
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAddModal(true)}
              >
                Add Member
              </button>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          /* ================= GRID VIEW ================= */
          <div>
            <div className="row g-3">
              {paginatedUsers.map((user) => {
                const activeCount = activeLoansCountByUser[user.id.toLowerCase()] || 0;
                const avatarBg = getAvatarGradient(user.name);

                return (
                  <div className="col-12 col-md-6 col-xl-4" key={user.id}>
                    <div className="surface-card p-4 h-100 d-flex flex-column hover-shadow transition-all border-0 shadow-sm">
                      {/* Top Bar: Avatar, Name, ID, Role */}
                      <div className="d-flex align-items-start gap-3 mb-3">
                        <div
                          className="rounded-circle text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
                          style={{
                            width: 52,
                            height: 52,
                            fontSize: "1.25rem",
                            background: avatarBg,
                          }}
                        >
                          {user.name.charAt(0)}
                        </div>

                        <div className="flex-grow-1 overflow-hidden">
                          <div className="d-flex justify-content-between align-items-start">
                            <h6
                              className="fw-bold text-dark mb-1 text-truncate cursor-pointer"
                              onClick={() => navigate(`/users/${user.id}`)}
                              title="View member profile & loan history"
                              style={{ maxWidth: 170 }}
                            >
                              {user.name}
                            </h6>
                            <span
                              className={`badge rounded-pill ${
                                user.role === "Faculty"
                                  ? "bg-primary-subtle text-primary border"
                                  : user.role === "Research Scholar"
                                  ? "bg-info-subtle text-info-emphasis border"
                                  : "bg-light text-dark border"
                              }`}
                              style={{ fontSize: "0.72rem" }}
                            >
                              {user.role}
                            </span>
                          </div>

                          <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: "0.74rem" }}>
                            {user.id}
                          </span>
                        </div>
                      </div>

                      {/* Department and Details */}
                      <div className="p-2 rounded-3 bg-light border small text-secondary mb-3 flex-grow-1 d-flex flex-column gap-1">
                        <div className="text-truncate">
                          <i className="bi bi-building me-2 text-primary" />
                          <strong className="text-dark">{user.department}</strong>
                        </div>
                        {user.email && (
                          <div className="text-truncate">
                            <i className="bi bi-envelope me-2 text-muted" />
                            <span>{user.email}</span>
                          </div>
                        )}
                        {user.phone && (
                          <div className="text-truncate">
                            <i className="bi bi-telephone me-2 text-muted" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Active Loans & Footer Actions */}
                      <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-auto">
                        <div>
                          {activeCount > 0 ? (
                            <span className="badge bg-warning-subtle text-warning-emphasis">
                              <i className="bi bi-journal-check me-1" />
                              {activeCount} {activeCount === 1 ? "Book Out" : "Books Out"}
                            </span>
                          ) : (
                            <span className="badge bg-success-subtle text-success">
                              <i className="bi bi-check2-circle me-1" /> Available
                            </span>
                          )}
                        </div>

                        <div className="d-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary px-2"
                            title="Issue a book to this patron"
                            onClick={() => navigate(`/issue-book?userId=${user.id}`)}
                          >
                            <i className="bi bi-journal-arrow-up me-1" />
                            Issue
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary px-2"
                            title="View patron borrowing history"
                            onClick={() => navigate(`/users/${user.id}`)}
                          >
                            <i className="bi bi-eye" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary px-2"
                            title="Edit patron details"
                            onClick={() => {
                              setEditingUser({ ...user });
                              setFormErrors({});
                            }}
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger px-2"
                            title="Delete patron"
                            onClick={() => setDeletingUser(user)}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ================= TABLE VIEW ================= */
          <div className="surface-card overflow-hidden shadow-sm">
            <div className="table-responsive">
              <table className="table dashboard-table align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col" className="ps-4">Patron Details</th>
                    <th scope="col">Department & Role</th>
                    <th scope="col">Contact Info</th>
                    <th scope="col">Borrowing Status</th>
                    <th scope="col" className="pe-4 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user) => {
                    const activeCount = activeLoansCountByUser[user.id.toLowerCase()] || 0;
                    const avatarBg = getAvatarGradient(user.name);

                    return (
                      <tr key={user.id}>
                        {/* Patron Info */}
                        <td className="ps-4">
                          <div className="d-flex align-items-center gap-3">
                            <div
                              className="rounded-circle text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
                              style={{
                                width: 40,
                                height: 40,
                                fontSize: "1rem",
                                background: avatarBg,
                              }}
                            >
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <strong
                                className="text-dark d-block cursor-pointer"
                                onClick={() => navigate(`/users/${user.id}`)}
                                title="Click to view member profile"
                              >
                                {user.name}
                              </strong>
                              <span className="badge bg-light text-secondary border font-monospace">
                                {user.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Dept & Role */}
                        <td>
                          <span className="text-dark fw-semibold d-block small">
                            {user.department}
                          </span>
                          <span className="badge bg-light text-secondary border">
                            {user.role}
                          </span>
                        </td>

                        {/* Contact */}
                        <td className="small text-secondary">
                          <div>{user.email || "—"}</div>
                          <div className="text-muted">{user.phone || "—"}</div>
                        </td>

                        {/* Status */}
                        <td>
                          {activeCount > 0 ? (
                            <span className="badge bg-warning-subtle text-warning-emphasis">
                              <i className="bi bi-journal-check me-1" />
                              {activeCount} {activeCount === 1 ? "Book Issued" : "Books Issued"}
                            </span>
                          ) : (
                            <span className="badge bg-success-subtle text-success">
                              <i className="bi bi-check2-circle me-1" />
                              Clear / No Loans
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="pe-4 text-end">
                          <div className="d-flex justify-content-end gap-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary px-2"
                              title="Issue a book to this patron"
                              onClick={() => navigate(`/issue-book?userId=${user.id}`)}
                            >
                              <i className="bi bi-journal-arrow-up me-1" />
                              Issue
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary px-2"
                              title="View profile & history"
                              onClick={() => navigate(`/users/${user.id}`)}
                            >
                              <i className="bi bi-eye" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary px-2"
                              title="Edit patron"
                              onClick={() => {
                                setEditingUser({ ...user });
                                setFormErrors({});
                              }}
                            >
                              <i className="bi bi-pencil" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger px-2"
                              title="Delete patron"
                              onClick={() => setDeletingUser(user)}
                            >
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {filteredUsers.length > ITEMS_PER_PAGE && (
          <div className="surface-card p-3 mt-4 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3">
            <span className="text-secondary small">
              Showing <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to{" "}
              <strong>
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)}
              </strong>{" "}
              of <strong>{filteredUsers.length}</strong> patrons
            </span>

            <nav aria-label="Members pagination">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <li
                    key={page}
                    className={`page-item ${page === currentPage ? "active" : ""}`}
                  >
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  </li>
                ))}
                <li
                  className={`page-item ${
                    currentPage === totalPages ? "disabled" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}

        {/* ================= ADD MEMBER MODAL ================= */}
        {showAddModal && (
          <>
            <div
              className="modal fade show d-block"
              tabIndex="-1"
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setShowAddModal(false);
              }}
            >
              <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 shadow">
                  <form onSubmit={handleAddSubmit}>
                    <div className="modal-header border-bottom">
                      <div>
                        <h5 className="modal-title fw-bold">Register New Library Patron</h5>
                        <span className="text-secondary small">
                          Create an account for a student, faculty member, or researcher.
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn-close"
                        onClick={() => setShowAddModal(false)}
                      />
                    </div>
                    <div className="modal-body p-4">
                      {/* Live Avatar Preview */}
                      <div className="p-3 rounded-4 bg-light border d-flex align-items-center gap-3 mb-4">
                        <div
                          className="rounded-circle text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0 shadow"
                          style={{
                            width: 60,
                            height: 60,
                            fontSize: "1.5rem",
                            background: getAvatarGradient(newUser.name || "A"),
                          }}
                        >
                          {(newUser.name || "M").charAt(0)}
                        </div>
                        <div>
                          <strong className="fs-6 text-dark d-block">
                            {newUser.name || "Member Name Preview"}
                          </strong>
                          <span className="badge bg-primary-subtle text-primary font-monospace me-2">
                            {newUser.id || "USR-XXXX"}
                          </span>
                          <span className="badge bg-light text-dark border">
                            {newUser.role || "Student"}
                          </span>
                        </div>
                      </div>

                      <div className="row g-3">
                        <div className="col-12 col-sm-6">
                          <label className="form-label small fw-semibold">
                            Patron / User ID <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className={`form-control font-monospace ${formErrors.id ? "is-invalid" : ""}`}
                            placeholder="e.g. USR-1051"
                            value={newUser.id}
                            onChange={(e) =>
                              setNewUser({ ...newUser, id: e.target.value })
                            }
                            required
                          />
                          {formErrors.id && (
                            <div className="invalid-feedback">{formErrors.id}</div>
                          )}
                        </div>

                        <div className="col-12 col-sm-6">
                          <label className="form-label small fw-semibold">
                            Role / Designation <span className="text-danger">*</span>
                          </label>
                          <select
                            className="form-select"
                            value={newUser.role}
                            onChange={(e) =>
                              setNewUser({ ...newUser, role: e.target.value })
                            }
                          >
                            <option value="Student">Student</option>
                            <option value="Faculty">Faculty (Professor / Lecturer)</option>
                            <option value="Research Scholar">Research Scholar (PhD)</option>
                            <option value="Staff">Library Staff</option>
                          </select>
                        </div>

                        <div className="col-12 col-sm-6">
                          <label className="form-label small fw-semibold">
                            Full Name <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className={`form-control ${formErrors.name ? "is-invalid" : ""}`}
                            placeholder="e.g. Vikram Malhotra"
                            value={newUser.name}
                            onChange={(e) =>
                              setNewUser({ ...newUser, name: e.target.value })
                            }
                            required
                          />
                          {formErrors.name && (
                            <div className="invalid-feedback">{formErrors.name}</div>
                          )}
                        </div>

                        <div className="col-12 col-sm-6">
                          <label className="form-label small fw-semibold">
                            Department / Branch <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className={`form-control ${
                              formErrors.department ? "is-invalid" : ""
                            }`}
                            placeholder="e.g. Computer Science & Engg."
                            value={newUser.department}
                            onChange={(e) =>
                              setNewUser({ ...newUser, department: e.target.value })
                            }
                            required
                          />
                          {formErrors.department && (
                            <div className="invalid-feedback">
                              {formErrors.department}
                            </div>
                          )}
                        </div>

                        <div className="col-12 col-sm-6">
                          <label className="form-label small fw-semibold">
                            Institutional Email (Optional)
                          </label>
                          <input
                            type="email"
                            className="form-control"
                            placeholder="patron@library.in"
                            value={newUser.email}
                            onChange={(e) =>
                              setNewUser({ ...newUser, email: e.target.value })
                            }
                          />
                        </div>

                        <div className="col-12 col-sm-6">
                          <label className="form-label small fw-semibold">
                            Phone Number (Optional)
                          </label>
                          <input
                            type="tel"
                            className="form-control"
                            placeholder="+91 98201 12345"
                            value={newUser.phone}
                            onChange={(e) =>
                              setNewUser({ ...newUser, phone: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer border-top">
                      <button
                        type="button"
                        className="btn btn-light border px-3"
                        onClick={() => setShowAddModal(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary px-4 fw-semibold">
                        <i className="bi bi-check2 me-1" />
                        Create Patron Account
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            <div className="modal-backdrop fade show" />
          </>
        )}

        {/* ================= EDIT MEMBER MODAL ================= */}
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
              <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 shadow">
                  <form onSubmit={handleEditSubmit}>
                    <div className="modal-header border-bottom">
                      <div>
                        <h5 className="modal-title fw-bold">Edit Member Account</h5>
                        <span className="text-secondary small">
                          Update profile and contact information for {editingUser.name}.
                        </span>
                      </div>
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

                        <div className="col-12 col-sm-6">
                          <label className="form-label small fw-semibold">
                            Full Name <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className={`form-control ${formErrors.name ? "is-invalid" : ""}`}
                            value={editingUser.name}
                            onChange={(e) =>
                              setEditingUser({ ...editingUser, name: e.target.value })
                            }
                            required
                          />
                          {formErrors.name && (
                            <div className="invalid-feedback">{formErrors.name}</div>
                          )}
                        </div>

                        <div className="col-12 col-sm-6">
                          <label className="form-label small fw-semibold">
                            Department <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className={`form-control ${
                              formErrors.department ? "is-invalid" : ""
                            }`}
                            value={editingUser.department}
                            onChange={(e) =>
                              setEditingUser({
                                ...editingUser,
                                department: e.target.value,
                              })
                            }
                            required
                          />
                          {formErrors.department && (
                            <div className="invalid-feedback">
                              {formErrors.department}
                            </div>
                          )}
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
                    <div className="modal-footer border-top">
                      <button
                        type="button"
                        className="btn btn-light border px-3"
                        onClick={() => setEditingUser(null)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary px-4 fw-semibold">
                        <i className="bi bi-check2 me-1" />
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

        {/* ================= DELETE CONFIRMATION MODAL ================= */}
        {deletingUser && (
          <>
            <div
              className="modal fade show d-block"
              tabIndex="-1"
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setDeletingUser(null);
              }}
            >
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow">
                  <div className="modal-body text-center p-4 p-md-5">
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger-subtle text-danger mb-3 shadow-sm"
                      style={{ width: 68, height: 68 }}
                    >
                      <i className="bi bi-trash3 fs-2" />
                    </div>
                    <h5 className="fw-bold mb-2">Delete Member Record?</h5>
                    <p className="text-secondary mb-1">
                      Are you sure you want to remove patron
                    </p>
                    <p className="fw-bold fs-6 mb-3">
                      &quot;{deletingUser.name}&quot; ({deletingUser.id})?
                    </p>
                    <div className="alert alert-danger py-2 px-3 small mb-4">
                      <i className="bi bi-exclamation-triangle me-1" />
                      Members who currently have active book loans cannot be deleted until all copies are returned.
                    </div>
                    <div className="d-flex justify-content-center gap-2">
                      <button
                        type="button"
                        className="btn btn-light border px-4"
                        onClick={() => setDeletingUser(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger px-4 fw-semibold"
                        onClick={handleDeleteConfirm}
                      >
                        Delete Patron
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

export default Users;
