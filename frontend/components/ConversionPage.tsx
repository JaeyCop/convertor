"use client";

import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import UploadForm from '@/components/UploadForm'; // We will refactor this later

export default function ConversionPage() {
  const [conversionType, setConversionType] = useState('');

  const handleConversionTypeChange = (event: { target: { value: string } }) => {
    setConversionType(event.target.value);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          File Conversion Platform
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          Select a conversion type to get started.
        </Typography>
      </Box>

      <Box sx={{ my: 4 }}>
        <FormControl fullWidth>
          <InputLabel id="conversion-type-select-label">Conversion Type</InputLabel>
          <Select
            labelId="conversion-type-select-label"
            id="conversion-type-select"
            value={conversionType}
            label="Conversion Type"
            onChange={handleConversionTypeChange}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            <MenuItem value="pdf-to-docx">PDF to DOCX</MenuItem>
            <MenuItem value="docx-to-pdf">DOCX to PDF</MenuItem>
            <MenuItem value="mp4-to-mp3">MP4 to MP3</MenuItem>
            <MenuItem value="png-to-jpg">PNG to JPG</MenuItem>
            <MenuItem value="wav-to-mp3">WAV to MP3</MenuItem>
            <MenuItem value="csv-to-json">CSV to JSON</MenuItem>
            <MenuItem value="jpg-to-png">JPG to PNG</MenuItem>
            <MenuItem value="json-to-csv">JSON to CSV</MenuItem>
            <MenuItem value="mp3-to-wav">MP3 to WAV</MenuItem>
            <MenuItem value="image-resize">Image Resize</MenuItem>
            <MenuItem value="image-compress">Image Compress</MenuItem>
            <MenuItem value="file-compress">File Compress (ZIP)</MenuItem>
            {/* Add other conversion types here */}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ my: 4 }}>
        {conversionType === 'pdf-to-docx' && <UploadForm conversionType="pdf-to-docx" />}
        {conversionType === 'docx-to-pdf' && <UploadForm conversionType="docx-to-pdf" />}
        {conversionType === 'mp4-to-mp3' && <UploadForm conversionType="mp4-to-mp3" />}
        {conversionType === 'png-to-jpg' && <UploadForm conversionType="png-to-jpg" />}
        {conversionType === 'wav-to-mp3' && <UploadForm conversionType="wav-to-mp3" />}
        {conversionType === 'csv-to-json' && <UploadForm conversionType="csv-to-json" />}
        {conversionType === 'jpg-to-png' && <UploadForm conversionType="jpg-to-png" />}
        {conversionType === 'json-to-csv' && <UploadForm conversionType="json-to-csv" />}
        {conversionType === 'mp3-to-wav' && <UploadForm conversionType="mp3-to-wav" />}
        {conversionType === 'image-resize' && <UploadForm conversionType="image-resize" />}
        {conversionType === 'image-compress' && <UploadForm conversionType="image-compress" />}
        {conversionType === 'file-compress' && <UploadForm conversionType="file-compress" />}
        {/* Render other forms based on conversionType */}
      </Box>
    </Container>
  );
}
