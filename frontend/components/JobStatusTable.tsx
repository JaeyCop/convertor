import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Box,
  Button,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import Notification from './Notification';
import axios from 'axios';

interface Job {
  job_id: string;
  status: string;
  input_filename: string;
  output_filename?: string;
  conversion_type: string;
  processing_time?: number;
  file_size?: number;
  download_url?: string;
}

export default function JobStatusTable() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openNotification, setOpenNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationSeverity, setNotificationSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('info');

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    setOpenNotification(false);
    try {
      const response = await axios.get<Job[]>('http://localhost:8000/jobs');
      setJobs(response.data);
      setNotificationMessage("Jobs refreshed successfully!");
      setNotificationSeverity('success');
      setOpenNotification(true);
    } catch (err: any) {
      const msg = `Failed to fetch jobs: ${err.response?.data?.detail || err.message}`;
      setError(msg);
      setNotificationMessage(msg);
      setNotificationSeverity('error');
      setOpenNotification(true);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setOpenNotification(false);
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading Jobs...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6" color="error">{error}</Typography>
        <Button onClick={fetchJobs} startIcon={<RefreshIcon />} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ mt: 4 }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">My Conversion Jobs</Typography>
        <Button onClick={fetchJobs} startIcon={<RefreshIcon />}>
          Refresh
        </Button>
      </Box>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>Job ID</TableCell>
            <TableCell>Input File</TableCell>
            <TableCell>Conversion Type</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Output File</TableCell>
            <TableCell align="right">Processing Time (s)</TableCell>
            <TableCell align="right">File Size (bytes)</TableCell>
            <TableCell align="center">Download</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs.map((job) => (
            <TableRow
              key={job.job_id}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell component="th" scope="row">
                {job.job_id}
              </TableCell>
              <TableCell>{job.input_filename}</TableCell>
              <TableCell>{job.conversion_type}</TableCell>
              <TableCell>{job.status}</TableCell>
              <TableCell>{job.output_filename || 'N/A'}</TableCell>
              <TableCell align="right">{job.processing_time?.toFixed(2) || 'N/A'}</TableCell>
              <TableCell align="right">{job.file_size || 'N/A'}</TableCell>
              <TableCell align="center">
                {job.status === 'completed' && job.download_url ? (
                  <Button
                    variant="contained"
                    color="primary"
                    href={`http://localhost:8000${job.download_url}`}
                    target="_blank"
                    startIcon={<DownloadIcon />}
                    size="small"
                  >
                    Download
                  </Button>
                ) : (
                  'N/A'
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Notification
        open={openNotification}
        message={notificationMessage}
        severity={notificationSeverity}
        onClose={handleCloseNotification}
      />
    </TableContainer>
  );
}
