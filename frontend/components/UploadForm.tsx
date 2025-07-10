'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  TextField,
  Slider,
  Checkbox,
  FormControlLabel,
  Paper,
  Chip,
  Alert,
  AlertTitle,
  LinearProgress,
  Collapse,
  IconButton,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Switch,
  Divider,
  Stack,
  Badge,
  Tab,
  Tabs,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Preview as PreviewIcon,
  History as HistoryIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  Timer as TimerIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Psychology as AIIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import Notification from './Notification';

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
  // Image options
  width?: number;
  height?: number;
  quality?: number;
  brightness?: number;
  contrast?: number;
  blur?: number;
  sharpen?: boolean;
  grayscale?: boolean;
  // Video/Audio options
  start_time?: number;
  end_time?: number;
  bitrate?: string;
  sample_rate?: number;
  channels?: number;
  normalize?: boolean;
  fps?: number;
  resolution?: string;
}

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: theme.spacing(2),
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backdropFilter: 'blur(10px)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  },
}));

const DropZone = styled(Box)(({ theme, isDragActive }: { theme: any; isDragActive: boolean }) => ({
  border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: theme.spacing(2),
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  backgroundColor: isDragActive ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.02),
  },
}));

const AnimatedButton = styled(Button)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.common.white, 0.2)}, transparent)`,
    transition: 'left 0.5s',
  },
  '&:hover::before': {
    left: '100%',
  },
}));

const FilePreviewCard = styled(Card)(({ theme }) => ({
  margin: theme.spacing(1),
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[8],
  },
}));

export default function EnhancedUploadForm({ conversionType }: UploadFormProps) {
  const theme = useTheme();
  
  // File and conversion state
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [openNotification, setOpenNotification] = useState(false);
  const [notificationSeverity, setNotificationSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('info');
  
  // UI state
  const [dragActive, setDragActive] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showJobHistory, setShowJobHistory] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ConversionJob | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Processing options
  const [options, setOptions] = useState<ProcessingOptions>({
    quality: 85,
    brightness: 1,
    contrast: 1,
    blur: 0,
    sharpen: false,
    grayscale: false,
  });

  // Conversion details
  const conversionDetails = useMemo(() => {
    const details: {
      endpoint: string;
      accept: string;
      title: string;
      description: string;
      icon: React.ReactNode;
      category: string;
      supportsBatch: boolean;
      hasAdvancedOptions: boolean;
    } = {
      endpoint: '',
      accept: '',
      title: '',
      description: '',
      icon: <CloudUploadIcon />,
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
        details.category = 'Document';
        details.supportsBatch = true;
        break;
      case 'docx-to-pdf':
        details.endpoint = '/convert/docx-to-pdf';
        details.accept = '.docx';
        details.title = 'DOCX to PDF';
        details.description = 'Convert Word documents to PDF format';
        details.category = 'Document';
        details.supportsBatch = true;
        break;
      case 'image-process':
        details.endpoint = '/image/process';
        details.accept = 'image/*';
        details.title = 'Advanced Image Processing';
        details.description = 'Resize, enhance, and optimize images with AI-powered tools';
        details.category = 'Image';
        details.supportsBatch = true;
        details.hasAdvancedOptions = true;
        details.icon = <AIIcon />;
        break;
      case 'video-to-audio':
        details.endpoint = '/convert/video-to-audio';
        details.accept = 'video/*';
        details.title = 'Video to Audio';
        details.description = 'Extract high-quality audio from video files';
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

  // Job management
  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await axios.get(`/job/${jobId}`);
      const job = response.data;
      
      setJobs(prev => prev.map(j => j.job_id === jobId ? job : j));
      
      if (job.status === 'completed' || job.status === 'failed') {
        return job;
      }
      
      // Continue polling if still processing
      setTimeout(() => pollJobStatus(jobId), 2000);
    } catch (error) {
      console.error('Error polling job status:', error);
    }
  }, []);

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      setMessage("Please select files to convert.");
      setNotificationSeverity('warning');
      setOpenNotification(true);
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
        
        const response = await axios.post('/convert/batch', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        const newJobs = response.data;
        setJobs(prev => [...prev, ...newJobs]);
        
        // Start polling for each job
        newJobs.forEach((job: ConversionJob) => {
          pollJobStatus(job.job_id);
        });
        
        setMessage(`Started ${newJobs.length} conversion jobs`);
        setNotificationSeverity('success');
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
        
        const response = await axios.post(conversionDetails.endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        const newJob = response.data;
        setJobs(prev => [...prev, newJob]);
        pollJobStatus(newJob.job_id);
        
        setMessage('Conversion started successfully');
        setNotificationSeverity('success');
      }
      
      setOpenNotification(true);
    } catch (error: any) {
      console.error('Upload error:', error);
      setMessage(`Upload failed: ${error.response?.data?.detail || error.message}`);
      setNotificationSeverity('error');
      setOpenNotification(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await axios.delete(`/job/${jobId}`);
      setJobs(prev => prev.filter(j => j.job_id !== jobId));
      setMessage('Job deleted successfully');
      setNotificationSeverity('success');
      setOpenNotification(true);
    } catch (error) {
      console.error('Delete error:', error);
      setMessage('Failed to delete job');
      setNotificationSeverity('error');
      setOpenNotification(true);
    }
  };

  const refreshJobs = async () => {
    try {
      const response = await axios.get('/jobs');
      setJobs(response.data);
    } catch (error) {
      console.error('Error refreshing jobs:', error);
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
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'processing':
        return <CircularProgress size={20} />;
      default:
        return <PendingIcon color="warning" />;
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
      <StyledPaper>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CloudUploadIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Welcome to File Converter Pro
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Select a conversion type from the navigation above to get started
          </Typography>
        </Box>
      </StyledPaper>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', p: 2 }}>
      <StyledPaper>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            {conversionDetails.icon}
            <Typography variant="h4" component="h1">
              {conversionDetails.title}
            </Typography>
            <Chip 
              label={conversionDetails.category} 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
          </Box>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {conversionDetails.description}
          </Typography>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
            <Tab label="Convert Files" icon={<CloudUploadIcon />} />
            <Tab 
              label={
                <Badge badgeContent={jobs.length} color="primary">
                  Job History
                </Badge>
              } 
              icon={<HistoryIcon />} 
            />
            {conversionDetails.hasAdvancedOptions && (
              <Tab label="Advanced Options" icon={<SettingsIcon />} />
            )}
          </Tabs>
        </Box>

        {/* Tab Content */}
        {currentTab === 0 && (
          <Box>
            {/* Batch Mode Toggle */}
            {conversionDetails.supportsBatch && (
              <Box sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={batchMode}
                      onChange={(e) => setBatchMode(e.target.checked)}
                    />
                  }
                  label="Batch Mode (Process multiple files)"
                />
              </Box>
            )}

            {/* File Upload Area */}
            <DropZone
              isDragActive={dragActive}
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
                style={{ display: 'none' }}
              />
              
              <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {dragActive ? 'Drop files here' : 'Drag & drop files or click to select'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supported formats: {conversionDetails.accept}
              </Typography>
            </DropZone>

            {/* Selected Files Preview */}
            {files && files.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Selected Files ({files.length})
                </Typography>
                <Grid container spacing={2}>
                  {Array.from(files).map((file, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <FilePreviewCard>
                        <CardContent>
                          <Typography variant="subtitle2" noWrap>
                            {file.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatFileSize(file.size)}
                          </Typography>
                        </CardContent>
                      </FilePreviewCard>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Quick Options */}
            {conversionDetails.hasAdvancedOptions && (
              <Accordion sx={{ mt: 3 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Quick Options</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Quality"
                        type="number"
                        value={options.quality}
                        onChange={(e) => setOptions(prev => ({ ...prev, quality: Number(e.target.value) }))}
                        inputProps={{ min: 0, max: 100 }}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={options.grayscale}
                            onChange={(e) => setOptions(prev => ({ ...prev, grayscale: e.target.checked }))}
                          />
                        }
                        label="Convert to Grayscale"
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Convert Button */}
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <AnimatedButton
                variant="contained"
                size="large"
                onClick={handleUpload}
                disabled={!files || files.length === 0 || loading}
                startIcon={loading ? <CircularProgress size={20} /> : <PlayIcon />}
                sx={{ minWidth: 200, py: 1.5 }}
              >
                {loading ? 'Converting...' : 'Start Conversion'}
              </AnimatedButton>
            </Box>
          </Box>
        )}

        {/* Job History Tab */}
        {currentTab === 1 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Conversion History</Typography>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                    />
                  }
                  label="Auto-refresh"
                />
                <IconButton onClick={refreshJobs}>
                  <RefreshIcon />
                </IconButton>
              </Box>
            </Box>

            {jobs.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <HistoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No conversion history
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your completed conversions will appear here
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {jobs.map((job) => (
                  <Grid item xs={12} md={6} key={job.job_id}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          {getStatusIcon(job.status)}
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" noWrap>
                              {job.input_filename || 'Unknown file'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                            </Typography>
                          </Box>
                        </Box>

                        {job.status === 'processing' && (
                          <LinearProgress sx={{ mb: 2 }} />
                        )}

                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                          {job.processing_time && (
                            <Chip
                              icon={<TimerIcon />}
                              label={formatProcessingTime(job.processing_time)}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          {job.file_size && (
                            <Chip
                              icon={<StorageIcon />}
                              label={formatFileSize(job.file_size)}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </CardContent>
                      <CardActions>
                        {job.status === 'completed' && job.download_url && (
                          <Button
                            size="small"
                            startIcon={<DownloadIcon />}
                            href={job.download_url}
                            target="_blank"
                            color="success"
                          >
                            Download
                          </Button>
                        )}
                        <Button
                          size="small"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteJob(job.job_id)}
                          color="error"
                        >
                          Delete
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {/* Advanced Options Tab */}
        {currentTab === 2 && conversionDetails.hasAdvancedOptions && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Advanced Processing Options
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Image Quality
                  </Typography>
                  <Slider
                    value={options.quality || 85}
                    onChange={(_, value) => setOptions(prev => ({ ...prev, quality: value as number }))}
                    min={0}
                    max={100}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 0, label: 'Low' },
                      { value: 50, label: 'Medium' },
                      { value: 100, label: 'High' },
                    ]}
                  />
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Brightness
                  </Typography>
                  <Slider
                    value={options.brightness || 1}
                    onChange={(_, value) => setOptions(prev => ({ ...prev, brightness: value as number }))}
                    min={0.1}
                    max={3}
                    step={0.1}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 0.1, label: 'Dark' },
                      { value: 1, label: 'Normal' },
                      { value: 3, label: 'Bright' },
                    ]}
                  />
                </Paper>
              </Grid>
              {/* Add more advanced options as needed */}
            </Grid>
          </Box>
        )}
      </StyledPaper>

      {/* Notification */}
      <Notification
        open={openNotification}
        message={message || ''}
        severity={notificationSeverity}
        onClose={() => setOpenNotification(false)}
      />
    </Box>
  );
}