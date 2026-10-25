import sampleUsers from "../data/sampleUsers.json";

const STORAGE_KEY = "library_users";

export const getUsers = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleUsers));
      return sampleUsers;
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : sampleUsers;
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
    [user.id, user.name, user.email, user.department, user.role, user.phone].some((val) =>
      String(val || "").toLowerCase().includes(q)
    )
  );
};

export const findUserById = (userId) => {
  const users = getUsers();
  const normalizedId = String(userId || "").trim().toLowerCase();
  return users.find((user) => user.id.toLowerCase() === normalizedId) || null;
};
