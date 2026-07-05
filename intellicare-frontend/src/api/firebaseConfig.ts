import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAxlVy9ztlYnu3Mu3FlFuoS0xBTDltpRCQ",
  authDomain: "intellicare-52e49.firebaseapp.com",
  projectId: "intellicare-52e49",
  storageBucket: "intellicare-52e49.firebasestorage.app",
  messagingSenderId: "692139640301",
  appId: "1:692139640301:web:e27822fc7801d6d055d3e4",
  measurementId: "G-0BW62H8ZMR",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.languageCode = "vi"; // SMS gửi về sẽ là Tiếng Việt
