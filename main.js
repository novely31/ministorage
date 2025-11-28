import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


// -----------------------------------
// 🔥 CRITICAL: DOUBLE-CHECK YOUR FIREBASE CONFIG
// -----------------------------------
const firebaseConfig = {
  // You MUST ensure these keys match your Firebase project exactly.
  apiKey: "AIzaSyBRYg1W6-nAd2452_aVquvzgHoSyqCDVag",
  authDomain: "storageweb-1b7e7.firebaseapp.com",
  projectId: "storageweb-1b7e7",
  storageBucket: "storageweb-1b7e7.firebasestorage.app",
  messagingSenderId: "828654706902",
  appId: "1:828654706902:web:52bcd5d7a37832ee4a2977"
};
// -----------------------------------

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();


// ===========================
// UTILITY FUNCTIONS
// ===========================

function displayError(id, message) {
  document.getElementById("error-" + id).textContent = message;
  const input = document.getElementById(id);
  if (input) {
    input.style.borderColor = '#ef4444';
  }
}

function clearError(id) {
  document.getElementById("error-" + id).textContent = "";
  const input = document.getElementById(id);
  if (input) {
    input.style.borderColor = '#d1d5db';
  }
}

function validateForm(fields) {
  let isValid = true;
  fields.forEach(id => clearError(id));
  
  // ... (Keep existing validation logic) ...
  // Basic Sign Up Validation
  if (fields.includes("signupName")) {
    const name = document.getElementById("signupName").value.trim();
    if (name.length < 2) {
      displayError("signupName", "Full Name is required.");
      isValid = false;
    }
  }
  
  if (fields.includes("signupEmail")) {
    const email = document.getElementById("signupEmail").value.trim();
    if (!email || !email.includes("@")) {
      displayError("signupEmail", "Enter a valid email address.");
      isValid = false;
    }
  }
  
  if (fields.includes("signupPassword")) {
    const password = document.getElementById("signupPassword").value;
    if (password.length < 6) {
      displayError("signupPassword", "Password must be at least 6 characters.");
      isValid = false;
    }
  }
  
  // Basic Login Validation
  if (fields.includes("loginEmail")) {
    const email = document.getElementById("loginEmail").value.trim();
    if (!email || !email.includes("@")) {
      displayError("loginEmail", "Email is required.");
      isValid = false;
    }
  }
  if (fields.includes("loginPassword")) {
    const password = document.getElementById("loginPassword").value;
    if (password.length === 0) {
      displayError("loginPassword", "Password is required.");
      isValid = false;
    }
  }
  
  return isValid;
}

// ===========================
// SIGNUP USER
// ===========================
window.signupUser = async function() {
  const fieldsToValidate = ["signupName", "signupEmail", "signupPassword"];
  
  if (!validateForm(fieldsToValidate)) {
    return;
  }
  
  const name = document.getElementById("signupName").value;
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCred.user;
    
    // Save user name and email to Firestore
    await setDoc(doc(db, "users", user.uid), {
      name: name,
      email: email,
      createdAt: new Date()
    });
    
    // Successful signup, redirect to dashboard
    window.location.href = "dashboard.html";
    
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      displayError("signupEmail", "This email is already in use.");
    } else if (err.code === 'auth/operation-not-allowed') {
      // Specific check for deployment issue: Email/Password not enabled
      alert("Error: Email/Password sign-in is disabled in your Firebase console settings.");
    } else {
      alert("Signup failed: " + err.message);
    }
  }
};


// ===========================
// LOGIN USER
// ===========================
window.loginUser = async function() {
  const fieldsToValidate = ["loginEmail", "loginPassword"];
  
  if (!validateForm(fieldsToValidate)) {
    return;
  }
  
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    
    // Fetch user data is optional but good practice
    await getDoc(doc(db, "users", userCred.user.uid));
    
    // Forward to dashboard
    window.location.href = "dashboard.html";
    
  } catch (err) {
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
      displayError("loginPassword", "Invalid email or password.");
      clearError("loginEmail");
    } else {
      alert("Login failed: " + err.message);
    }
  }
};


// ===========================
// GOOGLE LOGIN / SIGNUP (FIXED ERROR HANDLING)
// ===========================
window.googleSignup = async function() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    const userRef = doc(db, "users", user.uid);
    const snapshot = await getDoc(userRef);
    
    // Create Firestore profile if new user
    if (!snapshot.exists()) {
      await setDoc(userRef, {
        name: user.displayName,
        email: user.email,
        createdAt: new Date()
      });
    }
    
    // Always redirect to dashboard after successful login or signup via Google
    window.location.href = "dashboard.html";
    
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user') {
      console.log("Google sign-in popup closed.");
    } else if (err.code === 'auth/unauthorized-domain') {
      // CRITICAL DEPLOYMENT ERROR
      alert("FATAL ERROR: Unauthorized Domain.\n\nPlease go to your Firebase Console -> Authentication -> Settings -> Authorized domains and add your deployed URL (e.g., https://yourname.github.io).");
    } else {
      alert("Google sign-in failed: " + err.message);
    }
  }
};

export { app };