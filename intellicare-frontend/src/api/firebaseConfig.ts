import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCXAG411dEfFmtb44A-q2couXKSScD143Q",
    authDomain: "intellicare-1349c.firebaseapp.com",
    projectId: "intellicare-1349c",
    storageBucket: "intellicare-1349c.firebasestorage.app",
    messagingSenderId: "503044258039",
    appId: "1:503044258039:web:0fb8b0a5d14b8cb9f87bf2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.languageCode = 'vi'; // SMS gửi về sẽ là Tiếng Việt