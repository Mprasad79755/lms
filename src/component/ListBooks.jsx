import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useBooks } from "../context/useBooks";
import { useLibrarySettings } from "../context/useLibrarySettings";

const Books = () => {
  const navigate = useNavigate();
  const { books, updateBook, deleteBook: removeBook } = useBooks();
  const { settings } = useLibrarySettings();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedBook, setSelectedBook] = useState(null);
  const [deleteBook, setDeleteBook] = useState(null);
  const [editErrors, setEditErrors] = useState({});

  const categories = useMemo(
    () => [...new Set(books.map((book) => book.category).filter(Boolean))].sort(),
    [books]
  );

  const filteredBooks = useMemo(() => {
    let result = books.filter((book) => {
      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        [
          book.title,
          book.name,
          book.author,
          book.isbn,
          book.category,
          book.publisher,
        ].some((value) => String(value || "").toLowerCase().includes(query));

      const matchesCategory =
        categoryFilter === "All" || book.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });

    result = [...result];

    switch (sortBy) {
      case "title-asc":
        result.sort((a, b) =>
          (a.title || a.name || "").localeCompare(b.title || b.name || "")
        );
        break;
      case "title-desc":
        result.sort((a, b) =>
          (b.title || b.name || "").localeCompare(a.title || a.name || "")
        );
        break;
      case "author":
        result.sort((a, b) =>
          (a.author || "").localeCompare(b.author || "")
        );
        break;
      case "quantity":
        result.sort(
          (a, b) =>
            (b.totalCopies ?? Number(b.quantity) ?? 1) -
            (a.totalCopies ?? Number(a.quantity) ?? 1)
        );
        break;
      case "available":
        result.sort(
          (a, b) =>
            (b.availableCopies ?? Number(b.quantity) ?? 0) -
            (a.availableCopies ?? Number(a.quantity) ?? 0)
        );
        break;
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
        );
        break;
      case "newest":
      default:
        result.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
        break;
    }

    return result;
  }, [books, search, sortBy, categoryFilter]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setSelectedBook((prev) => ({ ...prev, [name]: value }));
    setEditErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();

    if (!selectedBook) return;

    const errors = {};

    if (!selectedBook.title?.trim()) {
      errors.title = "Book title is required.";
    }

    if (!selectedBook.author?.trim()) {
      errors.author = "Author name is required.";
    }

    if (!selectedBook.category?.trim()) {
      errors.category = "Category is required.";
    }

    const quantityNum = Number(selectedBook.quantity);
    if (!Number.isSafeInteger(quantityNum) || quantityNum < 1) {
      errors.quantity = "Enter a whole number of at least 1.";
    }

    if (
      selectedBook.publishedYear &&
      (!/^\d{4}$/.test(String(selectedBook.publishedYear)) ||
        Number(selectedBook.publishedYear) < 1000 ||
        Number(selectedBook.publishedYear) > new Date().getFullYear())
    ) {
      errors.publishedYear = "Enter a valid four-digit publication year.";
    }

    const duplicateISBN =
      selectedBook.isbn?.trim() &&
      books.some(
        (book) =>
          String(book.id) !== String(selectedBook.id) &&
          book.isbn?.trim().toLowerCase() ===
            selectedBook.isbn.trim().toLowerCase()
      );

    if (duplicateISBN) {
      errors.isbn = "Another book already uses this ISBN.";
    }

    if (Object.keys(errors).length) {
      setEditErrors(errors);
      return;
    }

    try {
      updateBook(selectedBook.id, {
        ...selectedBook,
        title: selectedBook.title.trim(),
        author: selectedBook.author.trim(),
        isbn: selectedBook.isbn?.trim() || "",
        publisher: selectedBook.publisher?.trim() || "",
        description: selectedBook.description?.trim() || "",
        totalCopies: Number(selectedBook.quantity),
        quantity: Number(selectedBook.quantity),
        publishedYear: selectedBook.publishedYear
          ? Number(selectedBook.publishedYear)
          : "",
      });
      setSelectedBook(null);
      setEditErrors({});
      toast.success("Book updated successfully.");
    } catch (error) {
      console.error("Unable to update book.", error);
      toast.error(error.message || "Unable to update the book.");
    }
  };

  const handleDelete = () => {
    if (!deleteBook) return;

    try {
      removeBook(deleteBook.id);
      toast.success(
        `"${deleteBook.title || deleteBook.name}" deleted successfully.`
      );
      setDeleteBook(null);
    } catch (error) {
      console.error("Unable to delete book.", error);
      toast.error(error.message || "Unable to delete the book.");
    }
  };

  const closeEditModal = () => {
    setSelectedBook(null);
    setEditErrors({});
  };

  const closeDeleteModal = () => setDeleteBook(null);

  return (
    <div className="container-fluid bg-light min-vh-100 py-4 px-3 px-md-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <p className="text-primary fw-semibold small mb-2">
            {settings.libraryName}
          </p>
          <h2 className="fw-bold mb-2">All Books</h2>
          <p className="text-secondary mb-0">
            Search, organize, edit, and track copy availability and circulation trends.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary px-3"
            onClick={() => navigate("/issue-book")}
          >
            <i className="bi bi-journal-arrow-up me-2" />
            Issue a Book
          </button>
          <button
            type="button"
            className="btn btn-outline-success px-3"
            onClick={() => navigate("/return-book")}
          >
            <i className="bi bi-arrow-return-left me-2" />
            Return Book
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary px-3"
            onClick={() => navigate("/add-book")}
          >
            <i className="bi bi-plus-lg me-2" />
            Add New Book
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3 p-md-4">
          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <label htmlFor="bookSearch" className="form-label fw-semibold">
                Search Books
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search" />
                </span>
                <input
                  id="bookSearch"
                  type="search"
                  className="form-control"
                  placeholder="Search by title, author, ISBN, publisher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                )}
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <label htmlFor="categoryFilter" className="form-label fw-semibold">
                Category
              </label>
              <select
                id="categoryFilter"
                className="form-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="All">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <label htmlFor="sortBooks" className="form-label fw-semibold">
                Sort By
              </label>
              <select
                id="sortBooks"
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest Added</option>
                <option value="oldest">Oldest Added</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
                <option value="author">Author (A-Z)</option>
                <option value="available">Most Available Copies</option>
                <option value="quantity">Total Copies (High to Low)</option>
              </select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3 pt-3 border-top">
            <span className="text-secondary small">
              Showing <strong>{filteredBooks.length}</strong> of{" "}
              <strong>{books.length}</strong> titles
            </span>

            {(search || categoryFilter !== "All") && (
              <button
                className="btn btn-link text-decoration-none btn-sm p-0"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("All");
                }}
              >
                <i className="bi bi-x-circle me-1" />
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Book Cards */}
      {filteredBooks.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bi bi-journal-bookmark display-3 text-secondary" />
            <h5 className="fw-bold mt-3">
              {books.length === 0 ? "No books available" : "No matching books"}
            </h5>
            <p className="text-secondary">
              {books.length === 0
                ? "Add your first book to start building your collection."
                : "Try another search term or change the filters."}
            </p>
            {books.length === 0 ? (
              <button
                className="btn btn-primary"
                onClick={() => navigate("/add-book")}
              >
                <i className="bi bi-plus-lg me-2" />
                Add Your First Book
              </button>
            ) : (
              <button
                className="btn btn-outline-primary"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("All");
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {filteredBooks.map((book, index) => {
            const avail = book.availableCopies ?? Number(book.quantity) ?? 0;
            const total = book.totalCopies ?? Number(book.quantity) ?? 1;

            return (
              <div
                className="col-12 col-sm-6 col-xl-4"
                key={book.id ?? `${book.title || book.name}-${index}`}
              >
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body p-4 d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                      <div
                        className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 52, height: 52, cursor: "pointer" }}
                        onClick={() => navigate(`/books/${book.id}`)}
                        title="Click to view details & circulation trends"
                      >
                        <i className="bi bi-book-half fs-3" />
                      </div>

                      <span
                        className={`badge rounded-pill ${
                          avail <= 0
                            ? "bg-danger-subtle text-danger"
                            : avail < total
                            ? "bg-warning-subtle text-warning-emphasis"
                            : "bg-success-subtle text-success"
                        }`}
                      >
                        {avail <= 0
                          ? "Out of Stock"
                          : avail < total
                          ? "Partially Issued"
                          : "Available"}
                      </span>
                    </div>

                    <h5
                      className="fw-bold text-dark mb-2"
                      style={{ overflowWrap: "anywhere", cursor: "pointer" }}
                      onClick={() => navigate(`/books/${book.id}`)}
                      title="Click to view full details and trends"
                    >
                      <span className="text-dark text-decoration-none">
                        {book.title || book.name || "Untitled Book"}
                      </span>
                    </h5>

                    <p className="text-secondary mb-3">
                      <i className="bi bi-person me-2" />
                      {book.author || "Unknown Author"}
                    </p>

                    <div className="small text-secondary d-flex flex-column gap-2 flex-grow-1">
                      {book.category && (
                        <div>
                          <i className="bi bi-tag me-2" />
                          {book.category}
                        </div>
                      )}

                      {book.isbn && (
                        <div>
                          <i className="bi bi-upc me-2" />
                          ISBN: {book.isbn}
                        </div>
                      )}

                      {book.publisher && (
                        <div>
                          <i className="bi bi-building me-2" />
                          {book.publisher}
                        </div>
                      )}

                      {book.publishedYear && (
                        <div>
                          <i className="bi bi-calendar3 me-2" />
                          Published: {book.publishedYear}
                        </div>
                      )}
                    </div>

                    <div className="d-flex justify-content-between align-items-center border-top mt-4 pt-3">
                      <div>
                        <span className="small text-secondary d-block">
                          Available / Total
                        </span>
                        <span className="fw-bold fs-6">
                          <span className={avail > 0 ? "text-success" : "text-danger"}>
                            {avail}
                          </span>
                          <span className="text-secondary"> / {total}</span>
                        </span>
                      </div>

                      <div className="d-flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          title="View circulation trends and active loans"
                          onClick={() => navigate(`/books/${book.id}`)}
                        >
                          <i className="bi bi-eye me-1" />
                          Details
                        </button>

                        <button
                          type="button"
                          className="btn btn-primary btn-sm px-2"
                          title={avail > 0 ? "Issue this book" : "Out of stock"}
                          disabled={avail <= 0}
                          onClick={() => navigate(`/issue-book?bookId=${book.id}`)}
                        >
                          <i className="bi bi-journal-arrow-up me-1" />
                          Issue
                        </button>

                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm px-2"
                          title="Edit book"
                          aria-label={`Edit ${book.title || book.name}`}
                          onClick={() => {
                            setSelectedBook({
                              ...book,
                              title: book.title || book.name || "",
                              author: book.author || "",
                              isbn: book.isbn || "",
                              category: book.category || "",
                              quantity: total,
                              publisher: book.publisher || "",
                              publishedYear: book.publishedYear || "",
                              description: book.description || "",
                            });
                            setEditErrors({});
                          }}
                        >
                          <i className="bi bi-pencil-square" />
                        </button>

                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm px-2"
                          title="Delete book"
                          aria-label={`Delete ${book.title || book.name}`}
                          onClick={() => setDeleteBook(book)}
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Book Modal */}
      {selectedBook && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editBookTitle"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeEditModal();
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
              <div className="modal-content border-0 shadow">
                <form onSubmit={handleEditSubmit}>
                  <div className="modal-header">
                    <div>
                      <h5 className="modal-title fw-bold" id="editBookTitle">
                        Edit Book Details
                      </h5>
                      <span className="text-secondary small">
                        Update the title, copies, and metadata in your collection.
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn-close"
                      aria-label="Close"
                      onClick={closeEditModal}
                    />
                  </div>

                  <div className="modal-body p-4">
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label fw-semibold" htmlFor="editTitle">
                          Book Title *
                        </label>
                        <input
                          id="editTitle"
                          name="title"
                          className={`form-control ${editErrors.title ? "is-invalid" : ""}`}
                          value={selectedBook.title}
                          onChange={handleEditChange}
                          required
                        />
                        {editErrors.title && (
                          <div className="invalid-feedback">{editErrors.title}</div>
                        )}
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold" htmlFor="editAuthor">
                          Author *
                        </label>
                        <input
                          id="editAuthor"
                          name="author"
                          className={`form-control ${editErrors.author ? "is-invalid" : ""}`}
                          value={selectedBook.author}
                          onChange={handleEditChange}
                          required
                        />
                        {editErrors.author && (
                          <div className="invalid-feedback">{editErrors.author}</div>
                        )}
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold" htmlFor="editIsbn">
                          ISBN
                        </label>
                        <input
                          id="editIsbn"
                          name="isbn"
                          className={`form-control ${editErrors.isbn ? "is-invalid" : ""}`}
                          value={selectedBook.isbn}
                          onChange={handleEditChange}
                        />
                        {editErrors.isbn && (
                          <div className="invalid-feedback">{editErrors.isbn}</div>
                        )}
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold" htmlFor="editCategory">
                          Category *
                        </label>
                        <select
                          id="editCategory"
                          name="category"
                          className={`form-select ${editErrors.category ? "is-invalid" : ""}`}
                          value={selectedBook.category}
                          onChange={handleEditChange}
                          required
                        >
                          <option value="">Select Category</option>
                          {[...new Set([
                            "Programming",
                            "Computer Science",
                            "Fiction",
                            "Non-Fiction",
                            "Science",
                            "Mathematics",
                            "History",
                            "Business",
                            "Self-Help",
                            "Other",
                            ...categories,
                          ])].map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold" htmlFor="editQuantity">
                          Total Copies (Inventory) *
                        </label>
                        <input
                          id="editQuantity"
                          type="number"
                          min="1"
                          max={Number.MAX_SAFE_INTEGER}
                          step="1"
                          name="quantity"
                          className={`form-control ${editErrors.quantity ? "is-invalid" : ""}`}
                          value={selectedBook.quantity}
                          onChange={handleEditChange}
                          required
                        />
                        {editErrors.quantity && (
                          <div className="invalid-feedback">{editErrors.quantity}</div>
                        )}
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold" htmlFor="editPublisher">
                          Publisher
                        </label>
                        <input
                          id="editPublisher"
                          name="publisher"
                          className="form-control"
                          value={selectedBook.publisher}
                          onChange={handleEditChange}
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold" htmlFor="editPublishedYear">
                          Publication Year
                        </label>
                        <input
                          id="editPublishedYear"
                          type="number"
                          min="1000"
                          max={new Date().getFullYear()}
                          name="publishedYear"
                          className={`form-control ${editErrors.publishedYear ? "is-invalid" : ""}`}
                          value={selectedBook.publishedYear}
                          onChange={handleEditChange}
                        />
                        {editErrors.publishedYear && (
                          <div className="invalid-feedback">
                            {editErrors.publishedYear}
                          </div>
                        )}
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-semibold" htmlFor="editDescription">
                          Description
                        </label>
                        <textarea
                          id="editDescription"
                          name="description"
                          className="form-control"
                          rows="3"
                          value={selectedBook.description}
                          onChange={handleEditChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-light border"
                      onClick={closeEditModal}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <i className="bi bi-check-lg me-2" />
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

      {/* Delete Confirmation Modal */}
      {deleteBook && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deleteBookTitle"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeDeleteModal();
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-body text-center p-4 p-md-5">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger-subtle text-danger mb-3"
                    style={{ width: 64, height: 64 }}
                  >
                    <i className="bi bi-trash3 fs-2" />
                  </div>

                  <h5 className="fw-bold mb-2" id="deleteBookTitle">
                    Delete this book?
                  </h5>

                  <p className="text-secondary mb-1">
                    Are you sure you want to delete
                  </p>

                  <p className="fw-semibold mb-3">
                    &quot;{deleteBook.title || deleteBook.name || "Untitled Book"}&quot;?
                  </p>

                  <p className="small text-danger">
                    This action cannot be undone. Books with currently issued copies cannot be deleted.
                  </p>

                  <div className="d-flex justify-content-center gap-2 mt-4">
                    <button
                      type="button"
                      className="btn btn-light border px-4"
                      onClick={closeDeleteModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger px-4"
                      onClick={handleDelete}
                    >
                      <i className="bi bi-trash me-2" />
                      Delete Book
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
  );
};

export default Books;
