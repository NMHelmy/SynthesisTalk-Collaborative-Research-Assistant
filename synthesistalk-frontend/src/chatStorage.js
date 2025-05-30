// src/chatStorage.js
import { db, auth } from "./firebase";
import {
  collection,
  addDoc,
  setDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

export async function saveChatToFirestore(chatId, title, messages) {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, "users", user.uid, "chats", chatId);
  await setDoc(ref, {
    title,
    messages,
    updatedAt: serverTimestamp(),
  });
}

export async function loadChatsFromFirestore() {
  const user = auth.currentUser;
  if (!user) return [];

  const q = query(
    collection(db, "users", user.uid, "chats"),
    orderBy("updatedAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
