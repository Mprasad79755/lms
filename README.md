# 📚 Library Desk

A browser-based library management app for organizing a book collection, tracking copy availability, and maintaining basic library information. Built with React and Vite.

> **Demo application:** Login credentials and library data are stored in the client. This project is intended for local demos and learning—not for protecting sensitive information or production use.

## ✨ Features

- 📊 **Dashboard** — view collection totals and recently added books.
- 📖 **Book catalogue** — search, filter, sort, add, edit, and delete book records.
- 🔄 **Circulation** — issue books to users and record returns.
- ⚙️ **Library settings** — save the library name, description, contact details, and opening hours.
- 📥 **Book imports** — import validated JSON files or add the included sample collection.
- 🔔 **Notifications** — clear success and error messages using React Toastify.
- 🔐 **Demo sign-in** — protect the app screens behind a simple demonstration login.
- 💾 **Browser persistence** — books and settings are saved in `localStorage`; sign-in state uses `sessionStorage`.
- 📱 **Responsive interface** — Bootstrap-based layout and Bootstrap Icons.

## 🚀 Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- npm (included with Node.js)

### Install and run

Open a terminal in the `library` directory:

```powershell
cd library
npm install
npm run dev
```

Open the local URL printed by Vite in your browser (normally `http://localhost:5173`).

### Demo login

| Username | Password |
| --- | --- |
| `admin` | `admin123` |

Sign out using the button in the top navigation. Demo sign-in state lasts for the current browser tab session.

### Production build

```powershell
npm run build
npm run preview
```

The production output is generated in `library/dist`.

### Lint

```powershell
npm run lint
```

## 🧭 Main screens

| Screen | Path | What it does |
| --- | --- | --- |
| Login | `/login` | Signs in to the demo app. |
| Dashboard | `/` or `/dashboard` | Shows collection statistics and recent titles. |
| Books | `/list-books` | Searches and manages the catalogue. |
| Add a book | `/add-book` | Adds a validated book record. |
| Book details | `/books/:id` | Displays a selected book record. |
| Issue a book | `/issue-book` | Records a book issue. |
| Return a book | `/return-book` | Records a book return. |
| Settings | `/settings` | Updates library information and imports books. |

All screens other than login are protected by the demo sign-in.

## 📥 Import books from JSON

Open **Settings → Import JSON file** and choose a `.json` file. The file can be either:

1. An array of book records, or
2. An object with a `books` array.

Example:

```json
[
  {
    "title": "Programming in ANSI C",
    "author": "E. Balagurusamy",
    "category": "Programming",
    "quantity": 2,
    "publisher": "McGraw Hill",
    "publishedYear": 2019,
    "status": "Available",
    "description": "An introduction to C programming."
  }
]
```

Each record needs a non-empty `title` (or `name`) and `author`. `quantity` is optional and defaults to `1`; if provided, it must be a positive whole number. `publishedYear` is optional and, if provided, must be a four-digit year between 1000 and the current year. Other fields such as `isbn`, `category`, `publisher`, `status`, and `description` are optional.

Imported records are **added** to the current catalogue, not used to replace it. Existing IDs and ISBNs are skipped. The **Import sample data** button adds the sample books in [`src/data/sampleBooks.json`](./src/data/sampleBooks.json); it also skips samples that are already in the catalogue.

## 🌱 Sample collection

On first launch, the app initializes an empty book collection with the 25 records from `src/data/sampleBooks.json`. The records include Indian-authored computer science books and Indian literature. The sample collection is also available to import later from Settings.

## 🗂️ Project structure

```text
library/
├── index.html
├── package.json
└── src/
    ├── component/       # Screens and shared route layout
    ├── context/         # Book, auth, and library-settings state
    ├── data/            # Sample books, users, and issues
    ├── services/        # User lookup helpers
    ├── App.jsx          # Routes and app providers
    ├── App.css          # App and screen styles
    └── main.jsx         # React entry point
```

## 💾 Local data and privacy

This app does not use a server-side database. Records stay in the current browser profile:

- `books` — book catalogue
- `librarySettings` — library profile and contact details
- `library_users` — local sample user list
- `library-admin-auth` — demo sign-in flag in `sessionStorage`

Clearing browser site data removes the locally saved catalogue and settings. If the book catalogue is missing or empty at startup, the bundled sample books are loaded again.

The demo login is not real authentication: its credentials are included in the client-side source. Do not deploy it as a security boundary or store sensitive patron information in this app.

## 🧰 Tech stack

- React 18
- Vite 5
- React Router
- Bootstrap 5 and Bootstrap Icons
- React Toastify
