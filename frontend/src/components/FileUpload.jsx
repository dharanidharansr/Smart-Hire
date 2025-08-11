import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { IconUpload, IconX } from '@tabler/icons-react';
import { useDropzone } from 'react-dropzone';

const FileUpload = ({
  onChange,
  maxFiles = 5,
}) => {
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileChange = (newFiles) => {
    // Convert newFiles to array if it's a FileList
    const fileArray = newFiles 
      ? Array.isArray(newFiles) 
        ? newFiles 
        : Array.from(newFiles)
      : [];

    // Limit the total number of files
    const updatedFiles = [...files, ...fileArray].slice(0, maxFiles);
    setFiles(updatedFiles);
    onChange && onChange(updatedFiles);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (indexToRemove) => {
    const updatedFiles = files.filter((_, index) => index !== indexToRemove);
    setFiles(updatedFiles);
    onChange && onChange(updatedFiles);
  };

  const { getRootProps, isDragActive } = useDropzone({
    multiple: true,
    noClick: true,
    onDrop: handleFileChange,
    onDropRejected: (error) => {
      console.log(error);
    },
  });

  return (
    <div className="w-full" {...getRootProps()}>
      <div className="relative">
        <input
          ref={fileInputRef}
          id="file-upload-handle"
          type="file"
          multiple
          onChange={(e) => handleFileChange(e.target.files)}
          className="hidden" 
        />
        
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-4">
            <label 
              htmlFor="file-upload-handle"
              className="inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium text-white cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              style={{ 
                backgroundColor: 'rgb(30, 37, 95)', 
                borderColor: 'rgb(30, 37, 95)',
                ':hover': { backgroundColor: 'rgb(25, 30, 75)' }
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgb(25, 30, 75)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgb(30, 37, 95)'}
            >
              <IconUpload className="mr-2 h-5 w-5" />
              Choose Files
            </label>
            <span className="text-sm text-neutral-400 font-inter">
              {files.length > 0 ? `${files.length} file(s) selected` : 'No file chosen'}
            </span>
          </div>
          
          <p className="text-xs text-neutral-500 font-inter">
            Drag or drop your files here or click to upload (Max {maxFiles} files)
          </p>

          {files.length > 0 && (
            <div className="space-y-2 max-w-xl">
              {files.map((file, idx) => (
                <div 
                  key={`file-${idx}`}
                  className="bg-zinc-900 flex items-center justify-between p-3 rounded-md shadow-sm border border-zinc-800"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-300 font-inter truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-neutral-400 font-inter bg-zinc-800 rounded px-2 py-1">
                        {file.type}
                      </p>
                      <p className="text-xs text-neutral-400 font-inter">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className="ml-3 text-red-500 hover:bg-red-100 rounded-full p-1 transition-colors"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!files.length && isDragActive && (
            <div className="flex items-center justify-center h-32 border-2 border-dashed border-blue-400 rounded-lg bg-blue-900/20">
              <div className="text-center">
                <IconUpload className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-blue-400 font-inter">Drop files here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;

