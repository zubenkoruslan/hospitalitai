import React, { useState, ChangeEvent, FormEvent } from "react";
import axios from "axios"; // Or your preferred HTTP client
import { useAuth } from "../../context/AuthContext"; // Adjust path if AuthContext is elsewhere

interface PdfMenuUploadProps {
  restaurantId: string; // Pass the current restaurant's ID as a prop
  onUploadSuccess?: (menuData: any) => void; // Optional callback on successful upload
  onUploadError?: (error: string) => void; // Optional callback on error
}

const PdfMenuUpload: React.FC<PdfMenuUploadProps> = ({
  restaurantId,
  onUploadSuccess,
  onUploadError,
}) => {
  const { token } = useAuth(); // Get token from AuthContext
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0); // For upload progress
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      if (event.target.files[0].type === "application/pdf") {
        setSelectedFile(event.target.files[0]);
        setMessage(`File selected: ${event.target.files[0].name}`);
        setError(null);
      } else {
        setSelectedFile(null);
        setError("Invalid file type. Please select a PDF.");
        setMessage(null);
      }
    } else {
      setSelectedFile(null);
      setMessage(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setError("Please select a PDF file to upload.");
      return;
    }
    if (!token) {
      setError(
        "Authentication token not found. Please ensure you are logged in."
      );
      return;
    }

    setIsUploading(true);
    setError(null);
    setMessage("Uploading menu...");
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("menuPdf", selectedFile); // 'menuPdf' must match the field name in uploadPdf.single('menuPdf')

    try {
      // Adjust the API endpoint as per your backend route structure
      const response = await axios.post(
        `/api/menus/upload/pdf/${restaurantId}`, // Corrected API endpoint to match backend
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`, // Use the token from AuthContext
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percentCompleted);
            }
          },
        }
      );

      setIsUploading(false);
      setMessage(response.data.message || "Menu uploaded successfully!");
      setSelectedFile(null); // Clear file input
      if (onUploadSuccess) {
        onUploadSuccess(response.data.data); // Pass created menu data to parent
      }
      // Reset file input visually if possible (tricky with controlled file inputs)
      const fileInput = document.getElementById(
        "pdf-upload-input"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err: any) {
      setIsUploading(false);
      setUploadProgress(0);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to upload menu. Please try again.";
      setError(errorMessage);
      setMessage(null);
      if (onUploadError) {
        onUploadError(errorMessage);
      }
      console.error("Upload error:", err);
    }
  };

  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: "20px",
        borderRadius: "8px",
        maxWidth: "500px",
        margin: "20px auto",
      }}
    >
      <h3>Upload PDF Menu</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="pdf-upload-input">Choose PDF File:</label>
          <input
            id="pdf-upload-input"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={isUploading}
            style={{ margin: "10px 0" }}
          />
        </div>
        <button
          type="submit"
          disabled={isUploading || !selectedFile}
          style={{ padding: "10px 15px", cursor: "pointer" }}
        >
          {isUploading ? `Uploading (${uploadProgress}%)` : "Upload Menu"}
        </button>
      </form>
      {message && (
        <p style={{ color: "green", marginTop: "10px" }}>{message}</p>
      )}
      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
      {isUploading && uploadProgress > 0 && (
        <div style={{ marginTop: "10px" }}>
          <progress
            value={uploadProgress}
            max="100"
            style={{ width: "100%" }}
          ></progress>
        </div>
      )}
    </div>
  );
};

export default PdfMenuUpload;
