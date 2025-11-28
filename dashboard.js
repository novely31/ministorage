import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  listAll,
  getDownloadURL,
  deleteObject,
  uploadBytesResumable,
  getMetadata
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Assuming 'main.js' is available and contains the Firebase configuration.
import { app } from "./main.js";

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Get UI elements for progress tracking
const progressBar = document.getElementById("progress-bar");
const progressContainer = document.getElementById("progress-container");
const progressText = document.getElementById("upload-progress-text");
const uploadBtn = document.getElementById("upload-btn");
const fileInput = document.getElementById("fileInput");


// ===============================
// ADVANCED FEATURE: FILE FILTERING
// ===============================
window.filterFiles = function() {
  const searchTerm = document.getElementById('fileSearch').value.toLowerCase();
  const fileList = document.getElementById('fileList');
  const files = fileList.getElementsByTagName('li');
  
  Array.from(files).forEach(li => {
    // Look for the file name element within the list item
    const fileNameElement = li.querySelector('.file-name-group');
    if (fileNameElement) {
      // Get file name text, excluding the file size in parentheses
      const fileName = fileNameElement.textContent.replace(/\([\s\S]*\)/, '').trim().toLowerCase();
      
      if (fileName.includes(searchTerm)) {
        li.style.display = 'flex'; // Show the file item
      } else {
        li.style.display = 'none'; // Hide the file item
      }
    }
  });
}
// ===============================


// ------------------------------
// Load Dashboard After Login
// ------------------------------

window.loadDashboard = function() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // REDIRECT TO THE NEW LANDING PAGE IF NOT LOGGED IN
      window.location.href = "index.html";
      return;
    }
    
    // Fetch user Firestore data
    const docRef = doc(db, "users", user.uid);
    const snap = await getDoc(docRef);
    
    document.getElementById("user-name").innerText = snap.data().name;
    document.getElementById("user-email").innerText = snap.data().email;
    
    loadFiles();
  });
};

// ------------------------------
// ADVANCED FEATURE: Upload File with Progress Bar
// ------------------------------

window.uploadFile = async function() {
  const file = fileInput.files[0];
  
  if (!file) return alert("Please select a file");
  
  // Reset and show progress UI
  progressContainer.style.display = 'block';
  progressText.textContent = 'Starting upload...';
  progressBar.style.width = '0%';
  uploadBtn.disabled = true;
  
  const user = auth.currentUser;
  const fileRef = ref(storage, `${user.uid}/${file.name}`);
  
  try {
    // Use uploadBytesResumable to track progress
    const uploadTask = uploadBytesResumable(fileRef, file);
    
    uploadTask.on('state_changed',
      (snapshot) => {
        // Calculate progress
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        progressBar.style.width = progress.toFixed(0) + '%';
        progressText.textContent = `Uploading: ${progress.toFixed(0)}%`;
      },
      (error) => {
        // Handle unsuccessful uploads
        alert("Upload failed: " + error.message);
        // Reset UI on failure
        progressContainer.style.display = 'none';
        progressText.textContent = '';
        uploadBtn.disabled = false;
      },
      async () => {
        // Handle successful uploads on complete
        progressText.textContent = 'Upload complete!';
        
        // Reset UI after a short delay
        setTimeout(() => {
          progressContainer.style.display = 'none';
          progressText.textContent = '';
          fileInput.value = ''; // Clear file input
          uploadBtn.disabled = false;
        }, 1000);
        
        loadFiles();
      }
    );
  } catch (err) {
    alert(err.message);
    uploadBtn.disabled = false;
  }
};


// ------------------------------
// Load Files List
// ------------------------------

async function loadFiles() {
  const user = auth.currentUser;
  const folderRef = ref(storage, `${user.uid}/`);
  
  const list = await listAll(folderRef);
  
  const fileList = document.getElementById("fileList");
  fileList.innerHTML = "";
  
  let totalSize = 0;
  
  for (let item of list.items) {
    const url = await getDownloadURL(item);
    
    // Get file metadata (size)
    const fileMetadata = await getMetadata(item);
    totalSize += fileMetadata.size;
    
    const sizeInKB = (fileMetadata.size / 1024).toFixed(2);
    
    // Determine file icon based on extension
    const fileExtension = item.name.split('.').pop().toLowerCase();
    let fileIcon = 'fas fa-file';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExtension)) {
      fileIcon = 'fas fa-image';
    } else if (['doc', 'docx', 'pdf', 'txt', 'rtf'].includes(fileExtension)) {
      fileIcon = 'fas fa-file-alt';
    } else if (['zip', 'rar', '7z'].includes(fileExtension)) {
      fileIcon = 'fas fa-file-archive';
    } else if (['mp4', 'mov', 'avi', 'mkv'].includes(fileExtension)) {
      fileIcon = 'fas fa-video';
    } else if (['mp3', 'wav', 'ogg'].includes(fileExtension)) {
      fileIcon = 'fas fa-music';
    } else if (['js', 'html', 'css', 'py'].includes(fileExtension)) {
      fileIcon = 'fas fa-file-code';
    }
    
    
    fileList.innerHTML += `
      <li>
        <span class="file-name-group">
            <i class="${fileIcon}"></i> ${item.name} 
            <span class="file-size">(${sizeInKB} KB)</span>
        </span>
        <div class="file-btns">
          <button class="download-btn" onclick="downloadFile('${url}')"><i class="fas fa-download"></i> Download</button>
          <button class="delete-btn" onclick="deleteFile('${item.fullPath}')"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </li>
    `;
  }
  
  // Storage usage in MB
  document.getElementById("storage-used").innerText =
    (totalSize / (1024 * 1024)).toFixed(2) + " MB";
}

// ------------------------------
// Download File
// ------------------------------

window.downloadFile = function(url) {
  window.open(url, "_blank");
};

// ------------------------------
// Delete File
// ------------------------------

window.deleteFile = async function(path) {
  if (!confirm("Are you sure you want to delete this file?")) return;
  
  const fileRef = ref(storage, path);
  await deleteObject(fileRef);
  
  alert("File deleted");
  loadFiles();
};

// ------------------------------
// Logout
// ------------------------------

window.logout = async function() {
  await signOut(auth);
  // REDIRECT TO THE NEW LANDING PAGE AFTER LOGOUT
  window.location.href = "index.html";
};