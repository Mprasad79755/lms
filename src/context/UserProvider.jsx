import { useCallback, useMemo, useState } from "react";
import UserContext from "./userContext";
import sampleUsers from "../data/sampleUsers.json";

const STORAGE_KEY = "library_users";

const normalizeUser = (user, index = 0) => {
  const id = String(user.id || `USR-${1000 + index + 1}`).trim();
  const name = String(user.name || "Member").trim();
  const email = String(user.email || "").trim();
  const department = String(user.department || "General").trim();
  const role = String(user.role || "Student").trim();
  const phone = String(user.phone || "").trim();
  const joinedDate = user.joinedDate || new Date().toISOString().split("T")[0];

  return {
    ...user,
    id,
    name,
    email,
    department,
    role,
    phone,
    joinedDate,
  };
};

const initializeUsers = () => {
  try {
    const initial = sampleUsers.map((u, i) => normalizeUser(u, i));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  } catch (error) {
    console.error("Failed to initialize sample users in storage:", error);
    return sampleUsers;
  }
};

const readUsers = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return initializeUsers();

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return initializeUsers();
    }
    return parsed.map((u, i) => normalizeUser(u, i));
  } catch (error) {
    console.error("Failed to read users from storage:", error);
    return sampleUsers;
  }
};

// eslint-disable-next-line react/prop-types
export const UserProvider = ({ children }) => {
  const [users, setUsers] = useState(readUsers);

  const persistUsers = useCallback((updatedUsers) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUsers));
    } catch (error) {
      console.error("Failed to persist users:", error);
    }
    setUsers(updatedUsers);
  }, []);

  const addUser = useCallback(
    (userData) => {
      const id = String(userData.id || `USR-${1000 + users.length + 1}`).trim();
      const existing = users.find(
        (u) => u.id.toLowerCase() === id.toLowerCase()
      );
      if (existing) {
        throw new Error(`A member with ID "${id}" already exists.`);
      }

      const newUser = normalizeUser({
        ...userData,
        id,
        joinedDate: userData.joinedDate || new Date().toISOString().split("T")[0],
      });

      const updated = [newUser, ...users];
      persistUsers(updated);
      return newUser;
    },
    [users, persistUsers]
  );

  const updateUser = useCallback(
    (id, updates) => {
      let found = false;
      const updated = users.map((u) => {
        if (String(u.id).toLowerCase() !== String(id).toLowerCase()) return u;
        found = true;
        return normalizeUser({ ...u, ...updates, id: u.id });
      });

      if (!found) {
        throw new Error("The member to update could not be found.");
      }

      persistUsers(updated);
    },
    [users, persistUsers]
  );

  const deleteUser = useCallback(
    (id, activeIssues = []) => {
      // Check if user has active book loans
      const hasActiveLoans = activeIssues.some(
        (i) =>
          String(i.userId).toLowerCase() === String(id).toLowerCase() &&
          i.status === "Issued"
      );
      if (hasActiveLoans) {
        throw new Error(
          "Cannot delete this member because they currently have active book loans. Please return their books first."
        );
      }

      const updated = users.filter(
        (u) => String(u.id).toLowerCase() !== String(id).toLowerCase()
      );
      if (updated.length === users.length) {
        throw new Error("The member to delete could not be found.");
      }

      persistUsers(updated);
    },
    [users, persistUsers]
  );

  const importUsers = useCallback(
    (incomingUsers) => {
      if (!Array.isArray(incomingUsers)) {
        throw new Error("Incoming users data must be an array.");
      }

      const existingIds = new Set(users.map((u) => u.id.toLowerCase()));
      const existingEmails = new Set(
        users.map((u) => u.email?.toLowerCase()).filter(Boolean)
      );

      const newAdditions = [];
      incomingUsers.forEach((u, i) => {
        if (!u || typeof u !== "object") return;
        const norm = normalizeUser(u, users.length + i);
        const normId = norm.id.toLowerCase();
        const normEmail = norm.email.toLowerCase();

        if (existingIds.has(normId)) return;
        if (normEmail && existingEmails.has(normEmail)) return;

        existingIds.add(normId);
        if (normEmail) existingEmails.add(normEmail);
        newAdditions.push(norm);
      });

      if (newAdditions.length > 0) {
        persistUsers([...users, ...newAdditions]);
      }

      return newAdditions.length;
    },
    [users, persistUsers]
  );

  const restoreSampleUsers = useCallback(() => {
    const sampleNormalized = sampleUsers.map((u, i) => normalizeUser(u, i));
    persistUsers(sampleNormalized);
    return sampleNormalized.length;
  }, [persistUsers]);

  const getUserById = useCallback(
    (id) => {
      const match = users.find(
        (u) => String(u.id).toLowerCase() === String(id).trim().toLowerCase()
      );
      if (match) return match;
      // Fallback for custom user IDs entered on the fly
      return {
        id: String(id).trim(),
        name: String(id).trim(),
        department: "Guest / External Member",
        role: "Member",
        email: "Not provided",
        phone: "Not provided",
        joinedDate: "Recent",
      };
    },
    [users]
  );

  const value = useMemo(
    () => ({
      users,
      addUser,
      updateUser,
      deleteUser,
      importUsers,
      restoreSampleUsers,
      getUserById,
    }),
    [
      users,
      addUser,
      updateUser,
      deleteUser,
      importUsers,
      restoreSampleUsers,
      getUserById,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
