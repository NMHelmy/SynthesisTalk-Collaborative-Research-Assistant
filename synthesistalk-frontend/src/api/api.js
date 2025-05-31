const API_URL = "http://localhost:8000/api"; // or your backend base URL

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  return response.json();
}

export async function listFiles() {
  const response = await fetch(`${API_URL}/files`);
  return response.json();
}

export async function deleteFile(filename) {
  const response = await fetch(`${API_URL}/files/${filename}`, {
    method: "DELETE",
  });
  return response.json();
}
