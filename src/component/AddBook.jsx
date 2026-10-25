import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useBooks } from "../context/useBooks";
import { useLibrarySettings } from "../context/useLibrarySettings";

const currentYear = new Date().getFullYear();

const emptyBook = {
  title: "",
  author: "",
  isbn: "",
  category: "",
  quantity: "1",
  publisher: "",
  publishedYear: "",
  description: "",
};

const AddBook = () => {
  const navigate = useNavigate();
  const { books, addBook } = useBooks();
  const { settings } = useLibrarySettings();
  const [book, setBook] = useState(emptyBook);
  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;
    setBook((currentBook) => ({ ...currentBook, [name]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: "" }));
  };

  const validate = () => {
    const validationErrors = {};
    const quantity = Number(book.quantity);

    if (!book.title.trim()) {
      validationErrors.title = "Enter the book title.";
    }

    if (!book.author.trim()) {
      validationErrors.author = "Enter the author's name.";
    }

    if (!book.category) {
      validationErrors.category = "Choose a category.";
    }

    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      validationErrors.quantity = "Enter a whole number of at least 1.";
    }

    if (
      book.publishedYear &&
      (!/^\d{4}$/.test(book.publishedYear) ||
        Number(book.publishedYear) < 1000 ||
        Number(book.publishedYear) > currentYear)
    ) {
      validationErrors.publishedYear = `Enter a four-digit year from 1000 to ${currentYear}.`;
    }

    if (
      book.isbn.trim() &&
      books.some(
        (existingBook) =>
          existingBook.isbn?.trim().toLowerCase() ===
          book.isbn.trim().toLowerCase()
      )
    ) {
      validationErrors.isbn = "A book with this ISBN already exists.";
    }

    return validationErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationErrors = validate();

    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      toast.error("Review the highlighted fields and try again.");
      document
        .getElementById(Object.keys(validationErrors)[0])
        ?.focus();
      return;
    }

    try {
      const qty = Number(book.quantity);
      addBook({
        ...book,
        id: Date.now(),
        title: book.title.trim(),
        author: book.author.trim(),
        isbn: book.isbn.trim(),
        publisher: book.publisher.trim(),
        publishedYear: book.publishedYear
          ? Number(book.publishedYear)
          : "",
        quantity: qty,
        totalCopies: qty,
        availableCopies: qty,
        description: book.description.trim(),
        status: "Available",
        createdAt: new Date().toISOString(),
      });

      setBook(emptyBook);
      setErrors({});
      toast.success("Book added to your library.");
    } catch (error) {
      console.error("Unable to add book.", error);
      toast.error("The book could not be saved. Please try again.");
    }
  };

  const fieldClassName = (name) =>
    `form-control${errors[name] ? " is-invalid" : ""}`;

  const selectClassName = (name) =>
    `form-select${errors[name] ? " is-invalid" : ""}`;

  const renderError = (name) =>
    errors[name] ? (
      <div className="invalid-feedback" id={`${name}-error`}>
        {errors[name]}
      </div>
    ) : null;

  return (
    <main className="app-page">
      <div className="app-container">
        <header className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
          <div>
            <p className="page-eyebrow">{settings.libraryName} · Collection</p>
            <h1 className="page-title">Add a book</h1>
            <p className="page-description">
              Add the details you need to identify and manage this title.
            </p>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate("/list-books")}
            >
              <i className="bi bi-collection me-2" aria-hidden="true" />
              View all books
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate("/")}
            >
              <i className="bi bi-arrow-left me-2" aria-hidden="true" />
              Dashboard
            </button>
          </div>
        </header>

        <div className="surface-card">
          <form className="form-card" onSubmit={handleSubmit} noValidate>
            <section aria-labelledby="book-details-heading">
              <div className="mb-4">
                <h2 className="form-section-title" id="book-details-heading">
                  Book details
                </h2>
                <p className="form-section-description">
                  Fields marked with <span className="required-mark">*</span>{" "}
                  are required.
                </p>
              </div>

              <div className="row g-4">
                <div className="col-12 col-md-6">
                  <label htmlFor="title" className="form-label">
                    Title <span className="required-mark">*</span>
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    className={fieldClassName("title")}
                    placeholder="e.g. The Design of Everyday Things"
                    value={book.title}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.title)}
                    aria-describedby={errors.title ? "title-error" : undefined}
                    autoComplete="off"
                    required
                  />
                  {renderError("title")}
                </div>

                <div className="col-12 col-md-6">
                  <label htmlFor="author" className="form-label">
                    Author <span className="required-mark">*</span>
                  </label>
                  <input
                    id="author"
                    name="author"
                    type="text"
                    className={fieldClassName("author")}
                    placeholder="e.g. Don Norman"
                    value={book.author}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.author)}
                    aria-describedby={errors.author ? "author-error" : undefined}
                    autoComplete="off"
                    required
                  />
                  {renderError("author")}
                </div>

                <div className="col-12 col-md-6">
                  <label htmlFor="isbn" className="form-label">
                    ISBN
                  </label>
                  <input
                    id="isbn"
                    name="isbn"
                    type="text"
                    className={fieldClassName("isbn")}
                    placeholder="Enter ISBN"
                    value={book.isbn}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.isbn)}
                    aria-describedby={errors.isbn ? "isbn-error" : undefined}
                  />
                  {renderError("isbn")}
                </div>

                <div className="col-12 col-md-6">
                  <label htmlFor="category" className="form-label">
                    Category <span className="required-mark">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    className={selectClassName("category")}
                    value={book.category}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.category)}
                    aria-describedby={
                      errors.category ? "category-error" : undefined
                    }
                    required
                  >
                    <option value="">Select a category</option>
                    <option value="Programming">Programming</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Fiction">Fiction</option>
                    <option value="Non-Fiction">Non-Fiction</option>
                    <option value="Science">Science</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="History">History</option>
                    <option value="Business">Business</option>
                    <option value="Self-Help">Self-Help</option>
                    <option value="Other">Other</option>
                  </select>
                  {renderError("category")}
                </div>

                <div className="col-12 col-md-6">
                  <label htmlFor="quantity" className="form-label">
                    Number of copies <span className="required-mark">*</span>
                  </label>
                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    className={fieldClassName("quantity")}
                    min="1"
                    max={Number.MAX_SAFE_INTEGER}
                    step="1"
                    inputMode="numeric"
                    value={book.quantity}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.quantity)}
                    aria-describedby={
                      errors.quantity ? "quantity-error" : "quantity-hint"
                    }
                    required
                  />
                  {renderError("quantity")}
                  {!errors.quantity && (
                    <div className="form-hint" id="quantity-hint">
                      Use a whole number of one or more copies.
                    </div>
                  )}
                </div>

                <div className="col-12 col-md-6">
                  <label htmlFor="publishedYear" className="form-label">
                    Publication year
                  </label>
                  <input
                    id="publishedYear"
                    name="publishedYear"
                    type="text"
                    inputMode="numeric"
                    maxLength="4"
                    className={fieldClassName("publishedYear")}
                    placeholder="YYYY"
                    value={book.publishedYear}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.publishedYear)}
                    aria-describedby={
                      errors.publishedYear
                        ? "publishedYear-error"
                        : "publishedYear-hint"
                    }
                  />
                  {renderError("publishedYear")}
                  {!errors.publishedYear && (
                    <div className="form-hint" id="publishedYear-hint">
                      Optional. Enter a year from 1000 to {currentYear}.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section
              className="mt-5 pt-4 border-top"
              aria-labelledby="additional-details-heading"
            >
              <div className="mb-4">
                <h2
                  className="form-section-title"
                  id="additional-details-heading"
                >
                  Additional information
                </h2>
                <p className="form-section-description">
                  Optional details to make your catalogue more useful.
                </p>
              </div>

              <div className="row g-4">
                <div className="col-12 col-md-6">
                  <label htmlFor="publisher" className="form-label">
                    Publisher
                  </label>
                  <input
                    id="publisher"
                    name="publisher"
                    type="text"
                    className="form-control"
                    placeholder="Publisher name"
                    value={book.publisher}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-12">
                  <label htmlFor="description" className="form-label">
                    Notes
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    className="form-control"
                    rows="3"
                    placeholder="Add a short description or note (optional)"
                    value={book.description}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </section>

            <div className="d-flex flex-column-reverse flex-sm-row justify-content-end gap-2 mt-5 pt-4 border-top">
              <button
                type="button"
                className="btn btn-outline-secondary px-4"
                onClick={() => navigate("/")}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary px-4">
                <i className="bi bi-plus-lg me-2" aria-hidden="true" />
                Add book to collection
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

export default AddBook;
