import React, { useState, useRef } from "react";
import "./UploadAndDisplayImage.css";

interface UploadProps {
  onImageReady: (base64String: string | null) => void;
}

export default function UploadAndDisplayImage({ onImageReady }: UploadProps) {
  // All states are now actively used in the component logic and UI
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 1. Reset states and show the Google Play style loader
    setIsProcessing(true);
    setProgress(0);
    setPreview(null);
    onImageReady(null);

    // 2. Simulate the loading progress animation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          clearInterval(interval);
          return prev;
        }
        return prev + 15;
      });
    }, 50);

    // 3. Convert the file to a Base64 string for the Python backend
    const reader = new FileReader();
    
    reader.onloadend = () => {
      clearInterval(interval);
      setProgress(100);
      
      const base64String = reader.result as string;
      
      setTimeout(() => {
        setPreview(base64String); // Show the image preview
        onImageReady(base64String); // Send the bits to Home.tsx
        setIsProcessing(false); // Hide the progress bar
      }, 400);
    };

    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPreview(null);
    setProgress(0);
    onImageReady(null); // Clear the payload in the parent component
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="upload-container">
      {/* Upload Dropzone (Shows when no image is selected and not processing) */}
      {!preview && !isProcessing && (
        <div 
          className="upload-dropzone" 
          onClick={() => fileInputRef.current?.click()}
        >
          <svg className="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <p>Apasă pentru a alege o fotografie</p>
        </div>
      )}

      {/* Google Play Store Style Progress Bar */}
      {isProcessing && (
        <div className="upload-progress-wrapper">
          <p className="upload-progress-text">Se procesează imaginea... {progress}%</p>
          <div className="upload-progress-track">
            <div 
              className="upload-progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Image Preview and Remove Button */}
      {preview && !isProcessing && (
        <div className="upload-preview-container">
          <img src={preview} alt="Preview simptome" className="upload-preview-img" />
          <button type="button" className="upload-remove-btn" onClick={handleRemove}>
            Șterge imaginea
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="upload-hidden-input"
      />
    </div>
  );
}