import sampleUsers from "../data/sampleUsers.json";

/**
 * USER MODULE SERVICE
 * 
 * NOTE FOR FUTURE BACKEND INTEGRATION:
 * Currently, user validation is relaxed as requested (librarians can enter any userId directly).
 * Sample users are provided for convenient search and autocompletion.
 * 
 * When your backend User Module is ready:
 * 1. Replace getUsers() with: return fetch('/api/users').then(res => res.json())
 * 2. Connect findUserById() to your User Module endpoint: fetch(`/api/users/${id}`)
 */

const STORAGE_KEY = "library_users";

export const getUsers = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleUsers));
      return sampleUsers;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to load users from storage:", error);
    return sampleUsers;
  }
};

export const searchUsers = (query) => {
  const users = getUsers();
  const q = String(query || "").trim().toLowerCase();
  if (!q) return users;

  return users.filter((user) =>
    [user.id, user.name, user.email, user.department, user.role].some((val) =>
      String(val || "").toLowerCase().includes(q)
    )
  );
};

export const findUserById = (userId) => {
  const users = getUsers();
  const normalizedId = String(userId || "").trim().toLowerCase();
  return users.find((user) => user.id.toLowerCase() === normalizedId) || null;
};
