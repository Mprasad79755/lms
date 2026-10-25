import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import sampleBooks from "../data/sampleBooks.json";
import { useBooks } from "../context/useBooks";
import { useUsers } from "../context/useUsers";
import { useLibrarySettings } from "../context/useLibrarySettings";

const currentYear = new Date().getFullYear();

const normalizeImportedBooks = (records) => {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("The JSON file must contain a non-empty array of books.");
  }

  return records.map((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error(`Book ${index + 1} must be a JSON object.`);
    }

    const title = String(record.title || record.name || "").trim();
    const author = String(record.author || "").trim();
    const quantity = record.quantity === undefined ? 1 : Number(record.quantity);
    const year = record.publishedYear;

    if (!title || !author) {
      throw new Error(`Book ${index + 1} must include a title and author.`);
    }

    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      throw new Error(`Book ${index + 1} must have a whole-number quantity of at least 1.`);
    }

    if (
      year !== undefined &&
      year !== "" &&
      (!/^\d{4}$/.test(String(year)) ||
        Number(year) < 1000 ||
        Number(year) > currentYear)
    ) {
      throw new Error(`Book ${index + 1} has an invalid publication year.`);
    }

    return {
      ...record,
      id: record.id ?? `import-${Date.now()}-${index}`,
      title,
      author,
      isbn: String(record.isbn || "").trim(),
      category: String(record.category || ""),
      quantity,
      publisher: String(record.publisher || "").trim(),
      publishedYear: year ? Number(year) : "",
      status: record.status === "Issued" ? "Issued" : "Available",
      description: String(record.description || "").trim(),
      createdAt: record.createdAt || new Date().toISOString(),
    };
  });
};

