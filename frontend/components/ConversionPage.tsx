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
  Paper,
  Fade,
} from '@mui/material';
import UploadForm from '@/components/UploadForm';

export default function ConversionPage() {
  const [conversionType, setConversionType] = useState('');

  const handleConversionTypeChange = (
    event: React.ChangeEvent<{ value: unknown }>
  ) => {
    setConversionType(event.target.value as string);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
        py: 6,
      }}
    >
      <Container maxWidth="md">
        {/* Header Section */}
        <Box textAlign="center" sx={{ mb: 6 }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              color: '#ffffff',
              textShadow: '1px 1px 4px rgba(0,0,0,0.6)',
            }}
          >
            🚀 File Conversion Platform
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ mt: 2, color: '#cfd8dc', maxWidth: 600, mx: 'auto' }}
          >
            Effortlessly transform your files with lightning speed. Choose a conversion type to get started.
          </Typography>
        </Box>

        {/* Conversion Selector */}
        <Paper
          elevation={6}
          sx={{
            p: 4,
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}
        >
          <FormControl fullWidth>
            <InputLabel id="conversion-type-select-label" sx={{ color: '#ffffffb0' }}>
              Conversion Type
            </InputLabel>
            <Select
              labelId="conversion-type-select-label"
              id="conversion-type-select"
              value={conversionType}
              label="Conversion Type"
              onChange={handleConversionTypeChange}
              sx={{
                color: '#fff',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: '#ffffff33',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#ffffffaa',
                },
                '& .MuiSvgIcon-root': {
                  color: '#fff',
                },
                backgroundColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <MenuItem value="">
                <em>🔽 Select a type...</em>
              </MenuItem>
              <MenuItem value="pdf-to-docx">📄 PDF to DOCX</MenuItem>
              <MenuItem value="docx-to-pdf">📝 DOCX to PDF</MenuItem>
              <MenuItem value="mp4-to-mp3">🎵 MP4 to MP3</MenuItem>
              <MenuItem value="png-to-jpg">🖼️ PNG to JPG</MenuItem>
              <MenuItem value="wav-to-mp3">🎧 WAV to MP3</MenuItem>
              <MenuItem value="csv-to-json">📊 CSV to JSON</MenuItem>
              <MenuItem value="jpg-to-png">🌅 JPG to PNG</MenuItem>
              <MenuItem value="json-to-csv">🗄️ JSON to CSV</MenuItem>
              <MenuItem value="mp3-to-wav">🔊 MP3 to WAV</MenuItem>
              <MenuItem value="image-resize">📏 Image Resize</MenuItem>
              <MenuItem value="image-compress">📦 Image Compress</MenuItem>
              <MenuItem value="file-compress">🗜️ File Compress (ZIP)</MenuItem>
            </Select>
          </FormControl>
        </Paper>

        {/* Upload Section */}
        <Box sx={{ mt: 6 }}>
          {conversionType ? (
            <Fade in timeout={500}>
              <Box>
                <UploadForm conversionType={conversionType} />
              </Box>
            </Fade>
          ) : (
            <Fade in timeout={500}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  mt: 4,
                  textAlign: 'center',
                  color: '#ffffffcc',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 3,
                  border: '1px dashed #ffffff44',
                }}
              >
                <Typography variant="h6" gutterBottom>
                  💡 Select a conversion type above
                </Typography>
                <Typography variant="body2">
                  The upload form will appear here once you've selected a type.
                </Typography>
              </Paper>
            </Fade>
          )}
        </Box>
      </Container>
    </Box>
  );
}
