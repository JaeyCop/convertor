"use client";

import React, { useState } from 'react';
import { Upload, FileText, Image, Music, Video, Archive, Zap, Download, ArrowRight } from 'lucide-react';

const conversionTypes = [
  {
    id: 'pdf-to-docx',
    label: 'PDF to DOCX',
    icon: FileText,
    category: 'Document',
    description: 'Convert PDF files to editable Word documents',
    gradient: 'from-red-500 to-pink-500'
  },
  {
    id: 'docx-to-pdf',
    label: 'DOCX to PDF',
    icon: FileText,
    category: 'Document',
    description: 'Convert Word documents to PDF format',
    gradient: 'from-blue-500 to-indigo-500'
  },
  {
    id: 'mp4-to-mp3',
    label: 'MP4 to MP3',
    icon: Music,
    category: 'Audio',
    description: 'Extract audio from video files',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    id: 'png-to-jpg',
    label: 'PNG to JPG',
    icon: Image,
    category: 'Image',
    description: 'Convert PNG images to JPG format',
    gradient: 'from-green-500 to-teal-500'
  },
  {
    id: 'wav-to-mp3',
    label: 'WAV to MP3',
    icon: Music,
    category: 'Audio',
    description: 'Compress WAV files to MP3 format',
    gradient: 'from-orange-500 to-red-500'
  },
  {
    id: 'csv-to-json',
    label: 'CSV to JSON',
    icon: FileText,
    category: 'Data',
    description: 'Convert CSV data to JSON format',
    gradient: 'from-cyan-500 to-blue-500'
  },
  {
    id: 'jpg-to-png',
    label: 'JPG to PNG',
    icon: Image,
    category: 'Image',
    description: 'Convert JPG images to PNG format',
    gradient: 'from-emerald-500 to-green-500'
  },
  {
    id: 'json-to-csv',
    label: 'JSON to CSV',
    icon: FileText,
    category: 'Data',
    description: 'Convert JSON data to CSV format',
    gradient: 'from-violet-500 to-purple-500'
  },
  {
    id: 'mp3-to-wav',
    label: 'MP3 to WAV',
    icon: Music,
    category: 'Audio',
    description: 'Convert MP3 to uncompressed WAV',
    gradient: 'from-amber-500 to-orange-500'
  },
  {
    id: 'image-resize',
    label: 'Image Resize',
    icon: Image,
    category: 'Image',
    description: 'Resize images to custom dimensions',
    gradient: 'from-rose-500 to-pink-500'
  },
  {
    id: 'image-compress',
    label: 'Image Compress',
    icon: Image,
    category: 'Image',
    description: 'Reduce image file size while maintaining quality',
    gradient: 'from-teal-500 to-cyan-500'
  },
  {
    id: 'file-compress',
    label: 'File Compress (ZIP)',
    icon: Archive,
    category: 'Archive',
    description: 'Create ZIP archives from multiple files',
    gradient: 'from-indigo-500 to-purple-500'
  }
];

const UploadForm = ({ conversionType }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(droppedFiles);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    
    setIsConverting(true);
    setProgress(0);
    
    // Simulate conversion progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsConverting(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const selectedConversion = conversionTypes.find(type => type.id === conversionType);
  const IconComponent = selectedConversion?.icon || Upload;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className={`bg-gradient-to-r ${selectedConversion?.gradient} p-6 text-white`}>
        <div className="flex items-center space-x-3">
          <IconComponent className="w-8 h-8" />
          <div>
            <h3 className="text-xl font-bold">{selectedConversion?.label}</h3>
            <p className="text-white/80 text-sm">{selectedConversion?.description}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
            isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            Drag and drop your files here, or{' '}
            <label className="text-blue-600 hover:text-blue-700 cursor-pointer underline">
              browse
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </p>
          <p className="text-sm text-gray-500">
            Maximum file size: 50MB
          </p>
        </div>

        {files.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold text-gray-800 mb-3">Selected Files ({files.length})</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-700 truncate">{file.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className="mt-6">
            <button
              onClick={handleConvert}
              disabled={isConverting}
              className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                isConverting
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {isConverting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Converting... {progress}%</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>Convert Files</span>
                </div>
              )}
            </button>

            {progress === 100 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Download className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="text-green-800 font-medium">Conversion Complete!</p>
                    <p className="text-green-600 text-sm">Your files are ready for download</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function ConversionPage() {
  const [conversionType, setConversionType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Document', 'Image', 'Audio', 'Data', 'Archive'];

  const filteredConversions = selectedCategory === 'All' 
    ? conversionTypes 
    : conversionTypes.filter(type => type.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              File Conversion Platform
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transform your files instantly with our powerful conversion tools. 
            Support for documents, images, audio, and more.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Conversion Type Selection */}
        {!conversionType && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredConversions.map(type => {
              const IconComponent = type.icon;
              return (
                <div
                  key={type.id}
                  onClick={() => setConversionType(type.id)}
                  className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-r ${type.gradient} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors duration-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {type.label}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3">
                    {type.description}
                  </p>
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {type.category}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Form */}
        {conversionType && (
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <button
                onClick={() => setConversionType('')}
                className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors duration-300"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                <span>Back to conversion types</span>
              </button>
            </div>
            <UploadForm conversionType={conversionType} />
          </div>
        )}
      </div>
    </div>
  );
}