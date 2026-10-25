import { BrowserRouter, Route, Routes } from "react-router-dom";
import Dashboard from "./component/Dashboard";
import AddBook from "./component/AddBook";
import ListBooks from "./component/ListBooks";
import IssueBook from "./component/IssueBook";
import ReturnBook from "./component/ReturnBook";
import Login from "./component/Login";
import ProtectedLayout from "./component/ProtectedLayout";
import { AuthProvider } from "./context/AuthProvider";
import { BookProvider } from "./context/BookProvider";
import { LibrarySettingsProvider } from "./context/LibrarySettingsProvider";
import Settings from "./component/Settings";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <AuthProvider>
      <LibrarySettingsProvider>
        <BookProvider>
          <BrowserRouter>
            <ToastContainer
              position="top-right"
              autoClose={3500}
              newestOnTop
              closeOnClick
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/list-books" element={<ListBooks />} />
                <Route path="/search" element={<ListBooks />} />
                <Route path="/add-book" element={<AddBook />} />
                <Route path="/issue-book" element={<IssueBook />} />
                <Route path="/issue" element={<IssueBook />} />
                <Route path="/return-book" element={<ReturnBook />} />
                <Route path="/return" element={<ReturnBook />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<div className="p-5 text-center"><h4>404 Not Found</h4></div>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </BookProvider>
      </LibrarySettingsProvider>
    </AuthProvider>
  );
}

export default App;