const Settings = () => {
  const { books, importBooks, issues, generateFakeTransactions, clearIssues } = useBooks();
  const { users, importUsers, restoreSampleUsers } = useUsers();
  const { settings, updateSettings } = useLibrarySettings();
  const [form, setForm] = useState(settings);
  const fileInputRef = useRef(null);
  const userFileInputRef = useRef(null);

  // Fake transaction generation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Circulation statistics
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const activeCount = useMemo(
    () => issues.filter((i) => i.status === "Issued").length,
    [issues]
  );
  const overdueCount = useMemo(
    () => issues.filter((i) => i.status === "Issued" && i.dueDate && i.dueDate < todayStr).length,
    [issues, todayStr]
  );
  const returnedCount = useMemo(
    () => issues.filter((i) => i.status === "Returned").length,
    [issues]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleSave = (event) => {
    event.preventDefault();
    const updatedSettings = {
      ...form,
      libraryName: form.libraryName.trim(),
      description: form.description.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      website: form.website.trim(),
      openingHours: form.openingHours.trim(),
    };

    if (!updatedSettings.libraryName) {
      toast.error("Library name is required.");
      return;
    }

    try {
      updateSettings(updatedSettings);
      setForm(updatedSettings);
      toast.success("Library information saved.");
    } catch (error) {
      console.error("Unable to save library settings.", error);
      toast.error("Unable to save library information.");
    }
  };

  const importRecords = (records) => {
    const normalizedBooks = normalizeImportedBooks(records);
    const addedCount = importBooks(normalizedBooks);

    if (addedCount > 0) {
      toast.success(
        `${addedCount} ${addedCount === 1 ? "book was" : "books were"} imported.`
      );
    } else {
      toast.info("These books are already in your collection.");
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const records = Array.isArray(parsed) ? parsed : parsed?.books;
      importRecords(records);
    } catch (error) {
      console.error("Unable to import books from JSON.", error);
      toast.error(
        error instanceof SyntaxError
          ? "The selected file is not valid JSON."
          : error.message || "Unable to import books from this file."
      );
    } finally {
      event.target.value = "";
    }
  };

  const handleSampleImport = () => {
    try {
      importRecords(sampleBooks);
    } catch (error) {
      console.error("Unable to import sample books.", error);
      toast.error(error.message || "Unable to import sample books.");
    }
  };

  // User Import Handlers
  const handleUserFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const records = Array.isArray(parsed)
        ? parsed
        : parsed?.users || parsed?.members;

      if (!Array.isArray(records) || records.length === 0) {
        throw new Error("JSON file must contain an array of member records.");
      }

      const count = importUsers(records);
      if (count > 0) {
        toast.success(
          `${count} ${count === 1 ? "member was" : "members were"} imported successfully.`
        );
      } else {
        toast.info("All members in this file are already registered.");
      }
    } catch (error) {
      console.error("Unable to import members from JSON:", error);
      toast.error(
        error instanceof SyntaxError
          ? "The selected file is not valid JSON."
          : error.message || "Unable to import members from this file."
      );
    } finally {
      event.target.value = "";
    }
  };

  const handleSampleUsersImport = () => {
    try {
      const count = restoreSampleUsers();
      toast.success(`Loaded all ${count} Indian sample patron records!`);
    } catch (error) {
      console.error("Unable to restore sample users:", error);
      toast.error("Unable to load sample members.");
    }
  };

  // Fake Circulation Transactions Handlers
  const handleGenerateFakeTransactions = () => {
    try {
      setIsGenerating(true);
      const result = generateFakeTransactions(users, 50);
      toast.success(
        `Generated 50 test transactions: ${result.active} active loans (${result.overdue} overdue) & ${result.returned} returned records!`
      );
    } catch (error) {
      console.error("Failed to generate test transactions:", error);
      toast.error(error.message || "Failed to generate test transactions.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearTransactions = () => {
    try {
      clearIssues();
      setShowClearConfirm(false);
      toast.info("Cleared all circulation records. All books have been returned to shelf.");
    } catch (error) {
      console.error("Failed to clear circulation records:", error);
      toast.error("Failed to clear circulation records.");
    }
  };

  return (
    <main className="app-page">
      <div className="app-container">
        <header className="mb-4">
          <p className="page-eyebrow">Preferences & Data Tools</p>
          <h1 className="page-title">Settings</h1>
          <p className="page-description">
            Personalize your library profile, import books and patron datasets, and generate test circulation records.
          </p>
        </header>

        {/* LIBRARY PROFILE FORM */}
        <section className="surface-card mb-4" aria-labelledby="library-profile-title">
          <div className="settings-section-heading">
            <span className="settings-section-icon" aria-hidden="true">
              <i className="bi bi-bank" />
            </span>
            <div>
              <h2 className="form-section-title" id="library-profile-title">
                Library profile
              </h2>
              <p className="form-section-description">
                Update how your institution appears across the library portal.
              </p>
            </div>
          </div>

          <form className="p-4" onSubmit={handleSave}>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label htmlFor="libraryName" className="form-label">
                  Library name <span className="text-danger">*</span>
                </label>
                <input
                  id="libraryName"
                  name="libraryName"
                  className="form-control"
                  value={form.libraryName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="description" className="form-label">
                  Tagline / Description
                </label>
                <input
                  id="description"
                  name="description"
                  className="form-control"
                  value={form.description}
                  onChange={handleChange}
                />
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="address" className="form-label">
                  Physical address
                </label>
                <input
                  id="address"
                  name="address"
                  className="form-control"
                  placeholder="Street, city, postal code"
                  value={form.address}
                  onChange={handleChange}
                />
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="phone" className="form-label">
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="form-control"
                  placeholder="Contact number"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-control"
                  placeholder="library@example.in"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="openingHours" className="form-label">
                  Opening hours
                </label>
                <input
                  id="openingHours"
                  name="openingHours"
                  className="form-control"
                  placeholder="e.g. Mon–Fri, 9:00 AM–6:00 PM"
                  value={form.openingHours}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="d-flex justify-content-end mt-4 pt-4 border-top">
              <button type="submit" className="btn btn-primary px-4">
                <i className="bi bi-check-lg me-2" aria-hidden="true" />
                Save Information
              </button>
            </div>
          </form>
        </section>

        {/* BOOK CATALOG DATA */}
        <section className="surface-card mb-4" aria-labelledby="book-import-title">
          <div className="settings-section-heading">
            <span className="settings-section-icon settings-import-icon" aria-hidden="true">
              <i className="bi bi-book" />
            </span>
            <div>
              <h2 className="form-section-title" id="book-import-title">
                Book Catalog Data
              </h2>
              <p className="form-section-description">
                Add titles from a JSON file or restore the standard catalog collection.
              </p>
            </div>
          </div>

          <div className="settings-import-body p-4">
            <div className="settings-import-info mb-3">
              <span className="badge bg-light text-dark border px-3 py-2 fs-6">
                <i className="bi bi-collection me-2 text-primary" />
                {books.length} {books.length === 1 ? "book" : "books"} currently in catalog
              </span>
              <p className="small text-secondary mb-0 mt-2">
                Imports are added to your existing catalog. Books with an existing ID or ISBN are skipped.
              </p>
            </div>

            <div className="d-flex flex-column flex-sm-row gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="visually-hidden"
                aria-label="Choose a JSON file of books to import"
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="btn btn-outline-primary px-3"
                onClick={() => fileInputRef.current?.click()}
              >
                <i className="bi bi-file-earmark-arrow-up me-2" />
                Import Books JSON
              </button>
              <button
                type="button"
                className="btn btn-primary px-3"
                onClick={handleSampleImport}
              >
                <i className="bi bi-stars me-2" />
                Load Sample Books
              </button>
            </div>
          </div>
        </section>

        {/* USER / MEMBER IMPORT SECTION */}
        <section className="surface-card mb-4" aria-labelledby="user-import-title">
          <div className="settings-section-heading">
            <span
              className="settings-section-icon"
              style={{ background: "#e8f5e9", color: "#2e7d32" }}
              aria-hidden="true"
            >
              <i className="bi bi-people-fill" />
            </span>
            <div>
              <h2 className="form-section-title" id="user-import-title">
                Member & Patron Directory Data
              </h2>
              <p className="form-section-description">
                Import user records from a JSON file or load the included 50 Indian patron dataset.
              </p>
            </div>
          </div>

          <div className="settings-import-body p-4">
            <div className="settings-import-info mb-3">
              <span className="badge bg-light text-dark border px-3 py-2 fs-6">
                <i className="bi bi-person-badge me-2 text-success" />
                {users.length} {users.length === 1 ? "member" : "members"} currently registered
              </span>
              <p className="small text-secondary mb-0 mt-2">
                Includes students, professors, and research scholars across various engineering, management, and science departments. Duplicate IDs/emails are safely skipped.
              </p>
            </div>

            <div className="d-flex flex-column flex-sm-row gap-2">
              <input
                ref={userFileInputRef}
                type="file"
                accept=".json,application/json"
                className="visually-hidden"
                aria-label="Choose a JSON file of members to import"
                onChange={handleUserFileChange}
              />
              <button
                type="button"
                className="btn btn-outline-success px-3"
                onClick={() => userFileInputRef.current?.click()}
              >
                <i className="bi bi-file-earmark-arrow-up me-2" />
                Import Members JSON
              </button>
              <button
                type="button"
                className="btn btn-success px-3"
                onClick={handleSampleUsersImport}
              >
                <i className="bi bi-stars me-2" />
                Load 50 Sample Indian Users
              </button>
            </div>
          </div>
        </section>

        {/* FAKE CIRCULATION & TEST TRANSACTIONS SECTION */}
        <section className="surface-card" aria-labelledby="circulation-test-title">
          <div className="settings-section-heading">
            <span
              className="settings-section-icon"
              style={{ background: "#fff3cd", color: "#856404" }}
              aria-hidden="true"
            >
              <i className="bi bi-arrow-left-right" />
            </span>
            <div>
              <h2 className="form-section-title" id="circulation-test-title">
                Circulation & Test Transactions
              </h2>
              <p className="form-section-description">
                Generate realistic demo transactions (issued, overdue, and returned records) to test the issue/return desk, patron borrowing history, overdue alerts, and inventory tracking.
              </p>
            </div>
          </div>

          <div className="p-4">
            {/* Live Metrics Chips */}
            <div className="d-flex flex-wrap gap-2 mb-3">
              <span className="badge bg-light text-dark border px-3 py-2 fs-6">
                <i className="bi bi-receipt me-2 text-primary" />
                <strong>{issues.length}</strong> Total Transactions
              </span>
              <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-2 fs-6">
                <i className="bi bi-journal-arrow-up me-2 text-warning" />
                <strong>{activeCount}</strong> Active Loans
              </span>
              <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 fs-6">
                <i className="bi bi-exclamation-triangle-fill me-2 text-danger" />
                <strong>{overdueCount}</strong> Overdue
              </span>
              <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 fs-6">
                <i className="bi bi-check2-circle me-2 text-success" />
                <strong>{returnedCount}</strong> Returned
              </span>
            </div>

            <p className="small text-secondary mb-4">
              Clicking <strong>&ldquo;Generate 50 Test Transactions&rdquo;</strong> will create 50 realistic loans across registered patrons and catalog books (18 active, 10 overdue, and 22 returned). It automatically keeps shelf counts accurate (decrements available copies for active loans and flags zero-copy titles).
            </p>

            {/* Action Buttons */}
            <div className="d-flex flex-wrap align-items-center gap-2">
              <button
                type="button"
                className="btn btn-warning px-3 d-inline-flex align-items-center"
                onClick={handleGenerateFakeTransactions}
                disabled={isGenerating}
              >
                <i className="bi bi-magic me-2" />
                {isGenerating ? "Generating 50 Records..." : "Generate 50 Test Transactions"}
              </button>

              <button
                type="button"
                className="btn btn-outline-danger px-3 d-inline-flex align-items-center"
                onClick={() => setShowClearConfirm(true)}
                disabled={issues.length === 0}
              >
                <i className="bi bi-trash3 me-2" />
                Clear All Transactions
              </button>

              <div className="ms-auto d-flex gap-2">
                <Link to="/return-book" className="btn btn-outline-secondary px-3 btn-sm d-inline-flex align-items-center">
                  <i className="bi bi-arrow-return-left me-1" /> Return Desk
                </Link>
                <Link to="/issue-book" className="btn btn-outline-secondary px-3 btn-sm d-inline-flex align-items-center">
                  <i className="bi bi-plus-circle me-1" /> Issue Book
                </Link>
              </div>
            </div>

            {/* Clear Confirmation Inline Dialog */}
            {showClearConfirm && (
              <div
                className="alert alert-warning border border-warning-subtle mt-4 p-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3"
                role="alert"
              >
                <div>
                  <h6 className="alert-heading mb-1 d-flex align-items-center gap-2">
                    <i className="bi bi-exclamation-triangle text-warning fs-5" />
                    Clear all circulation transactions?
                  </h6>
                  <p className="mb-0 small text-secondary">
                    This will delete all <strong>{issues.length}</strong> circulation records (active, overdue, and returned) and restore all available copies back to full shelf stock for every title.
                  </p>
                </div>
                <div className="d-flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary px-3"
                    onClick={() => setShowClearConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger px-3"
                    onClick={handleClearTransactions}
                  >
                    Yes, Clear All
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Settings;
