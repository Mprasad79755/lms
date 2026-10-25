import { useRef, useState } from "react";
import { toast } from "react-toastify";
import sampleBooks from "../data/sampleBooks.json";
import { useBooks } from "../context/useBooks";
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
  const { books, importBooks } = useBooks();
  const { settings, updateSettings } = useLibrarySettings();
  const [form, setForm] = useState(settings);
  const fileInputRef = useRef(null);

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
      toast.error(error instanceof SyntaxError
        ? "The selected file is not valid JSON."
        : error.message || "Unable to import books from this file.");
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

  return (
    <main className="app-page">
      <div className="app-container">
        <header className="mb-4">
          <p className="page-eyebrow">Preferences</p>
          <h1 className="page-title">Settings</h1>
          <p className="page-description">
            Personalize your library and manage your book data.
          </p>
        </header>

        <section className="surface-card mb-4" aria-labelledby="library-profile-title">
          <div className="settings-section-heading">
            <span className="settings-section-icon" aria-hidden="true">
              <i className="bi bi-building" />
            </span>
            <div>
              <h2 className="form-section-title" id="library-profile-title">
                Library information
              </h2>
              <p className="form-section-description">
                This information appears across your library workspace.
              </p>
            </div>
          </div>

          <form className="settings-form" onSubmit={handleSave}>
            <div className="row g-4">
              <div className="col-12">
                <label htmlFor="libraryName" className="form-label">
                  Library name <span className="required-mark">*</span>
                </label>
                <input
                  id="libraryName"
                  name="libraryName"
                  className="form-control"
                  value={form.libraryName}
                  onChange={handleChange}
                  maxLength="100"
                  required
                />
              </div>

              <div className="col-12">
                <label htmlFor="description" className="form-label">
                  Short description
                </label>
                <textarea
                  id="description"
                  name="description"
                  className="form-control"
                  rows="3"
                  maxLength="300"
                  placeholder="A short introduction to your library"
                  value={form.description}
                  onChange={handleChange}
                />
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="address" className="form-label">
                  Address
                </label>
                <input
                  id="address"
                  name="address"
                  className="form-control"
                  placeholder="Street, city, postal code"
                  value={form.address}
                  onChange={handleChange}
                  autoComplete="street-address"
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
                  autoComplete="tel"
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
                  placeholder="library@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="website" className="form-label">
                  Website
                </label>
                <input
                  id="website"
                  name="website"
                  type="url"
                  className="form-control"
                  placeholder="https://example.com"
                  value={form.website}
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
                  placeholder="e.g. Mon–Fri, 9:00 AM–5:00 PM"
                  value={form.openingHours}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="d-flex justify-content-end mt-4 pt-4 border-top">
              <button type="submit" className="btn btn-primary px-4">
                <i className="bi bi-check-lg me-2" aria-hidden="true" />
                Save information
              </button>
            </div>
          </form>
        </section>

        <section className="surface-card" aria-labelledby="book-import-title">
          <div className="settings-section-heading">
            <span className="settings-section-icon settings-import-icon" aria-hidden="true">
              <i className="bi bi-cloud-arrow-up" />
            </span>
            <div>
              <h2 className="form-section-title" id="book-import-title">
                Import books
              </h2>
              <p className="form-section-description">
                Add books from a JSON file or load the included sample collection.
              </p>
            </div>
          </div>

          <div className="settings-import-body">
            <div className="settings-import-info">
              <span className="settings-import-count">
                <i className="bi bi-collection me-2" aria-hidden="true" />
                {books.length} {books.length === 1 ? "book" : "books"} currently
                in your collection
              </span>
              <p className="small text-secondary mb-0 mt-2">
                Imports are added to your current collection. Books with an
                existing ID or ISBN are skipped. JSON must be an array of book
                records or an object containing a <code>books</code> array.
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
                <i className="bi bi-file-earmark-arrow-up me-2" aria-hidden="true" />
                Import JSON file
              </button>
              <button
                type="button"
                className="btn btn-primary px-3"
                onClick={handleSampleImport}
              >
                <i className="bi bi-stars me-2" aria-hidden="true" />
                Import sample data
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Settings;
