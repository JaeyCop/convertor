import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  Trash2, 
  RefreshCw, 
  Settings, 
  History, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Play, 
  X, 
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Loader2,
  Timer,
  HardDrive,
  Zap,
  Bot
} from 'lucide-react';

// Types
interface ConversionJob {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  download_url?: string;
  message?: string;
  processing_time?: number;
  file_size?: number;
  created_at?: string;
  input_filename?: string;
}

interface UploadFormProps {
  conversionType: string;
}

interface ProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  brightness?: number;
  contrast?: number;
  blur?: number;
  sharpen?: boolean;
  grayscale?: boolean;
  start_time?: number;
  end_time?: number;
  bitrate?: string;
  sample_rate?: number;
  channels?: number;
  normalize?: boolean;
  fps?: number;
  resolution?: string;
}

const BASE_URL = 'https://8000-jaeycop-convertor-tbbx2kf8did.ws-eu120.gitpod.io';

export default function EnhancedFileConverter({ conversionType }: UploadFormProps) {
  // State management
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [batchMode, setBatchMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [options, setOptions] = useState<ProcessingOptions>({
    quality: 85,
    brightness: 1,
    contrast: 1,
    blur: 0,
    sharpen: false,
    grayscale: false,
  });

  // Notification state
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({ show: false, message: '', type: 'info' });

  // Conversion details
  const conversionDetails = useMemo(() => {
    const details = {
      endpoint: '',
      accept: '',
      title: '',
      description: '',
      icon: <Upload className="w-6 h-6" />,
      category: 'Document',
      supportsBatch: false,
      hasAdvancedOptions: false,
    };

    switch (conversionType) {
      case 'pdf-to-docx':
        details.endpoint = '/convert/pdf-to-docx';
        details.accept = '.pdf';
        details.title = 'PDF to DOCX';
        details.description = 'Convert PDF documents to editable Word format';
        details.icon = <FileText className="w-6 h-6" />;
        details.category = 'Document';
        details.supportsBatch = true;
        break;
      case 'docx-to-pdf':
        details.endpoint = '/convert/docx-to-pdf';
        details.accept = '.docx';
        details.title = 'DOCX to PDF';
        details.description = 'Convert Word documents to PDF format';
        details.icon = <FileText className="w-6 h-6" />;
        details.category = 'Document';
        details.supportsBatch = true;
        break;
      case 'image-process':
        details.endpoint = '/image/process';
        details.accept = 'image/*';
        details.title = 'Advanced Image Processing';
        details.description = 'Resize, enhance, and optimize images with AI-powered tools';
        details.icon = <ImageIcon className="w-6 h-6" />;
        details.category = 'Image';
        details.supportsBatch = true;
        details.hasAdvancedOptions = true;
        break;
      case 'video-to-audio':
        details.endpoint = '/convert/video-to-audio';
        details.accept = 'video/*';
        details.title = 'Video to Audio';
        details.description = 'Extract high-quality audio from video files';
        details.icon = <Video className="w-6 h-6" />;
        details.category = 'Media';
        details.supportsBatch = true;
        details.hasAdvancedOptions = true;
        break;
      default:
        details.title = 'Select Conversion Type';
        details.description = 'Choose a conversion type to get started';
        break;
    }
    return details;
  }, [conversionType]);

  // Show notification
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 5000);
  }, []);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFiles(e.dataTransfer.files);
    }
  }, []);

  // API calls
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  };

  // Job management
  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const job = await apiCall(`/job/${jobId}`);
      
      setJobs(prev => prev.map(j => j.job_id === jobId ? job : j));
      
      if (job.status === 'completed') {
        showNotification(`Job ${jobId} completed successfully!`, 'success');
      } else if (job.status === 'failed') {
        showNotification(`Job ${jobId} failed: ${job.message}`, 'error');
      } else if (job.status === 'processing') {
        // Continue polling
        setTimeout(() => pollJobStatus(jobId), 2000);
      }
    } catch (error) {
      console.error('Error polling job status:', error);
      showNotification('Error checking job status', 'error');
    }
  }, [showNotification]);

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      showNotification('Please select files to convert.', 'warning');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      
      if (batchMode && files.length > 1) {
        // Batch processing
        Array.from(files).forEach(file => {
          formData.append('files', file);
        });
        formData.append('conversion_type', conversionType);
        
        const newJobs = await apiCall('/convert/batch', {
          method: 'POST',
          body: formData,
        });
        
        setJobs(prev => [...prev, ...newJobs]);
        
        // Start polling for each job
        newJobs.forEach((job: ConversionJob) => {
          pollJobStatus(job.job_id);
        });
        
        showNotification(`Started ${newJobs.length} conversion jobs`, 'success');
      } else {
        // Single file processing
        formData.append('file', files[0]);
        
        // Add advanced options if available
        if (conversionDetails.hasAdvancedOptions) {
          Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              formData.append(key, value.toString());
            }
          });
        }
        
        const newJob = await apiCall(conversionDetails.endpoint, {
          method: 'POST',
          body: formData,
        });
        
        setJobs(prev => [...prev, newJob]);
        pollJobStatus(newJob.job_id);
        
        showNotification('Conversion started successfully', 'success');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      showNotification(`Upload failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await apiCall(`/job/${jobId}`, { method: 'DELETE' });
      setJobs(prev => prev.filter(j => j.job_id !== jobId));
      showNotification('Job deleted successfully', 'success');
    } catch (error) {
      console.error('Delete error:', error);
      showNotification('Failed to delete job', 'error');
    }
  };

  const refreshJobs = async () => {
    try {
      const jobsData = await apiCall('/jobs');
      setJobs(jobsData);
    } catch (error) {
      console.error('Error refreshing jobs:', error);
      showNotification('Failed to refresh jobs', 'error');
    }
  };

  // Auto-refresh jobs
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refreshJobs, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatProcessingTime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
  };

  if (!conversionType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Upload className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to File Converter Pro
            </h1>
            <p className="text-gray-600 text-lg">
              Select a conversion type from the navigation above to get started
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                {conversionDetails.icon}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">
                  {conversionDetails.title}
                </h1>
                <p className="text-blue-100 mt-1">
                  {conversionDetails.description}
                </p>
              </div>
              <div className="bg-white/20 px-3 py-1 rounded-full">
                <span className="text-white text-sm font-medium">
                  {conversionDetails.category}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 0, label: 'Convert Files', icon: <Upload className="w-4 h-4" /> },
                { id: 1, label: 'Job History', icon: <History className="w-4 h-4" />, badge: jobs.length },
                ...(conversionDetails.hasAdvancedOptions ? [{ id: 2, label: 'Advanced Options', icon: <Settings className="w-4 h-4" /> }] : [])
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    currentTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge && tab.badge > 0 && (
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Convert Files Tab */}
            {currentTab === 0 && (
              <div className="space-y-6">
                {/* Batch Mode Toggle */}
                {conversionDetails.supportsBatch && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">Batch Processing</h3>
                      <p className="text-sm text-gray-600">Process multiple files at once</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={batchMode}
                        onChange={(e) => setBatchMode(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                )}

                {/* File Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept={conversionDetails.accept}
                    multiple={batchMode}
                    onChange={(e) => setFiles(e.target.files)}
                    className="hidden"
                  />
                  
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {dragActive ? 'Drop files here' : 'Drag & drop files or click to select'}
                  </h3>
                  <p className="text-gray-600">
                    Supported formats: {conversionDetails.accept}
                  </p>
                </div>

                {/* Selected Files Preview */}
                {files && files.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Selected Files ({files.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from(files).map((file, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Options */}
                {conversionDetails.hasAdvancedOptions && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-4">Quick Options</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quality: {options.quality}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={options.quality}
                          onChange={(e) => setOptions(prev => ({ ...prev, quality: Number(e.target.value) }))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="grayscale"
                          checked={options.grayscale}
                          onChange={(e) => setOptions(prev => ({ ...prev, grayscale: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="grayscale" className="ml-2 text-sm font-medium text-gray-700">
                          Convert to Grayscale
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Convert Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleUpload}
                    disabled={!files || files.length === 0 || loading}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Converting...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Start Conversion
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Job History Tab */}
            {currentTab === 1 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Conversion History</h3>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        className="w-4 h-4 text-blue-600"
                      />
                      Auto-refresh
                    </label>
                    <button
                      onClick={refreshJobs}
                      className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {jobs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <History className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No conversion history</h3>
                    <p className="text-gray-600">Your completed conversions will appear here</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {jobs.map((job) => (
                      <div key={job.job_id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(job.status)}
                            <div>
                              <p className="font-medium text-gray-900 truncate">
                                {job.input_filename || 'Unknown file'}
                              </p>
                              <p className="text-sm text-gray-600 capitalize">
                                {job.status}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteJob(job.job_id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {job.status === 'processing' && (
                          <div className="mb-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mb-3">
                          {job.processing_time && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                              <Timer className="w-3 h-3" />
                              {formatProcessingTime(job.processing_time)}
                            </span>
                          )}
                          {job.file_size && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                              <HardDrive className="w-3 h-3" />
                              {formatFileSize(job.file_size)}
                            </span>
                          )}
                        </div>

                        {job.status === 'completed' && job.download_url && (
                          <a
                            href={job.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Advanced Options Tab */}
            {currentTab === 2 && conversionDetails.hasAdvancedOptions && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Advanced Processing Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-4">Image Quality</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quality: {options.quality}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={options.quality}
                          onChange={(e) => setOptions(prev => ({ ...prev, quality: Number(e.target.value) }))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Brightness: {options.brightness}
                        </label>
                        <input
                          type="range"
                          min="0.1"
                          max="3"
                          step="0.1"
                          value={options.brightness}
                          onChange={(e) => setOptions(prev => ({ ...prev, brightness: Number(e.target.value) }))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-4">Effects</h4>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={options.grayscale}
                          onChange={(e) => setOptions(prev => ({ ...prev, grayscale: e.target.checked }))}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Convert to Grayscale</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={options.sharpen}
                          onChange={(e) => setOptions(prev => ({ ...prev, sharpen: e.target.checked }))}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Apply Sharpening</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg transform transition-all duration-300 ${
          notification.type === 'success' ? 'bg-green-50 border border-green-200' :
          notification.type === 'error' ? 'bg-red-50 border border-red-200' :
          notification.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
              {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
              {notification.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
              {notification.type === 'info' && <AlertCircle className="w-5 h-5 text-blue-600" />}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                notification.type === 'success' ? 'text-green-900' :
                notification.type === 'error' ? 'text-red-900' :
                notification.type === 'warning' ? 'text-yellow-900' :
                'text-blue-900'
              }`}>
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => setNotification(prev => ({ ...prev, show: false }))}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}